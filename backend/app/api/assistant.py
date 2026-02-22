"""
Assistant / RAG API Routes
Handles Q&A, search, and chat functionality
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from app.core.database import get_db, get_mongo_db, Collections
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.cache import query_cache
from app.models.database import Content, ContentChunk, QueryHistory, ChatSession
from app.schemas.schemas import (
    QueryRequest, QueryResponse,
    SearchRequest, SearchResponse,
    ChatRequest, ChatResponse, ChatMessage,
    ChatHistoryResponse, SuccessResponse, PaginatedResponse
)

router = APIRouter()


# ============================================================================
# RAG Query (Q&A)
# ============================================================================

@router.post("/query", response_model=QueryResponse)
async def query_knowledge_base(
    query: QueryRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Ask a question and get an AI-generated answer based on your knowledge base.
    Uses RAG (Retrieval Augmented Generation) pipeline.
    """
    import time
    start_time = time.time()
    
    # Check cache
    cache_key = f"query:{user_id}:{query.query}"
    cached = query_cache.get(cache_key)
    if cached:
        return QueryResponse(**cached)
    
    # Import RAG service
    from app.services.rag_service import RAGService
    rag = RAGService(db, user_id)
    
    try:
        # Build filters from config
        filters = {}
        if query.config.content_types:
            filters["content_types"] = [ct.value for ct in query.config.content_types]
        if query.config.subjects:
            filters["subjects"] = query.config.subjects
        if query.config.tags:
            filters["tags"] = query.config.tags
        if query.config.date_filter:
            filters["date_filter"] = query.config.date_filter
        
        # Execute RAG query
        result = await rag.query(
            question=query.query,
            search_type="hybrid",
            filters=filters if filters else None,
            max_sources=query.config.max_sources,
            context_style=query.config.context_style.value if query.config.context_style else "self",
            include_followup=True
        )
        
        # Log query in history
        query_log = QueryHistory(
            user_id=user_id,
            query=query.query,
            answer=result.answer[:1000] if result.answer else "",
            source_content_ids=[src.content_id for src in (result.sources or [])],
            processing_time_ms=int(result.processing_time * 1000) if result.processing_time else None
        )
        db.add(query_log)
        await db.commit()
        
        # Convert sources to QuerySource format
        # Note: result.sources contains SourceReference objects, not dicts
        query_sources = []
        for src in (result.sources or []):
            query_sources.append({
                "content_id": src.content_id,
                "title": src.title,
                "snippet": (src.text_preview or "")[:500],
                "relevance_score": src.relevance_score or 0.0,
                "supporting_quote": None,
                "created_at": datetime.utcnow()
            })
        
        # Calculate processing time in ms
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Build response
        response = QueryResponse(
            query_id=str(uuid.uuid4()),
            answer=result.answer or "No answer generated.",
            confidence=result.confidence if hasattr(result, 'confidence') else 0.8,
            sources=query_sources,
            reasoning_trace=None,
            follow_up_questions=result.follow_up_questions if hasattr(result, 'follow_up_questions') else [],
            processing_time_ms=processing_time_ms
        )
        
        # Cache result
        query_cache.set(cache_key, response.model_dump(), ttl=300)
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query processing failed: {str(e)}"
        )


# ============================================================================
# Semantic Search
# ============================================================================

@router.post("/search", response_model=SearchResponse)
async def semantic_search(
    search: SearchRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Search through knowledge base using semantic/hybrid search.
    Returns relevant chunks with similarity scores.
    """
    import time
    start_time = time.time()
    
    from app.services.search_service import SearchService
    search_service = SearchService(db, user_id)
    
    try:
        # Convert content_types to string values if present
        content_type_values = None
        if search.content_types:
            content_type_values = [ct.value for ct in search.content_types]
        
        results = await search_service.search(
            query=search.query,
            search_type="hybrid",
            content_types=content_type_values,
            tags=search.tags,
            subject=search.subjects[0] if search.subjects else None,
            min_score=0.5,
            limit=search.limit,
            rerank=True
        )
        
        # Convert results to SearchResult format
        search_results = []
        for hit in (results.hits if hasattr(results, 'hits') else results):
            if isinstance(hit, dict):
                search_results.append({
                    "content_id": hit.get("content_id", 0),
                    "title": hit.get("title"),
                    "content_type": hit.get("content_type", "text"),
                    "snippet": hit.get("text", hit.get("snippet", ""))[:300],
                    "relevance_score": hit.get("score", 0.0),
                    "tags": hit.get("tags", []),
                    "created_at": hit.get("created_at", datetime.utcnow())
                })
        
        query_time_ms = int((time.time() - start_time) * 1000)
        
        return SearchResponse(
            results=search_results,
            total_count=len(search_results),
            query_time_ms=query_time_ms
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


# ============================================================================
# Chat Sessions
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Multi-turn chat with context from knowledge base.
    Maintains conversation history for follow-up questions.
    """
    from app.services.chat_service import ChatService
    chat_service = ChatService(db, user_id)
    
    try:
        # Get or create session
        session_id = chat_request.session_id
        if not session_id:
            # Generate a unique session_id
            new_session_id = str(uuid.uuid4())
            session = ChatSession(
                user_id=user_id,
                session_id=new_session_id,
                title=chat_request.message[:50] + "..." if len(chat_request.message) > 50 else chat_request.message
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_id = new_session_id
        
        # Process chat message
        result = await chat_service.chat(
            session_id=session_id,
            message=chat_request.message,
            use_knowledge_base=chat_request.use_knowledge_base,
            context_style=chat_request.context_style
        )
        
        # Convert SourceReference to QuerySource format
        query_sources = []
        for src in (result.sources or []):
            query_sources.append({
                "content_id": src.content_id,
                "title": src.title,
                "snippet": src.text_preview[:500] if src.text_preview else "",
                "relevance_score": src.relevance_score or 0.0,
                "supporting_quote": None,
                "created_at": datetime.utcnow()
            })
        
        return ChatResponse(
            session_id=session_id,
            message=ChatMessage(
                role="assistant",
                content=result.response,
                timestamp=datetime.utcnow().isoformat(),
                sources=None
            ),
            sources=query_sources,
            suggested_questions=result.suggested_questions
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )


@router.get("/chat/sessions", response_model=PaginatedResponse)
async def list_chat_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's chat sessions."""
    # Count total
    count_result = await db.execute(
        select(func.count()).where(ChatSession.user_id == user_id)
    )
    total = count_result.scalar()
    
    # Get sessions
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()
    
    items = [
        {
            "id": str(s.id),
            "title": s.title,
            "message_count": s.message_count,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat()
        }
        for s in sessions
    ]
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/chat/sessions/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get chat session history."""
    # Get session
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == int(session_id),
            ChatSession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Get messages from MongoDB
    mongo_db = await get_mongo_db()
    messages_collection = mongo_db[Collections.CHAT_MESSAGES]
    
    cursor = messages_collection.find(
        {"session_id": session_id, "user_id": user_id}
    ).sort("timestamp", 1)
    
    messages = []
    async for msg in cursor:
        messages.append(ChatMessage(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg["timestamp"],
            sources=msg.get("sources")
        ))
    
    return ChatHistoryResponse(
        session_id=session_id,
        title=session.title,
        messages=messages,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat()
    )


@router.delete("/chat/sessions/{session_id}", response_model=SuccessResponse)
async def delete_chat_session(
    session_id: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and its messages."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == int(session_id),
            ChatSession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Delete messages from MongoDB
    mongo_db = await get_mongo_db()
    messages_collection = mongo_db[Collections.CHAT_MESSAGES]
    await messages_collection.delete_many({"session_id": session_id})
    
    # Delete session
    await db.delete(session)
    await db.commit()
    
    return SuccessResponse(message="Chat session deleted")


# ============================================================================
# Query History
# ============================================================================

@router.get("/history", response_model=PaginatedResponse)
async def get_query_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user's query history."""
    # Count total
    count_result = await db.execute(
        select(func.count()).where(QueryHistory.user_id == user_id)
    )
    total = count_result.scalar()
    
    # Get queries
    offset = (page - 1) * page_size
    result = await db.execute(
        select(QueryHistory)
        .where(QueryHistory.user_id == user_id)
        .order_by(QueryHistory.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    queries = result.scalars().all()
    
    items = [
        {
            "id": q.id,
            "question": q.question,
            "answer": q.answer[:200] + "..." if len(q.answer) > 200 else q.answer,
            "source_count": q.source_count,
            "processing_time": q.processing_time,
            "created_at": q.created_at.isoformat()
        }
        for q in queries
    ]
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.delete("/history", response_model=SuccessResponse)
async def clear_query_history(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Clear all query history."""
    from sqlalchemy import delete
    await db.execute(
        delete(QueryHistory).where(QueryHistory.user_id == user_id)
    )
    await db.commit()
    
    return SuccessResponse(message="Query history cleared")


# ============================================================================
# Suggested Questions
# ============================================================================

@router.get("/suggestions", response_model=List[str])
async def get_suggested_questions(
    limit: int = Query(5, ge=1, le=10),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get suggested questions based on user's knowledge base."""
    from app.services.rag_service import RAGService
    rag = RAGService(db, user_id)
    
    try:
        suggestions = await rag.generate_suggestions(limit=limit)
        return suggestions
    except Exception:
        # Return default suggestions on error
        return [
            "What are the key concepts in my notes?",
            "Summarize my recent documents",
            "What topics have I been studying?",
            "What are the main themes across my content?",
            "Find connections between my notes"
        ][:limit]
