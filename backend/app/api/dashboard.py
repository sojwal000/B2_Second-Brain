"""
Dashboard API Routes
Provides overview statistics and insights
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import (
    Content, ContentType, ProcessingStatus,
    Task, TaskStatus,
    Flashcard, FlashcardReview, MasteryLevel,
    QueryHistory, ChatSession
)
from app.schemas.schemas import DashboardStats, ActivityItem

router = APIRouter()


# ============================================================================
# Dashboard Stats (Simple format for frontend)
# ============================================================================

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics in simple format."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    
    # Total content count
    total_content_result = await db.execute(
        select(func.count()).where(Content.user_id == user_id)
    )
    total_content = total_content_result.scalar() or 0
    
    # Content by type
    content_type_result = await db.execute(
        select(Content.content_type, func.count())
        .where(Content.user_id == user_id)
        .group_by(Content.content_type)
    )
    content_by_type = {str(row[0].value): row[1] for row in content_type_result.all()}
    
    # Total flashcards
    total_cards_result = await db.execute(
        select(func.count()).where(Flashcard.user_id == user_id)
    )
    total_flashcards = total_cards_result.scalar() or 0
    
    # Cards due for review
    due_cards_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    flashcards_due = due_cards_result.scalar() or 0
    
    # Total tasks
    total_tasks_result = await db.execute(
        select(func.count()).where(Task.user_id == user_id)
    )
    total_tasks = total_tasks_result.scalar() or 0
    
    # Pending tasks
    pending_tasks_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.status == TaskStatus.PENDING
        )
    )
    tasks_pending = pending_tasks_result.scalar() or 0
    
    # Tasks completed today
    today_end = today_start + timedelta(days=1)
    completed_today_result = await db.execute(
        select(func.count()).where(
            Task.user_id == user_id,
            Task.completed_at >= today_start,
            Task.completed_at < today_end
        )
    )
    tasks_completed_today = completed_today_result.scalar() or 0
    
    # Weekly activity
    weekly_activity = []
    for i in range(7):
        day = week_ago + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Content added that day
        content_result = await db.execute(
            select(func.count()).where(
                Content.user_id == user_id,
                Content.created_at >= day_start,
                Content.created_at < day_end
            )
        )
        content_added = content_result.scalar() or 0
        
        # Flashcards reviewed that day
        reviews_result = await db.execute(
            select(func.count())
            .select_from(FlashcardReview)
            .join(Flashcard, FlashcardReview.flashcard_id == Flashcard.id)
            .where(
                Flashcard.user_id == user_id,
                FlashcardReview.reviewed_at >= day_start,
                FlashcardReview.reviewed_at < day_end
            )
        )
        flashcards_reviewed = reviews_result.scalar() or 0
        
        # Tasks completed that day
        tasks_result = await db.execute(
            select(func.count()).where(
                Task.user_id == user_id,
                Task.completed_at >= day_start,
                Task.completed_at < day_end
            )
        )
        tasks_completed = tasks_result.scalar() or 0
        
        weekly_activity.append({
            "date": day_start.date().isoformat(),
            "content_added": content_added,
            "flashcards_reviewed": flashcards_reviewed,
            "tasks_completed": tasks_completed
        })
    
    # Study streak (simplified - count consecutive days with activity)
    study_streak = 0
    for i in range(30):  # Check last 30 days
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        activity_result = await db.execute(
            select(func.count())
            .select_from(FlashcardReview)
            .join(Flashcard, FlashcardReview.flashcard_id == Flashcard.id)
            .where(
                Flashcard.user_id == user_id,
                FlashcardReview.reviewed_at >= day_start,
                FlashcardReview.reviewed_at < day_end
            )
        )
        if activity_result.scalar() or 0 > 0:
            study_streak += 1
        else:
            break
    
    return DashboardStats(
        total_content=total_content,
        content_by_type=content_by_type,
        total_flashcards=total_flashcards,
        flashcards_due=flashcards_due,
        total_tasks=total_tasks,
        tasks_pending=tasks_pending,
        tasks_completed_today=tasks_completed_today,
        study_streak=study_streak,
        weekly_activity=weekly_activity
    )


# ============================================================================
# Activity Timeline
# ============================================================================

@router.get("/activity", response_model=List[ActivityItem])
async def get_activity_timeline(
    limit: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get recent activity items."""
    from typing import List as TList
    
    activities: TList[dict] = []
    
    # Get recent content
    content_result = await db.execute(
        select(Content)
        .where(Content.user_id == user_id)
        .order_by(Content.created_at.desc())
        .limit(limit)
    )
    for c in content_result.scalars().all():
        activities.append({
            "id": f"content-{c.id}",
            "type": "content",
            "action": "added",
            "title": c.title or c.original_filename or "Untitled",
            "timestamp": c.created_at.isoformat()
        })
    
    # Get recent flashcard reviews
    reviews_result = await db.execute(
        select(FlashcardReview, Flashcard)
        .join(Flashcard, FlashcardReview.flashcard_id == Flashcard.id)
        .where(Flashcard.user_id == user_id)
        .order_by(FlashcardReview.reviewed_at.desc())
        .limit(limit)
    )
    for review, flashcard in reviews_result.all():
        activities.append({
            "id": f"flashcard-{review.id}",
            "type": "flashcard",
            "action": "reviewed",
            "title": flashcard.front[:50] + "..." if len(flashcard.front) > 50 else flashcard.front,
            "timestamp": review.reviewed_at.isoformat()
        })
    
    # Get recently completed tasks
    tasks_result = await db.execute(
        select(Task)
        .where(Task.user_id == user_id, Task.completed_at.isnot(None))
        .order_by(Task.completed_at.desc())
        .limit(limit)
    )
    for t in tasks_result.scalars().all():
        activities.append({
            "id": f"task-{t.id}",
            "type": "task",
            "action": "completed",
            "title": t.title,
            "timestamp": t.completed_at.isoformat()
        })
    
    # Sort by timestamp and take the most recent
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activities[:limit]


# ============================================================================
# Top Subjects
# ============================================================================

@router.get("/subjects")
async def get_subject_breakdown(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get content breakdown by subject."""
    result = await db.execute(
        select(Content.subject, func.count())
        .where(Content.user_id == user_id, Content.subject.isnot(None))
        .group_by(Content.subject)
        .order_by(func.count().desc())
        .limit(10)
    )
    
    subjects = [
        {"subject": row[0], "count": row[1]}
        for row in result.all()
    ]
    
    return {"subjects": subjects}


# ============================================================================
# Tag Cloud
# ============================================================================

@router.get("/tags")
async def get_tag_cloud(
    limit: int = Query(20, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get tag frequency for tag cloud visualization."""
    # Get all content with tags
    result = await db.execute(
        select(Content.tags)
        .where(Content.user_id == user_id, Content.tags.isnot(None))
    )
    
    # Count tag occurrences
    tag_counts = {}
    for row in result.all():
        if row[0]:
            for tag in row[0]:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Sort by count and take top N
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return {
        "tags": [
            {"tag": tag, "count": count}
            for tag, count in sorted_tags
        ]
    }


# ============================================================================
# Quick Access
# ============================================================================

@router.get("/quick-access")
async def get_quick_access(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get quick access items (recent, favorites, pinned)."""
    # Pinned content
    pinned_result = await db.execute(
        select(Content)
        .where(Content.user_id == user_id, Content.is_pinned == True)
        .order_by(Content.updated_at.desc())
        .limit(5)
    )
    pinned = [
        {"id": c.id, "title": c.title, "type": c.content_type.value}
        for c in pinned_result.scalars().all()
    ]
    
    # Recent content
    recent_result = await db.execute(
        select(Content)
        .where(Content.user_id == user_id)
        .order_by(Content.last_accessed.desc().nullslast())
        .limit(5)
    )
    recent = [
        {"id": c.id, "title": c.title, "type": c.content_type.value}
        for c in recent_result.scalars().all()
    ]
    
    # Favorites
    favorites_result = await db.execute(
        select(Content)
        .where(Content.user_id == user_id, Content.is_favorite == True)
        .order_by(Content.updated_at.desc())
        .limit(5)
    )
    favorites = [
        {"id": c.id, "title": c.title, "type": c.content_type.value}
        for c in favorites_result.scalars().all()
    ]
    
    return {
        "pinned": pinned,
        "recent": recent,
        "favorites": favorites
    }


# ============================================================================
# Today's Focus
# ============================================================================

@router.get("/today")
async def get_today_focus(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get today's focus items - tasks due and cards to review."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Tasks due today
    tasks_result = await db.execute(
        select(Task)
        .where(
            Task.user_id == user_id,
            Task.due_date >= today_start,
            Task.due_date < today_end,
            Task.status != TaskStatus.COMPLETED
        )
        .order_by(Task.priority.desc())
        .limit(10)
    )
    tasks = [
        {
            "id": t.id,
            "title": t.title,
            "priority": t.priority.value,
            "status": t.status.value
        }
        for t in tasks_result.scalars().all()
    ]
    
    # Overdue tasks
    overdue_result = await db.execute(
        select(Task)
        .where(
            Task.user_id == user_id,
            Task.due_date < now,
            Task.status != TaskStatus.COMPLETED
        )
        .order_by(Task.due_date.asc())
        .limit(5)
    )
    overdue = [
        {
            "id": t.id,
            "title": t.title,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None
        }
        for t in overdue_result.scalars().all()
    ]
    
    # Cards due for review
    cards_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    cards_due = cards_result.scalar() or 0
    
    return {
        "tasks_due_today": tasks,
        "overdue_tasks": overdue,
        "cards_due_for_review": cards_due,
        "date": today_start.date().isoformat()
    }


# ============================================================================
# Helper Functions
# ============================================================================

async def _generate_insights(
    total_content: int,
    cards_due: int,
    overdue_tasks: int,
    tasks_due_today: int
) -> list:
    """Generate personalized insights based on stats."""
    insights = []
    
    if cards_due > 0:
        insights.append({
            "type": "flashcards",
            "message": f"You have {cards_due} flashcards due for review",
            "action": "Start review session",
            "priority": "high" if cards_due > 10 else "medium"
        })
    
    if overdue_tasks > 0:
        insights.append({
            "type": "tasks",
            "message": f"You have {overdue_tasks} overdue tasks",
            "action": "Review and update tasks",
            "priority": "high"
        })
    
    if tasks_due_today > 0:
        insights.append({
            "type": "tasks",
            "message": f"{tasks_due_today} tasks are due today",
            "action": "Focus on today's tasks",
            "priority": "medium"
        })
    
    if total_content == 0:
        insights.append({
            "type": "onboarding",
            "message": "Your knowledge base is empty. Start by adding some content!",
            "action": "Add your first content",
            "priority": "high"
        })
    
    if not insights:
        insights.append({
            "type": "success",
            "message": "Great job! You're all caught up.",
            "action": None,
            "priority": "low"
        })
    
    return insights
