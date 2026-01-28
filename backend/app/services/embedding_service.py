"""
Embedding Service
Generates and manages text embeddings for semantic search
"""

import logging
from typing import List, Optional
import asyncio
import numpy as np

from app.core.config import settings
from app.core.cache import embedding_cache

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER
        self.model_name = settings.EMBEDDING_MODEL
        self._model = None
        self._tokenizer = None
    
    async def _get_model(self):
        """Lazy load the embedding model."""
        if self._model is not None:
            return self._model
        
        if self.provider == "sentence-transformers":
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"Loaded SentenceTransformer model: {self.model_name}")
            except ImportError:
                logger.error("sentence-transformers not installed")
                raise
        
        elif self.provider == "openai":
            try:
                from openai import AsyncOpenAI
                self._model = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            except ImportError:
                logger.error("openai not installed")
                raise
        
        elif self.provider == "huggingface":
            try:
                from transformers import AutoTokenizer, AutoModel
                import torch
                
                self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self._model = AutoModel.from_pretrained(self.model_name)
                self._model.eval()
                
                if torch.cuda.is_available():
                    self._model = self._model.cuda()
                    
            except ImportError:
                logger.error("transformers not installed")
                raise
        
        return self._model
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            return [0.0] * settings.EMBEDDING_DIMENSION
        
        # Check cache
        cache_key = f"emb:{hash(text[:500])}"
        cached = embedding_cache.get(cache_key)
        if cached:
            return cached
        
        model = await self._get_model()
        
        try:
            if self.provider == "sentence-transformers":
                # Run in thread pool since it's CPU-bound
                embedding = await asyncio.to_thread(
                    model.encode,
                    text,
                    normalize_embeddings=True
                )
                result = embedding.tolist()
            
            elif self.provider == "openai":
                response = await model.embeddings.create(
                    model=self.model_name,
                    input=text
                )
                result = response.data[0].embedding
            
            elif self.provider == "huggingface":
                result = await self._generate_hf_embedding(text)
            
            else:
                raise ValueError(f"Unknown embedding provider: {self.provider}")
            
            # Cache the result
            embedding_cache.set(cache_key, result, ttl=3600)  # 1 hour cache
            
            return result
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently."""
        if not texts:
            return []
        
        # Filter empty texts
        valid_texts = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        if not valid_texts:
            return [[0.0] * settings.EMBEDDING_DIMENSION] * len(texts)
        
        model = await self._get_model()
        
        try:
            if self.provider == "sentence-transformers":
                # Batch encode
                valid_texts_only = [t for _, t in valid_texts]
                embeddings = await asyncio.to_thread(
                    model.encode,
                    valid_texts_only,
                    normalize_embeddings=True,
                    batch_size=32
                )
                
                # Reconstruct full list with zeros for empty texts
                result = [[0.0] * settings.EMBEDDING_DIMENSION] * len(texts)
                for (orig_idx, _), emb in zip(valid_texts, embeddings):
                    result[orig_idx] = emb.tolist()
                
                return result
            
            elif self.provider == "openai":
                # OpenAI supports batch requests
                valid_texts_only = [t for _, t in valid_texts]
                response = await model.embeddings.create(
                    model=self.model_name,
                    input=valid_texts_only
                )
                
                result = [[0.0] * settings.EMBEDDING_DIMENSION] * len(texts)
                for (orig_idx, _), data in zip(valid_texts, response.data):
                    result[orig_idx] = data.embedding
                
                return result
            
            else:
                # Fall back to individual generation
                return [await self.generate_embedding(t) for t in texts]
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            raise
    
    async def _generate_hf_embedding(self, text: str) -> List[float]:
        """Generate embedding using HuggingFace transformers."""
        import torch
        
        def _encode():
            inputs = self._tokenizer(
                text,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self._model(**inputs)
            
            # Mean pooling
            embeddings = outputs.last_hidden_state
            attention_mask = inputs["attention_mask"]
            mask_expanded = attention_mask.unsqueeze(-1).expand(embeddings.size()).float()
            sum_embeddings = torch.sum(embeddings * mask_expanded, 1)
            sum_mask = torch.clamp(mask_expanded.sum(1), min=1e-9)
            mean_embeddings = sum_embeddings / sum_mask
            
            # Normalize
            normalized = torch.nn.functional.normalize(mean_embeddings, p=2, dim=1)
            
            return normalized[0].cpu().numpy().tolist()
        
        return await asyncio.to_thread(_encode)
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(vec1)
        b = np.array(vec2)
        
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    
    def batch_cosine_similarity(
        self,
        query_vector: List[float],
        vectors: List[List[float]]
    ) -> List[float]:
        """Calculate cosine similarity between query and multiple vectors."""
        query = np.array(query_vector)
        docs = np.array(vectors)
        
        # Normalize
        query_norm = query / np.linalg.norm(query)
        docs_norm = docs / np.linalg.norm(docs, axis=1, keepdims=True)
        
        # Dot product
        similarities = np.dot(docs_norm, query_norm)
        
        return similarities.tolist()


# ============================================================================
# Reranking
# ============================================================================

class RerankerService:
    """Service for reranking search results."""
    
    def __init__(self):
        self._model = None
    
    async def _get_model(self):
        """Lazy load the reranker model."""
        if self._model is not None:
            return self._model
        
        try:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info("Loaded reranker model")
        except ImportError:
            logger.warning("CrossEncoder not available, using fallback")
            self._model = None
        
        return self._model
    
    async def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = None
    ) -> List[tuple]:
        """
        Rerank documents based on query relevance.
        Returns list of (index, score) tuples sorted by score.
        """
        model = await self._get_model()
        
        if not model:
            # Fallback: return original order with dummy scores
            return [(i, 1.0) for i in range(len(documents))]
        
        try:
            # Create query-document pairs
            pairs = [[query, doc] for doc in documents]
            
            # Get scores
            scores = await asyncio.to_thread(model.predict, pairs)
            
            # Sort by score
            ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
            
            if top_k:
                ranked = ranked[:top_k]
            
            return ranked
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            return [(i, 1.0) for i in range(len(documents))]
