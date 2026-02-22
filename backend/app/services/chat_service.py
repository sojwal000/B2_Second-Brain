"""
Chat Service
Handles multi-turn conversations with knowledge base context
"""

import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_mongo_db, Collections
from app.models.database import ChatSession
from app.services.rag_service import RAGService
from app.services.ai_service import AIService
from app.schemas.schemas import SourceReference

logger = logging.getLogger(__name__)


@dataclass
class ChatResult:
    response: str
    sources: List[SourceReference]
    suggested_questions: List[str]


class ChatService:
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.rag_service = RAGService(db, user_id)
        self.ai_service = AIService()
    
    async def chat(
        self,
        session_id: str,
        message: str,
        use_knowledge_base: bool = True,
        context_style: str = "self"
    ) -> ChatResult:
        history = await self._get_conversation_history(session_id, limit=10)
        
        await self._store_message(session_id=session_id, role="user", content=message)
        
        sources = []
        
        if use_knowledge_base:
            rag_result = await self.rag_service.query(
                question=message, context_style=context_style, include_followup=False
            )
            
            kb_context = "\n\n".join([
                f"[{s.title}]: {s.text_preview}" for s in rag_result.sources
            ])
            sources = rag_result.sources
            
            response = await self._generate_response_with_context(
                message=message, history=history, kb_context=kb_context, context_style=context_style
            )
        else:
            response = await self._generate_response(
                message=message, history=history, context_style=context_style
            )
        
        await self._store_message(
            session_id=session_id, role="assistant", content=response,
            sources=[s.model_dump() for s in sources] if sources else None
        )
        
        await self._update_session(session_id)
        suggestions = await self._generate_suggestions(message, response, history)
        
        return ChatResult(response=response, sources=sources, suggested_questions=suggestions)
    
    async def _get_conversation_history(self, session_id: str, limit: int = 10) -> List[Dict[str, str]]:
        mongo_db = await get_mongo_db()
        messages_collection = mongo_db[Collections.CHAT_MESSAGES]
        
        cursor = messages_collection.find(
            {"session_id": session_id, "user_id": self.user_id}
        ).sort("timestamp", -1).limit(limit)
        
        messages = []
        async for msg in cursor:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        return list(reversed(messages))
    
    async def _store_message(self, session_id: str, role: str, content: str, sources: List[Dict] = None):
        mongo_db = await get_mongo_db()
        messages_collection = mongo_db[Collections.CHAT_MESSAGES]
        
        message = {
            "session_id": session_id, "user_id": self.user_id, "role": role,
            "content": content, "timestamp": datetime.utcnow().isoformat(), "sources": sources
        }
        await messages_collection.insert_one(message)
    
    async def _update_session(self, session_id: str):
        result = await self.db.execute(select(ChatSession).where(ChatSession.session_id == session_id))
        session = result.scalar_one_or_none()
        
        if session:
            session.message_count += 1
            session.updated_at = datetime.utcnow()
            await self.db.commit()
    
    async def _generate_response(self, message: str, history: List[Dict], context_style: str) -> str:
        style_prompts = {
            "self": "You are a helpful assistant.",
            "professor": "You are a knowledgeable professor.",
            "tutor": "You are a patient tutor.",
            "friend": "You are a friendly assistant."
        }
        
        system_prompt = style_prompts.get(context_style, style_prompts["self"])
        conversation = self._format_history(history)
        prompt = f"{conversation}\n\nUser: {message}\n\nAssistant:"
        
        return await self.ai_service.generate(prompt=prompt, system_prompt=system_prompt, max_tokens=1024)
    
    async def _generate_response_with_context(
        self, message: str, history: List[Dict], kb_context: str, context_style: str
    ) -> str:
        system_prompt = "You are a helpful assistant. Use the context to answer questions."
        conversation = self._format_history(history)
        
        prompt = f"Context:\n{kb_context}\n\n{conversation}\n\nUser: {message}\n\nAssistant:"
        
        return await self.ai_service.generate(prompt=prompt, system_prompt=system_prompt, max_tokens=1024)
    
    def _format_history(self, history: List[Dict]) -> str:
        if not history:
            return ""
        
        formatted = []
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            formatted.append(f"{role}: {msg['content']}")
        
        return "\n\n".join(formatted)
    
    async def _generate_suggestions(self, message: str, response: str, history: List[Dict]) -> List[str]:
        try:
            prompt = f"Based on this Q&A, suggest 3 follow-up questions:\nQ: {message}\nA: {response[:500]}"
            result = await self.ai_service.generate(prompt=prompt, max_tokens=200, temperature=0.7)
            return [q.strip().lstrip("- 123.") for q in result.split("\n") if q.strip()][:3]
        except Exception:
            return []
