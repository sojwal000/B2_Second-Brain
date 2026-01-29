"""
Tasks API Routes
Handles task extraction, management, and tracking
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import Task, Content, TaskStatus, TaskPriority as DBTaskPriority
from app.schemas.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse,
    ExtractTasksRequest, ExtractTasksResponse,
    SuccessResponse, PaginatedResponse
)

router = APIRouter()


# ============================================================================
# Task CRUD Operations
# ============================================================================

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task."""
    task = Task(
        user_id=user_id,
        content_id=task_data.content_id,
        title=task_data.title,
        description=task_data.description,
        status=task_data.status or TaskStatus.PENDING,
        priority=task_data.priority or DBTaskPriority.MEDIUM,
        due_date=task_data.due_date,
        due_time=task_data.due_time,
        estimated_duration_minutes=task_data.estimated_duration_minutes,
        tags=task_data.tags,
        project=task_data.project,
        assigned_to=task_data.assigned_to
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    return task


@router.get("", response_model=PaginatedResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[TaskStatus] = None,
    priority: Optional[DBTaskPriority] = None,
    project: Optional[str] = None,
    overdue_only: bool = False,
    due_today: bool = False,
    due_this_week: bool = False,
    search: Optional[str] = None,
    sort_by: str = Query("due_date", regex="^(due_date|priority|created_at|title)$"),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's tasks with filtering, sorting, and pagination."""
    query = select(Task).where(Task.user_id == user_id)
    
    # Apply filters
    if status_filter:
        query = query.where(Task.status == status_filter)
    
    if priority:
        query = query.where(Task.priority == priority)
    
    if project:
        query = query.where(Task.project == project)
    
    now = datetime.utcnow()
    
    if overdue_only:
        query = query.where(
            Task.due_date < now,
            Task.status != TaskStatus.COMPLETED
        )
    
    if due_today:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        query = query.where(
            Task.due_date >= today_start,
            Task.due_date < today_end
        )
    
    if due_this_week:
        week_end = now + timedelta(days=7)
        query = query.where(
            Task.due_date >= now,
            Task.due_date <= week_end
        )
    
    if search:
        query = query.where(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "due_date":
        query = query.order_by(Task.due_date.asc().nullslast())
    elif sort_by == "priority":
        query = query.order_by(Task.priority.desc())
    elif sort_by == "created_at":
        query = query.order_by(Task.created_at.desc())
    elif sort_by == "title":
        query = query.order_by(Task.title.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    items = [
        TaskListResponse(
            id=t.id,
            title=t.title,
            status=t.status,
            priority=t.priority,
            due_date=t.due_date,
            content_id=t.content_id,
            created_at=t.created_at
        ).model_dump()
        for t in tasks
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


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get task details."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    update_data: TaskUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update task."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Handle status change to COMPLETED
    if "status" in update_dict and update_dict["status"] == TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
    elif "status" in update_dict and update_dict["status"] != TaskStatus.COMPLETED:
        task.completed_at = None
    
    for field, value in update_dict.items():
        setattr(task, field, value)
    
    await db.commit()
    await db.refresh(task)
    
    return task


@router.delete("/{task_id}", response_model=SuccessResponse)
async def delete_task(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete task."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    await db.delete(task)
    await db.commit()
    
    return SuccessResponse(message="Task deleted successfully")


# ============================================================================
# Bulk Operations
# ============================================================================

@router.post("/complete", response_model=SuccessResponse)
async def complete_tasks(
    task_ids: List[int],
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Mark multiple tasks as complete."""
    result = await db.execute(
        select(Task).where(
            Task.id.in_(task_ids),
            Task.user_id == user_id
        )
    )
    tasks = result.scalars().all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tasks found"
        )
    
    now = datetime.utcnow()
    for task in tasks:
        task.status = TaskStatus.COMPLETED
        task.completed_at = now
    
    await db.commit()
    
    return SuccessResponse(message=f"{len(tasks)} tasks marked as complete")


@router.delete("/bulk", response_model=SuccessResponse)
async def delete_tasks(
    task_ids: List[int],
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete multiple tasks."""
    result = await db.execute(
        select(Task).where(
            Task.id.in_(task_ids),
            Task.user_id == user_id
        )
    )
    tasks = result.scalars().all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tasks found"
        )
    
    for task in tasks:
        await db.delete(task)
    
    await db.commit()
    
    return SuccessResponse(message=f"{len(tasks)} tasks deleted")


# ============================================================================
# Quick Status Updates
# ============================================================================

@router.post("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task_status(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Toggle task between PENDING and COMPLETED."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task.status == TaskStatus.COMPLETED:
        task.status = TaskStatus.PENDING
        task.completed_at = None
    else:
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(task)
    
    return task


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Mark task as in progress."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task.status = TaskStatus.IN_PROGRESS
    await db.commit()
    await db.refresh(task)
    
    return task


# ============================================================================
# AI Task Extraction
# ============================================================================

@router.post("/extract", response_model=ExtractTasksResponse)
async def extract_tasks_from_content(
    request: ExtractTasksRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Extract tasks/action items from content using AI."""
    # Verify content ownership
    result = await db.execute(
        select(Content).where(
            Content.id == request.content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Extract tasks using AI
    from app.services.task_service import TaskService
    task_service = TaskService(db, user_id)
    
    try:
        extracted = await task_service.extract_from_content(
            content=content,
            auto_save=request.auto_save
        )
        
        return ExtractTasksResponse(
            content_id=content.id,
            content_title=content.title,
            tasks_extracted=len(extracted),
            tasks=extracted
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract tasks: {str(e)}"
        )


# ============================================================================
# Task Statistics
# ============================================================================

@router.get("/stats/summary")
async def get_task_stats(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get task statistics summary."""
    now = datetime.utcnow()
    
    # Total tasks
    total_result = await db.execute(
        select(func.count()).where(Task.user_id == user_id)
    )
    total = total_result.scalar() or 0
    
    # By status
    status_result = await db.execute(
        select(Task.status, func.count())
        .where(Task.user_id == user_id)
        .group_by(Task.status)
    )
    by_status = {str(row[0].value): row[1] for row in status_result.all()}
    
    # Overdue
    overdue_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.due_date < now,
            Task.status != TaskStatus.COMPLETED
        )
    )
    overdue = overdue_result.scalar() or 0
    
    # Due today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    due_today_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.due_date >= today_start,
            Task.due_date < today_end,
            Task.status != TaskStatus.COMPLETED
        )
    )
    due_today = due_today_result.scalar() or 0
    
    # Due this week
    week_end = now + timedelta(days=7)
    due_week_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.due_date >= now,
            Task.due_date <= week_end,
            Task.status != TaskStatus.COMPLETED
        )
    )
    due_this_week = due_week_result.scalar() or 0
    
    # Completed this week
    week_start = now - timedelta(days=7)
    completed_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.completed_at >= week_start,
            Task.status == TaskStatus.COMPLETED
        )
    )
    completed_this_week = completed_result.scalar() or 0
    
    return {
        "total": total,
        "by_status": by_status,
        "overdue": overdue,
        "due_today": due_today,
        "due_this_week": due_this_week,
        "completed_this_week": completed_this_week,
        "completion_rate": round(by_status.get("done", 0) / total * 100, 1) if total > 0 else 0
    }


# ============================================================================
# Content-linked Tasks
# ============================================================================

@router.get("/content/{content_id}", response_model=List[TaskResponse])
async def get_tasks_for_content(
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all tasks linked to a specific content."""
    # Verify content ownership
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
    
    # Get tasks
    result = await db.execute(
        select(Task)
        .where(Task.content_id == content_id, Task.user_id == user_id)
        .order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()
    
    return tasks


# ============================================================================
# Categories
# ============================================================================

@router.get("/projects", response_model=List[str])
async def get_task_projects(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all unique task projects."""
    result = await db.execute(
        select(Task.project)
        .where(Task.user_id == user_id, Task.project.isnot(None))
        .distinct()
    )
    projects = [row[0] for row in result.all() if row[0]]
    
    return projects
