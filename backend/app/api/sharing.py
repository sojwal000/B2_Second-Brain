"""
Content Sharing API Routes
Allows users to share content with other users for knowledge sharing.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import Content, User, SharedContent
from app.schemas.schemas import (
    ShareContentRequest, SharedContentResponse, SharedByMeResponse,
    UserSearchResult, SuccessResponse, PaginatedResponse
)

router = APIRouter()


# ============================================================================
# Search Users (for sharing)
# ============================================================================

@router.get("/users/search", response_model=List[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=1, description="Search by username or name"),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Search for users to share content with. Excludes current user."""
    search_pattern = f"%{q}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != user_id,
            User.is_active == True,
            or_(
                User.username.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
        .limit(10)
    )
    users = result.scalars().all()
    
    return [
        UserSearchResult(
            id=u.id,
            username=u.username,
            full_name=u.full_name
        )
        for u in users
    ]


# ============================================================================
# Share Content
# ============================================================================

@router.post("/share", response_model=SharedContentResponse)
async def share_content(
    request: ShareContentRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Share a content item with another user."""
    # Verify content exists and belongs to current user
    content_result = await db.execute(
        select(Content).where(Content.id == request.content_id, Content.user_id == user_id)
    )
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found or you don't own it"
        )
    
    # Find recipient user by username
    recipient_result = await db.execute(
        select(User).where(User.username == request.shared_with_username, User.is_active == True)
    )
    recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{request.shared_with_username}' not found"
        )
    
    # Can't share with yourself
    if recipient.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot share content with yourself"
        )
    
    # Check if already shared
    existing = await db.execute(
        select(SharedContent).where(
            SharedContent.shared_by_id == user_id,
            SharedContent.shared_with_id == recipient.id,
            SharedContent.content_id == request.content_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Content already shared with {request.shared_with_username}"
        )
    
    # Get sharer info
    sharer_result = await db.execute(select(User).where(User.id == user_id))
    sharer = sharer_result.scalar_one()
    
    # Create share record
    shared = SharedContent(
        shared_by_id=user_id,
        shared_with_id=recipient.id,
        content_id=request.content_id,
        message=request.message
    )
    db.add(shared)
    await db.commit()
    await db.refresh(shared)
    
    return SharedContentResponse(
        id=shared.id,
        content_id=content.id,
        content_title=content.title,
        content_type=content.content_type.value,
        content_summary=content.summary,
        shared_by_username=sharer.username,
        shared_by_fullname=sharer.full_name,
        shared_with_username=recipient.username,
        shared_with_fullname=recipient.full_name,
        message=shared.message,
        is_read=shared.is_read,
        shared_at=shared.shared_at,
        read_at=shared.read_at
    )


# ============================================================================
# Get Content Shared With Me
# ============================================================================

@router.get("/shared-with-me", response_model=PaginatedResponse)
async def get_shared_with_me(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get content shared with the current user."""
    # Build base query
    base_query = select(SharedContent).where(SharedContent.shared_with_id == user_id)
    if unread_only:
        base_query = base_query.where(SharedContent.is_read == False)
    
    # Count
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0
    
    # Fetch shares
    offset = (page - 1) * page_size
    result = await db.execute(
        base_query.order_by(SharedContent.shared_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    shares = result.scalars().all()
    
    # Build response items with related data
    items = []
    for share in shares:
        # Get content
        content_result = await db.execute(select(Content).where(Content.id == share.content_id))
        content = content_result.scalar_one_or_none()
        
        # Get sharer
        sharer_result = await db.execute(select(User).where(User.id == share.shared_by_id))
        sharer = sharer_result.scalar_one_or_none()
        
        if content and sharer:
            items.append(SharedContentResponse(
                id=share.id,
                content_id=content.id,
                content_title=content.title,
                content_type=content.content_type.value,
                content_summary=content.summary,
                shared_by_username=sharer.username,
                shared_by_fullname=sharer.full_name,
                shared_with_username="",  # It's me
                shared_with_fullname=None,
                message=share.message,
                is_read=share.is_read,
                shared_at=share.shared_at,
                read_at=share.read_at
            ).model_dump())
    
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


# ============================================================================
# Get Content I Shared (Shared By Me)
# ============================================================================

@router.get("/shared-by-me", response_model=PaginatedResponse)
async def get_shared_by_me(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get content the current user has shared with others."""
    # Count
    count_result = await db.execute(
        select(func.count()).where(SharedContent.shared_by_id == user_id)
    )
    total = count_result.scalar() or 0
    
    # Fetch shares
    offset = (page - 1) * page_size
    result = await db.execute(
        select(SharedContent)
        .where(SharedContent.shared_by_id == user_id)
        .order_by(SharedContent.shared_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    shares = result.scalars().all()
    
    items = []
    for share in shares:
        content_result = await db.execute(select(Content).where(Content.id == share.content_id))
        content = content_result.scalar_one_or_none()
        
        recipient_result = await db.execute(select(User).where(User.id == share.shared_with_id))
        recipient = recipient_result.scalar_one_or_none()
        
        if content and recipient:
            items.append(SharedByMeResponse(
                id=share.id,
                content_id=content.id,
                content_title=content.title,
                content_type=content.content_type.value,
                shared_with_username=recipient.username,
                shared_with_fullname=recipient.full_name,
                message=share.message,
                is_read=share.is_read,
                shared_at=share.shared_at
            ).model_dump())
    
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


# ============================================================================
# Mark Shared Content as Read
# ============================================================================

@router.post("/{share_id}/read", response_model=SuccessResponse)
async def mark_as_read(
    share_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Mark a shared content item as read."""
    result = await db.execute(
        select(SharedContent).where(
            SharedContent.id == share_id,
            SharedContent.shared_with_id == user_id
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Shared content not found")
    
    share.is_read = True
    share.read_at = datetime.utcnow()
    await db.commit()
    
    return SuccessResponse(message="Marked as read")


# ============================================================================
# Get Unread Count
# ============================================================================

@router.get("/unread-count")
async def get_unread_count(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread shared content."""
    result = await db.execute(
        select(func.count()).where(
            SharedContent.shared_with_id == user_id,
            SharedContent.is_read == False
        )
    )
    count = result.scalar() or 0
    return {"unread_count": count}


# ============================================================================
# View Shared Content Detail
# ============================================================================

@router.get("/content/{content_id}", response_model=dict)
async def view_shared_content(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """View a content item that was shared with you. Auto-marks as read."""
    # Check if this content was shared with the user
    share_result = await db.execute(
        select(SharedContent).where(
            SharedContent.content_id == content_id,
            SharedContent.shared_with_id == user_id
        )
    )
    share = share_result.scalar_one_or_none()
    if not share:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This content has not been shared with you"
        )
    
    # Mark as read
    if not share.is_read:
        share.is_read = True
        share.read_at = datetime.utcnow()
        await db.commit()
    
    # Get the content
    content_result = await db.execute(select(Content).where(Content.id == content_id))
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Get sharer info
    sharer_result = await db.execute(select(User).where(User.id == share.shared_by_id))
    sharer = sharer_result.scalar_one_or_none()
    
    return {
        "id": content.id,
        "title": content.title,
        "content_type": content.content_type.value,
        "text_content": content.text_content,
        "raw_markdown": content.raw_markdown,
        "summary": content.summary,
        "summary_bullets": content.summary_bullets,
        "tags": content.tags or [],
        "subject": content.subject,
        "created_at": content.created_at.isoformat(),
        "shared_by": {
            "username": sharer.username if sharer else "Unknown",
            "full_name": sharer.full_name if sharer else None
        },
        "shared_at": share.shared_at.isoformat(),
        "message": share.message
    }


# ============================================================================
# Unshare / Revoke Share
# ============================================================================

@router.delete("/{share_id}", response_model=SuccessResponse)
async def unshare_content(
    share_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove a share. Either the sharer or recipient can remove it."""
    result = await db.execute(
        select(SharedContent).where(
            SharedContent.id == share_id,
            or_(
                SharedContent.shared_by_id == user_id,
                SharedContent.shared_with_id == user_id
            )
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Shared content not found")
    
    await db.delete(share)
    await db.commit()
    
    return SuccessResponse(message="Share removed successfully")
