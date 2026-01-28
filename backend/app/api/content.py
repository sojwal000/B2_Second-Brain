"""
Content Management API Routes
"""

import os
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.background_tasks import submit_task, get_task_status, TaskPriority
from app.models.database import Content, ContentChunk, ContentType, ProcessingStatus, ContextStyle
from app.schemas.schemas import (
    ContentCreateText, ContentCreateWeb, ContentUpdate, ContentResponse,
    ContentListResponse, ContentUploadResponse, ChunkResponse,
    PaginatedResponse, TaskStatusResponse, SuccessResponse
)

router = APIRouter()


# ============================================================================
# File Upload
# ============================================================================

@router.post("/upload", response_model=ContentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    subject: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    context_style: Optional[str] = Form("self"),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a file for processing.
    Returns immediately with content ID; processing happens in background.
    """
    # Validate file size
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed ({settings.MAX_UPLOAD_SIZE_MB}MB)"
        )
    await file.seek(0)
    
    # Validate file extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Determine content type from extension
    content_type = _get_content_type_from_extension(ext.lower())
    
    # Create upload directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    
    # Create content record
    content = Content(
        user_id=user_id,
        title=title or file.filename,
        content_type=content_type,
        original_filename=file.filename,
        file_path=file_path,
        file_size=len(file_content),
        mime_type=file.content_type,
        tags=tag_list,
        subject=subject,
        source=source,
        context_style=ContextStyle(context_style) if context_style else ContextStyle.SELF,
        processing_status=ProcessingStatus.PENDING
    )
    
    db.add(content)
    await db.commit()
    await db.refresh(content)
    
    # Submit background processing task
    task_id = await submit_task(
        _process_content,
        content.id,
        name=f"process_content_{content.id}",
        priority=TaskPriority.HIGH
    )
    
    return ContentUploadResponse(
        id=content.id,
        title=content.title,
        content_type=content.content_type,
        processing_status=content.processing_status,
        task_id=task_id,
        message="File uploaded successfully. Processing started."
    )


# ============================================================================
# Create Text Content
# ============================================================================

@router.post("/text", response_model=ContentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_text_content(
    content_data: ContentCreateText,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a text note."""
    content = Content(
        user_id=user_id,
        title=content_data.title or "Untitled Note",
        content_type=ContentType.TEXT,
        text_content=content_data.text_content,
        tags=content_data.tags,
        subject=content_data.subject,
        source=content_data.source,
        source_url=content_data.source_url,
        context_style=content_data.context_style,
        processing_status=ProcessingStatus.PENDING
    )
    
    db.add(content)
    await db.commit()
    await db.refresh(content)
    
    # Submit background processing task
    task_id = await submit_task(
        _process_content,
        content.id,
        name=f"process_content_{content.id}",
        priority=TaskPriority.HIGH
    )
    
    return ContentUploadResponse(
        id=content.id,
        title=content.title,
        content_type=content.content_type,
        processing_status=content.processing_status,
        task_id=task_id,
        message="Content created successfully. Processing started."
    )


# ============================================================================
# Create Web Content (URL Import)
# ============================================================================

@router.post("/web", response_model=ContentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_web_content(
    content_data: ContentCreateWeb,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Import content from a URL."""
    content = Content(
        user_id=user_id,
        title=content_data.title or content_data.url,
        content_type=ContentType.WEB,
        source_url=content_data.url,
        tags=content_data.tags,
        subject=content_data.subject,
        source=content_data.source or "Web",
        context_style=content_data.context_style,
        processing_status=ProcessingStatus.PENDING
    )
    
    db.add(content)
    await db.commit()
    await db.refresh(content)
    
    # Submit background processing task
    task_id = await submit_task(
        _process_web_content,
        content.id,
        content_data.url,
        name=f"process_web_{content.id}",
        priority=TaskPriority.HIGH
    )
    
    return ContentUploadResponse(
        id=content.id,
        title=content.title,
        content_type=content.content_type,
        processing_status=content.processing_status,
        task_id=task_id,
        message="URL submitted for processing."
    )


# ============================================================================
# List Content
# ============================================================================

@router.get("", response_model=PaginatedResponse)
async def list_content(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    content_type: Optional[ContentType] = None,
    subject: Optional[str] = None,
    tags: Optional[str] = None,  # comma-separated
    search: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_pinned: Optional[bool] = None,
    is_archived: bool = False,
    sort_by: str = Query("recently_added", regex="^(recently_added|oldest|alphabetical|priority)$"),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's content with filtering, sorting, and pagination."""
    # Build base query
    query = select(Content).where(
        Content.user_id == user_id,
        Content.is_archived == is_archived
    )
    
    # Apply filters
    if content_type:
        query = query.where(Content.content_type == content_type)
    
    if subject:
        query = query.where(Content.subject == subject)
    
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        # Check if content tags contain any of the specified tags
        for tag in tag_list:
            query = query.where(Content.tags.contains([tag]))
    
    if search:
        query = query.where(
            or_(
                Content.title.ilike(f"%{search}%"),
                Content.text_content.ilike(f"%{search}%"),
                Content.summary.ilike(f"%{search}%")
            )
        )
    
    if is_favorite is not None:
        query = query.where(Content.is_favorite == is_favorite)
    
    if is_pinned is not None:
        query = query.where(Content.is_pinned == is_pinned)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "recently_added":
        query = query.order_by(Content.created_at.desc())
    elif sort_by == "oldest":
        query = query.order_by(Content.created_at.asc())
    elif sort_by == "alphabetical":
        query = query.order_by(Content.title.asc())
    elif sort_by == "priority":
        query = query.order_by(Content.priority.desc(), Content.created_at.desc())
    
    # Pinned items first
    query = query.order_by(Content.is_pinned.desc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    contents = result.scalars().all()
    
    # Convert to response format
    items = [
        ContentListResponse(
            id=c.id,
            title=c.title,
            content_type=c.content_type,
            summary=c.summary[:200] if c.summary else None,
            tags=c.tags,
            subject=c.subject,
            is_favorite=c.is_favorite,
            is_pinned=c.is_pinned,
            processing_status=c.processing_status,
            created_at=c.created_at
        )
        for c in contents
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


# ============================================================================
# Get Single Content
# ============================================================================

@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get content details by ID."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Update view count and last accessed
    content.view_count += 1
    content.last_accessed = datetime.utcnow()
    await db.commit()
    await db.refresh(content)
    
    return content


# ============================================================================
# Update Content
# ============================================================================

@router.patch("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: int,
    update_data: ContentUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update content metadata."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(content, field, value)
    
    await db.commit()
    await db.refresh(content)
    
    return content


# ============================================================================
# Delete Content
# ============================================================================

@router.delete("/{content_id}", response_model=SuccessResponse)
async def delete_content(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete content and associated files."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Delete associated file if exists
    if content.file_path and os.path.exists(content.file_path):
        try:
            os.remove(content.file_path)
        except Exception:
            pass  # Log but don't fail if file deletion fails
    
    await db.delete(content)
    await db.commit()
    
    return SuccessResponse(message="Content deleted successfully")


# ============================================================================
# Get Content Chunks
# ============================================================================

@router.get("/{content_id}/chunks", response_model=List[ChunkResponse])
async def get_content_chunks(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get content chunks (for embeddings/search)."""
    # Verify content belongs to user
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Get chunks
    result = await db.execute(
        select(ContentChunk)
        .where(ContentChunk.content_id == content_id)
        .order_by(ContentChunk.chunk_index)
    )
    chunks = result.scalars().all()
    
    return chunks


# ============================================================================
# Favorite / Pin / Archive Operations
# ============================================================================

@router.post("/{content_id}/favorite", response_model=ContentResponse)
async def toggle_favorite(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite status."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    content.is_favorite = not content.is_favorite
    await db.commit()
    await db.refresh(content)
    
    return content


@router.post("/{content_id}/pin", response_model=ContentResponse)
async def toggle_pin(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Toggle pin status."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    content.is_pinned = not content.is_pinned
    await db.commit()
    await db.refresh(content)
    
    return content


@router.post("/{content_id}/archive", response_model=ContentResponse)
async def toggle_archive(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Toggle archive status."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    content.is_archived = not content.is_archived
    await db.commit()
    await db.refresh(content)
    
    return content


# ============================================================================
# Reprocess Content
# ============================================================================

@router.post("/{content_id}/reprocess", response_model=ContentUploadResponse)
async def reprocess_content(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Reprocess content (re-run AI pipeline)."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Reset processing status
    content.processing_status = ProcessingStatus.PENDING
    content.processing_error = None
    await db.commit()
    
    # Submit background processing task
    task_id = await submit_task(
        _process_content,
        content.id,
        name=f"reprocess_content_{content.id}",
        priority=TaskPriority.MEDIUM
    )
    
    return ContentUploadResponse(
        id=content.id,
        title=content.title,
        content_type=content.content_type,
        processing_status=content.processing_status,
        task_id=task_id,
        message="Reprocessing started."
    )


# ============================================================================
# Check Processing Status
# ============================================================================

@router.get("/{content_id}/status", response_model=TaskStatusResponse)
async def get_processing_status(
    content_id: int,
    task_id: Optional[str] = None,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Check content processing status."""
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    if task_id:
        task_result = await get_task_status(task_id)
        if task_result:
            return TaskStatusResponse(
                task_id=task_id,
                status=task_result.status.value,
                result=task_result.result,
                error=task_result.error,
                started_at=task_result.started_at,
                completed_at=task_result.completed_at
            )
    
    return TaskStatusResponse(
        task_id=task_id or "",
        status=content.processing_status.value,
        error=content.processing_error
    )


# ============================================================================
# Helper Functions
# ============================================================================

def _get_content_type_from_extension(ext: str) -> ContentType:
    """Determine content type from file extension."""
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".tiff"}
    audio_exts = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}
    video_exts = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
    document_exts = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt"}
    code_exts = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".go", ".rs", ".html", ".css"}
    
    if ext in image_exts:
        return ContentType.IMAGE
    elif ext in audio_exts:
        return ContentType.AUDIO
    elif ext in video_exts:
        return ContentType.VIDEO
    elif ext in document_exts:
        return ContentType.DOCUMENT
    elif ext in code_exts:
        return ContentType.CODE
    else:
        return ContentType.TEXT


async def _process_content(content_id: int):
    """
    Background task to process content.
    This will be implemented in the services module.
    """
    # Import here to avoid circular imports
    from app.services.content_processor import process_content
    await process_content(content_id)


async def _process_web_content(content_id: int, url: str):
    """
    Background task to fetch and process web content.
    This will be implemented in the services module.
    """
    # Import here to avoid circular imports
    from app.services.content_processor import process_web_content
    await process_web_content(content_id, url)
