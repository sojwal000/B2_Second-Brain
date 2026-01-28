"""
RAG (Retrieval Augmented Generation) Service
Handles semantic search, context retrieval, and answer generation
"""

import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import time

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_mongo_db, Collections
from app.models.database import Content, ContentChunk
from app.services.embedding_service import EmbeddingService, RerankerService
from app.services.ai_service import AIService
from app.schemas.schemas import SourceReference

logger = logging.getLogger(__name__)


@dataclass
class RAGResult:
    """Result from RAG query."""
    answer: str
    sources: List[SourceReference]
    confidence: float
    processing_time: float
    model_used: str
    follow_up_questions: List[str] = None


class RAGService:
    """Service for RAG-based question answering."""
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.embedding_service = EmbeddingService()
        self.reranker = RerankerService()
        self.ai_service = AIService()
    
    async def query(
        self,
        question: str,
        search_type: str = "hybrid",
        filters: Dict[str, Any] = None,
        max_sources: int = 5,
        context_style: str = "self",
        include_followup: bool = True
    ) -> RAGResult:
        """
        Execute RAG query: retrieve relevant chunks, build context, generate answer.
        """
        start_time = time.time()
        
        try:
            # Step 1: Retrieve relevant chunks
            chunks = await self._retrieve_chunks(
                question=question,
                search_type=search_type,
                filters=filters,
                limit=max_sources * 2  # Retrieve more for reranking
            )
            
            if not chunks:
                return RAGResult(
                    answer="I couldn't find any relevant information in your knowledge base to answer this question.",
                    sources=[],
                    confidence=0.0,
                    processing_time=time.time() - start_time,
                    model_used=self.ai_service.model,
                    follow_up_questions=[]
                )
            
            # Step 2: Rerank chunks
            if len(chunks) > max_sources:
                chunks = await self._rerank_chunks(question, chunks, top_k=max_sources)
            
            # Step 3: Build context
            context, sources = await self._build_context(chunks)
            
            # Step 4: Generate answer
            result = await self.ai_service.answer_question(
                question=question,
                context=context,
                context_style=context_style
            )
            
            # Step 5: Generate follow-up questions
            follow_ups = []
            if include_followup:
                follow_ups = await self.ai_service.generate_follow_up_questions(
                    question=question,
                    answer=result["answer"],
                    context=context
                )
            
            # Calculate confidence based on similarity scores
            avg_score = sum(c.get("score", 0) for c in chunks) / len(chunks) if chunks else 0
            confidence = min(avg_score, 1.0)
            
            processing_time = time.time() - start_time
            
            return RAGResult(
                answer=result["answer"],
                sources=sources,
                confidence=confidence,
                processing_time=processing_time,
                model_used=result["model"],
                follow_up_questions=follow_ups
            )
            
        except Exception as e:
            logger.error(f"RAG query failed: {e}", exc_info=True)
            raise
    
    async def _retrieve_chunks(
        self,
        question: str,
        search_type: str,
        filters: Dict[str, Any] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks using specified search method."""
        
        if search_type == "semantic" or search_type == "hybrid":
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(question)
            
            # Search in MongoDB (vector search)
            chunks = await self._vector_search(
                query_embedding=query_embedding,
                filters=filters,
                limit=limit
            )
        else:
            chunks = []
        
        if search_type == "keyword" or search_type == "hybrid":
            # Full-text search in PostgreSQL
            keyword_chunks = await self._keyword_search(
                query=question,
                filters=filters,
                limit=limit
            )
            
            if search_type == "hybrid":
                # Merge results
                chunks = self._merge_search_results(chunks, keyword_chunks)
            else:
                chunks = keyword_chunks
        
        return chunks[:limit]
    
    async def _vector_search(
        self,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search using vector similarity in MongoDB."""
        mongo_db = await get_mongo_db()
        embeddings_collection = mongo_db[Collections.EMBEDDINGS]
        
        # Build filter query
        match_query = {"user_id": self.user_id}
        if filters:
            if "content_types" in filters:
                match_query["content_type"] = {"$in": filters["content_types"]}
            if "tags" in filters:
                match_query["tags"] = {"$in": filters["tags"]}
            if "subject" in filters:
                match_query["subject"] = filters["subject"]
        
        try:
            # Check if vector search index exists
            # For now, use a simpler approach without Atlas Search
            cursor = embeddings_collection.find(match_query).limit(100)
            
            docs = []
            async for doc in cursor:
                if doc.get("embedding"):
                    score = self.embedding_service.cosine_similarity(
                        query_embedding,
                        doc["embedding"]
                    )
                    docs.append({
                        "content_id": doc["content_id"],
                        "chunk_index": doc["chunk_index"],
                        "text": doc.get("text", ""),
                        "score": score,
                        "source": "vector"
                    })
            
            # Sort by score and limit
            docs.sort(key=lambda x: x["score"], reverse=True)
            return docs[:limit]
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def _keyword_search(
        self,
        query: str,
        filters: Dict[str, Any] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Full-text search in PostgreSQL."""
        from sqlalchemy import or_, and_, func
        
        # Build base query
        base_query = select(ContentChunk).join(Content).where(
            Content.user_id == self.user_id
        )
        
        # Apply filters
        if filters:
            if "content_types" in filters:
                base_query = base_query.where(
                    Content.content_type.in_(filters["content_types"])
                )
            if "tags" in filters:
                for tag in filters["tags"]:
                    base_query = base_query.where(Content.tags.contains([tag]))
            if "subject" in filters:
                base_query = base_query.where(Content.subject == filters["subject"])
        
        # Simple keyword matching (could be enhanced with PostgreSQL full-text search)
        search_terms = query.lower().split()
        conditions = []
        for term in search_terms[:5]:  # Limit terms
            conditions.append(ContentChunk.chunk_text.ilike(f"%{term}%"))
        
        if conditions:
            base_query = base_query.where(or_(*conditions))
        
        base_query = base_query.limit(limit)
        
        result = await self.db.execute(base_query)
        chunks = result.scalars().all()
        
        return [
            {
                "content_id": c.content_id,
                "chunk_index": c.chunk_index,
                "text": c.chunk_text,
                "score": 0.5,  # Base score for keyword matches
                "source": "keyword"
            }
            for c in chunks
        ]
    
    def _merge_search_results(
        self,
        vector_results: List[Dict],
        keyword_results: List[Dict]
    ) -> List[Dict]:
        """Merge vector and keyword search results with RRF."""
        # Reciprocal Rank Fusion
        k = 60  # RRF constant
        
        scores = {}
        
        for rank, doc in enumerate(vector_results):
            key = (doc["content_id"], doc["chunk_index"])
            scores[key] = scores.get(key, {"doc": doc, "score": 0})
            scores[key]["score"] += 1 / (k + rank + 1)
            scores[key]["doc"]["score"] = max(
                scores[key]["doc"].get("score", 0),
                doc.get("score", 0)
            )
        
        for rank, doc in enumerate(keyword_results):
            key = (doc["content_id"], doc["chunk_index"])
            scores[key] = scores.get(key, {"doc": doc, "score": 0})
            scores[key]["score"] += 1 / (k + rank + 1)
        
        # Sort by RRF score
        merged = sorted(
            scores.values(),
            key=lambda x: x["score"],
            reverse=True
        )
        
        return [item["doc"] for item in merged]
    
    async def _rerank_chunks(
        self,
        query: str,
        chunks: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        """Rerank chunks using cross-encoder."""
        texts = [c["text"] for c in chunks]
        
        ranked = await self.reranker.rerank(query, texts, top_k=top_k)
        
        return [chunks[idx] for idx, _ in ranked]
    
    async def _build_context(
        self,
        chunks: List[Dict]
    ) -> tuple[str, List[SourceReference]]:
        """Build context string and source references from chunks."""
        sources = []
        context_parts = []
        
        # Get content details for each unique content_id
        content_ids = list(set(c["content_id"] for c in chunks))
        result = await self.db.execute(
            select(Content).where(Content.id.in_(content_ids))
        )
        contents = {c.id: c for c in result.scalars().all()}
        
        for i, chunk in enumerate(chunks):
            content = contents.get(chunk["content_id"])
            if not content:
                continue
            
            context_parts.append(f"[Source {i+1}: {content.title}]\n{chunk['text']}")
            
            sources.append(SourceReference(
                content_id=content.id,
                title=content.title,
                chunk_index=chunk["chunk_index"],
                text_preview=chunk["text"][:200],
                relevance_score=chunk.get("score", 0)
            ))
        
        context = "\n\n---\n\n".join(context_parts)
        
        return context, sources
    
    async def generate_suggestions(self, limit: int = 5) -> List[str]:
        """Generate suggested questions based on user's knowledge base."""
        # Get some content summaries
        result = await self.db.execute(
            select(Content.title, Content.summary)
            .where(Content.user_id == self.user_id)
            .order_by(Content.created_at.desc())
            .limit(10)
        )
        contents = result.all()
        
        if not contents:
            return []
        
        # Build context
        context = "\n".join([
            f"- {title}: {summary[:100] if summary else 'No summary'}"
            for title, summary in contents
        ])
        
        prompt = f"""Based on these items in the user's knowledge base:
{context}

Suggest {limit} interesting questions the user might want to ask about their content.
Make the questions specific and engaging.
Return one question per line."""
        
        try:
            response = await self.ai_service.generate(
                prompt=prompt,
                max_tokens=256,
                temperature=0.7
            )
            
            questions = [q.strip().lstrip("- ").lstrip("1234567890.") for q in response.strip().split("\n") if q.strip()]
            return questions[:limit]
            
        except Exception as e:
            logger.error(f"Suggestion generation failed: {e}")
            return []
