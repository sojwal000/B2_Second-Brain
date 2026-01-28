"""
Search Service
Handles semantic and hybrid search across user content
"""

import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import time

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_mongo_db, Collections
from app.models.database import Content, ContentChunk
from app.services.embedding_service import EmbeddingService, RerankerService
from app.schemas.schemas import SearchHit

logger = logging.getLogger(__name__)


@dataclass
class SearchResults:
    """Search results container."""
    hits: List[SearchHit]
    total: int
    processing_time: float


class SearchService:
    """Service for searching user content."""
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.embedding_service = EmbeddingService()
        self.reranker = RerankerService()
    
    async def search(
        self,
        query: str,
        search_type: str = "hybrid",
        content_types: List[str] = None,
        tags: List[str] = None,
        subject: str = None,
        min_score: float = 0.0,
        limit: int = 20,
        rerank: bool = True
    ) -> SearchResults:
        """
        Search content using semantic, keyword, or hybrid search.
        """
        start_time = time.time()
        
        filters = {}
        if content_types:
            filters["content_types"] = content_types
        if tags:
            filters["tags"] = tags
        if subject:
            filters["subject"] = subject
        
        # Perform search based on type
        if search_type == "semantic":
            hits = await self._semantic_search(query, filters, limit * 2)
        elif search_type == "keyword":
            hits = await self._keyword_search(query, filters, limit * 2)
        else:  # hybrid
            hits = await self._hybrid_search(query, filters, limit * 2)
        
        # Apply minimum score filter
        hits = [h for h in hits if h.get("score", 0) >= min_score]
        
        # Rerank if enabled
        if rerank and len(hits) > 1:
            hits = await self._rerank_results(query, hits, limit)
        else:
            hits = hits[:limit]
        
        # Convert to SearchHit objects
        search_hits = [
            SearchHit(
                content_id=h["content_id"],
                title=h["title"],
                text_preview=h["text"][:300],
                score=h.get("score", 0),
                content_type=h.get("content_type", "text"),
                highlights=h.get("highlights", [])
            )
            for h in hits
        ]
        
        processing_time = time.time() - start_time
        
        return SearchResults(
            hits=search_hits,
            total=len(search_hits),
            processing_time=processing_time
        )
    
    async def _semantic_search(
        self,
        query: str,
        filters: Dict,
        limit: int
    ) -> List[Dict]:
        """Perform semantic search using embeddings."""
        # Generate query embedding
        query_embedding = await self.embedding_service.generate_embedding(query)
        
        # Search in MongoDB
        mongo_db = await get_mongo_db()
        embeddings_collection = mongo_db[Collections.EMBEDDINGS]
        
        match_query = {"user_id": self.user_id}
        
        try:
            cursor = embeddings_collection.find(match_query).limit(200)
            
            results = []
            async for doc in cursor:
                if doc.get("embedding"):
                    score = self.embedding_service.cosine_similarity(
                        query_embedding,
                        doc["embedding"]
                    )
                    results.append({
                        "content_id": doc["content_id"],
                        "chunk_index": doc.get("chunk_index", 0),
                        "text": doc.get("text", ""),
                        "score": score
                    })
            
            # Sort and limit
            results.sort(key=lambda x: x["score"], reverse=True)
            results = results[:limit]
            
            # Enrich with content details
            return await self._enrich_results(results, filters)
            
        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            return []
    
    async def _keyword_search(
        self,
        query: str,
        filters: Dict,
        limit: int
    ) -> List[Dict]:
        """Perform keyword-based search."""
        base_query = select(Content).where(
            Content.user_id == self.user_id,
            Content.is_archived == False
        )
        
        # Apply filters
        if filters.get("content_types"):
            base_query = base_query.where(
                Content.content_type.in_(filters["content_types"])
            )
        if filters.get("subject"):
            base_query = base_query.where(Content.subject == filters["subject"])
        if filters.get("tags"):
            for tag in filters["tags"]:
                base_query = base_query.where(Content.tags.contains([tag]))
        
        # Keyword matching
        search_terms = query.lower().split()
        conditions = []
        for term in search_terms[:10]:
            conditions.append(Content.title.ilike(f"%{term}%"))
            conditions.append(Content.text_content.ilike(f"%{term}%"))
            conditions.append(Content.summary.ilike(f"%{term}%"))
        
        if conditions:
            base_query = base_query.where(or_(*conditions))
        
        base_query = base_query.limit(limit)
        
        result = await self.db.execute(base_query)
        contents = result.scalars().all()
        
        # Calculate basic relevance score
        results = []
        for content in contents:
            score = self._calculate_keyword_score(query, content)
            results.append({
                "content_id": content.id,
                "title": content.title,
                "text": content.summary or content.text_content[:300] if content.text_content else "",
                "score": score,
                "content_type": content.content_type.value,
                "highlights": self._generate_highlights(query, content)
            })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results
    
    async def _hybrid_search(
        self,
        query: str,
        filters: Dict,
        limit: int
    ) -> List[Dict]:
        """Combine semantic and keyword search results."""
        # Run both searches
        semantic_results = await self._semantic_search(query, filters, limit)
        keyword_results = await self._keyword_search(query, filters, limit)
        
        # Merge using RRF
        return self._rrf_merge(semantic_results, keyword_results, k=60)
    
    def _rrf_merge(
        self,
        results1: List[Dict],
        results2: List[Dict],
        k: int = 60
    ) -> List[Dict]:
        """Merge results using Reciprocal Rank Fusion."""
        scores = {}
        
        for rank, doc in enumerate(results1):
            key = doc["content_id"]
            scores[key] = {"doc": doc, "rrf_score": 0}
            scores[key]["rrf_score"] += 1 / (k + rank + 1)
        
        for rank, doc in enumerate(results2):
            key = doc["content_id"]
            if key not in scores:
                scores[key] = {"doc": doc, "rrf_score": 0}
            scores[key]["rrf_score"] += 1 / (k + rank + 1)
            # Keep higher original score
            if scores[key]["doc"].get("score", 0) < doc.get("score", 0):
                scores[key]["doc"]["score"] = doc["score"]
        
        # Sort by RRF score
        merged = sorted(
            scores.values(),
            key=lambda x: x["rrf_score"],
            reverse=True
        )
        
        return [item["doc"] for item in merged]
    
    async def _rerank_results(
        self,
        query: str,
        results: List[Dict],
        top_k: int
    ) -> List[Dict]:
        """Rerank results using cross-encoder."""
        texts = [r.get("text", r.get("title", "")) for r in results]
        
        ranked = await self.reranker.rerank(query, texts, top_k=top_k)
        
        return [results[idx] for idx, _ in ranked]
    
    async def _enrich_results(
        self,
        results: List[Dict],
        filters: Dict
    ) -> List[Dict]:
        """Enrich chunk results with content details."""
        if not results:
            return []
        
        content_ids = list(set(r["content_id"] for r in results))
        
        query = select(Content).where(
            Content.id.in_(content_ids),
            Content.user_id == self.user_id
        )
        
        # Apply filters
        if filters.get("content_types"):
            query = query.where(Content.content_type.in_(filters["content_types"]))
        if filters.get("subject"):
            query = query.where(Content.subject == filters["subject"])
        if filters.get("tags"):
            for tag in filters["tags"]:
                query = query.where(Content.tags.contains([tag]))
        
        result = await self.db.execute(query)
        contents = {c.id: c for c in result.scalars().all()}
        
        enriched = []
        for r in results:
            content = contents.get(r["content_id"])
            if content:
                enriched.append({
                    **r,
                    "title": content.title,
                    "content_type": content.content_type.value,
                    "subject": content.subject,
                    "tags": content.tags
                })
        
        return enriched
    
    def _calculate_keyword_score(self, query: str, content: Content) -> float:
        """Calculate simple keyword relevance score."""
        query_terms = set(query.lower().split())
        
        title_terms = set(content.title.lower().split()) if content.title else set()
        text_terms = set(content.text_content.lower().split()[:500]) if content.text_content else set()
        
        title_matches = len(query_terms & title_terms)
        text_matches = len(query_terms & text_terms)
        
        # Weight title matches higher
        score = (title_matches * 0.3 + text_matches * 0.1) / max(len(query_terms), 1)
        
        return min(score, 1.0)
    
    def _generate_highlights(self, query: str, content: Content) -> List[str]:
        """Generate text highlights containing query terms."""
        highlights = []
        query_terms = query.lower().split()
        
        text = content.text_content or ""
        sentences = text.split(".")
        
        for sentence in sentences[:50]:  # Limit sentences checked
            sentence = sentence.strip()
            if any(term in sentence.lower() for term in query_terms):
                if len(sentence) > 20 and len(sentence) < 300:
                    highlights.append(sentence + ".")
        
        return highlights[:3]
    
    async def find_similar(
        self,
        content_id: int,
        limit: int = 5,
        min_score: float = 0.5
    ) -> List[Dict]:
        """Find content similar to a given content item."""
        # Get content embedding
        mongo_db = await get_mongo_db()
        embeddings_collection = mongo_db[Collections.EMBEDDINGS]
        
        # Get first chunk embedding for the content
        source_doc = await embeddings_collection.find_one({
            "content_id": content_id,
            "chunk_index": 0
        })
        
        if not source_doc or not source_doc.get("embedding"):
            return []
        
        source_embedding = source_doc["embedding"]
        
        # Find similar embeddings
        cursor = embeddings_collection.find({
            "user_id": self.user_id,
            "content_id": {"$ne": content_id}
        }).limit(100)
        
        results = []
        seen_content_ids = set()
        
        async for doc in cursor:
            cid = doc["content_id"]
            if cid in seen_content_ids:
                continue
            
            if doc.get("embedding"):
                score = self.embedding_service.cosine_similarity(
                    source_embedding,
                    doc["embedding"]
                )
                if score >= min_score:
                    results.append({
                        "id": cid,
                        "score": score
                    })
                    seen_content_ids.add(cid)
        
        # Sort and limit
        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:limit]
        
        # Get content titles
        if results:
            content_ids = [r["id"] for r in results]
            query_result = await self.db.execute(
                select(Content.id, Content.title)
                .where(Content.id.in_(content_ids))
            )
            titles = {row[0]: row[1] for row in query_result.all()}
            
            for r in results:
                r["title"] = titles.get(r["id"], "Unknown")
        
        return results
