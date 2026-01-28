"""
Flashcards API Routes
Handles deck management, flashcard CRUD, and spaced repetition review
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.core.background_tasks import submit_task, TaskPriority
from app.models.database import (
    Deck, Flashcard, FlashcardReview, Content,
    CardType, MasteryLevel
)
from app.schemas.schemas import (
    DeckCreate, DeckUpdate, DeckResponse, DeckListResponse,
    FlashcardCreate, FlashcardUpdate, FlashcardResponse,
    ReviewRequest, ReviewResponse, ReviewStats,
    GenerateFlashcardsRequest, GenerateFlashcardsResponse,
    SuccessResponse, PaginatedResponse
)

router = APIRouter()


# ============================================================================
# Deck Management
# ============================================================================

@router.post("/decks", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(
    deck_data: DeckCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new flashcard deck."""
    from sqlalchemy.exc import IntegrityError
    
    # Check if deck with same name exists
    existing = await db.execute(
        select(Deck).where(Deck.user_id == user_id, Deck.name == deck_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A deck named '{deck_data.name}' already exists"
        )
    
    deck = Deck(
        user_id=user_id,
        name=deck_data.name,
        description=deck_data.description,
        color=deck_data.color,
        icon=deck_data.icon
    )
    
    try:
        db.add(deck)
        await db.commit()
        await db.refresh(deck)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A deck named '{deck_data.name}' already exists"
        )
    
    return await _get_deck_response(db, deck)


@router.get("/decks", response_model=PaginatedResponse)
async def list_decks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    subject: Optional[str] = None,
    search: Optional[str] = None,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's flashcard decks."""
    query = select(Deck).where(Deck.user_id == user_id)
    
    if subject:
        query = query.where(Deck.subject == subject)
    
    if search:
        query = query.where(
            or_(
                Deck.name.ilike(f"%{search}%"),
                Deck.description.ilike(f"%{search}%")
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Deck.updated_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    decks = result.scalars().all()
    
    items = []
    for deck in decks:
        items.append(await _get_deck_list_response(db, deck))
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedResponse(
        items=[d.model_dump() for d in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/decks/{deck_id}", response_model=DeckResponse)
async def get_deck(
    deck_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get deck details with flashcards."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    deck = result.scalar_one_or_none()
    
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    return await _get_deck_response(db, deck)


@router.patch("/decks/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int,
    update_data: DeckUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update deck metadata."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    deck = result.scalar_one_or_none()
    
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(deck, field, value)
    
    await db.commit()
    await db.refresh(deck)
    
    return await _get_deck_response(db, deck)


@router.delete("/decks/{deck_id}", response_model=SuccessResponse)
async def delete_deck(
    deck_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete deck and all its flashcards."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    deck = result.scalar_one_or_none()
    
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    await db.delete(deck)
    await db.commit()
    
    return SuccessResponse(message="Deck deleted successfully")


# ============================================================================
# Flashcard Management
# ============================================================================

@router.post("/decks/{deck_id}/cards", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(
    deck_id: int,
    card_data: FlashcardCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new flashcard in a deck."""
    # Verify deck ownership
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    deck = result.scalar_one_or_none()
    
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    flashcard = Flashcard(
        deck_id=deck_id,
        user_id=user_id,
        content_id=card_data.content_id,
        question=card_data.question,
        answer=card_data.answer,
        explanation=card_data.explanation,
        card_type=card_data.card_type,
        tags=card_data.tags,
        subject=card_data.subject,
        next_review=datetime.utcnow()
    )
    
    db.add(flashcard)
    deck.card_count += 1
    await db.commit()
    await db.refresh(flashcard)
    
    return flashcard


@router.get("/decks/{deck_id}/cards", response_model=List[FlashcardResponse])
async def list_flashcards_in_deck(
    deck_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all flashcards in a deck."""
    # Verify deck ownership
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    # Get all cards in deck
    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id, Flashcard.user_id == user_id)
        .order_by(Flashcard.created_at.desc())
    )
    cards = result.scalars().all()
    
    return cards


@router.get("/cards/{card_id}", response_model=FlashcardResponse)
async def get_flashcard(
    card_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get flashcard details."""
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    return card


@router.patch("/cards/{card_id}", response_model=FlashcardResponse)
async def update_flashcard(
    card_id: int,
    update_data: FlashcardUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update flashcard content."""
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(card, field, value)
    
    await db.commit()
    await db.refresh(card)
    
    return card


@router.delete("/cards/{card_id}", response_model=SuccessResponse)
async def delete_flashcard(
    card_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a flashcard."""
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    # Update deck count
    deck_result = await db.execute(select(Deck).where(Deck.id == card.deck_id))
    deck = deck_result.scalar_one_or_none()
    if deck:
        deck.card_count = max(0, deck.card_count - 1)
    
    await db.delete(card)
    await db.commit()
    
    return SuccessResponse(message="Flashcard deleted successfully")


# ============================================================================
# Review Session
# ============================================================================

@router.get("/decks/{deck_id}/review", response_model=List[FlashcardResponse])
async def get_review_cards(
    deck_id: int,
    limit: int = Query(20, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get cards due for review in a deck."""
    # Verify deck ownership
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    # Get due cards
    now = datetime.utcnow()
    result = await db.execute(
        select(Flashcard)
        .where(
            Flashcard.deck_id == deck_id,
            Flashcard.user_id == user_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
        .order_by(Flashcard.next_review.asc())
        .limit(limit)
    )
    cards = result.scalars().all()
    
    return cards


@router.get("/review/all", response_model=List[FlashcardResponse])
async def get_all_review_cards(
    limit: int = Query(20, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all cards due for review across all decks."""
    now = datetime.utcnow()
    result = await db.execute(
        select(Flashcard)
        .where(
            Flashcard.user_id == user_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
        .order_by(Flashcard.next_review.asc())
        .limit(limit)
    )
    cards = result.scalars().all()
    
    return cards


@router.post("/cards/{card_id}/review", response_model=ReviewResponse)
async def review_flashcard(
    card_id: int,
    review: ReviewRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Submit review result for a flashcard using simplified spaced repetition."""
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    # Get rating (1=Again, 2=Hard, 3=Good, 4=Easy)
    rating = review.rating
    
    # Store state before review
    stability_before = card.stability
    difficulty_before = card.difficulty
    
    # Simple spaced repetition algorithm
    # Base interval multipliers based on rating
    if rating == 1:  # Again
        new_interval = 0.0  # Review again soon (10 minutes)
        card.lapses += 1
        card.streak = 0
        card.stability = max(0.1, card.stability * 0.5)  # Reduce stability
        card.difficulty = min(1.0, card.difficulty + 0.1)  # Increase difficulty
        mastery = MasteryLevel.NEW
    elif rating == 2:  # Hard
        new_interval = max(1.0, card.stability * 1.2)
        card.streak = 0
        card.difficulty = min(1.0, card.difficulty + 0.05)
        mastery = MasteryLevel.LEARNING
    elif rating == 3:  # Good
        new_interval = max(1.0, card.stability * 2.5)
        card.streak += 1
        card.stability = new_interval
        mastery = MasteryLevel.YOUNG if new_interval < 21 else MasteryLevel.MATURE
    else:  # Easy (4)
        new_interval = max(1.0, card.stability * 3.5)
        card.streak += 1
        card.stability = new_interval
        card.difficulty = max(0.0, card.difficulty - 0.05)
        mastery = MasteryLevel.YOUNG if new_interval < 21 else MasteryLevel.MATURE
    
    # Calculate next review date
    if new_interval == 0:
        next_review_date = datetime.utcnow() + timedelta(minutes=10)
    else:
        next_review_date = datetime.utcnow() + timedelta(days=new_interval)
    
    # Update card
    card.next_review = next_review_date
    card.last_review = datetime.utcnow()
    card.review_count += 1
    card.mastery_level = mastery
    
    if review.response_time_ms:
        # Update average response time
        if card.average_response_time_ms == 0:
            card.average_response_time_ms = review.response_time_ms
        else:
            card.average_response_time_ms = (card.average_response_time_ms + review.response_time_ms) / 2
    
    # Create review record
    review_record = FlashcardReview(
        flashcard_id=card_id,
        rating=rating,
        response_time_ms=review.response_time_ms,
        stability_before=stability_before,
        difficulty_before=difficulty_before,
        stability_after=card.stability,
        difficulty_after=card.difficulty,
        scheduled_days=new_interval
    )
    db.add(review_record)
    
    await db.commit()
    await db.refresh(card)
    
    return ReviewResponse(
        card_id=card_id,
        new_interval=new_interval,
        next_review=next_review_date,
        mastery_level=mastery.value,
        ease_factor=card.stability  # Use stability as ease factor for compatibility
    )


# ============================================================================
# Review Statistics
# ============================================================================

@router.get("/stats", response_model=ReviewStats)
async def get_review_stats(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get overall review statistics."""
    now = datetime.utcnow()
    
    # Total cards
    total_result = await db.execute(
        select(func.count()).where(Flashcard.user_id == user_id)
    )
    total_cards = total_result.scalar() or 0
    
    # Due today
    due_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    due_today = due_result.scalar() or 0
    
    # Reviewed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    reviewed_result = await db.execute(
        select(func.count()).where(
            FlashcardReview.user_id == user_id,
            FlashcardReview.created_at >= today_start
        )
    )
    reviewed_today = reviewed_result.scalar() or 0
    
    # Mastery distribution
    mastery_result = await db.execute(
        select(Flashcard.mastery_level, func.count())
        .where(Flashcard.user_id == user_id)
        .group_by(Flashcard.mastery_level)
    )
    mastery_dist = {str(row[0].value): row[1] for row in mastery_result.all()}
    
    # Average accuracy
    correct_result = await db.execute(
        select(func.sum(Flashcard.correct_count), func.sum(Flashcard.total_reviews))
        .where(Flashcard.user_id == user_id)
    )
    correct_sum, total_reviews = correct_result.one()
    accuracy = (correct_sum / total_reviews * 100) if total_reviews and total_reviews > 0 else 0
    
    return ReviewStats(
        total_cards=total_cards,
        due_today=due_today,
        reviewed_today=reviewed_today,
        mastery_distribution=mastery_dist,
        average_accuracy=round(accuracy, 1),
        streak_days=0  # Would need to implement streak tracking
    )


@router.get("/decks/{deck_id}/stats", response_model=ReviewStats)
async def get_deck_stats(
    deck_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific deck."""
    # Verify deck ownership
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )
    
    now = datetime.utcnow()
    
    # Total cards in deck
    total_result = await db.execute(
        select(func.count()).where(Flashcard.deck_id == deck_id)
    )
    total_cards = total_result.scalar() or 0
    
    # Due today
    due_result = await db.execute(
        select(func.count()).where(
            Flashcard.deck_id == deck_id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    due_today = due_result.scalar() or 0
    
    # Mastery distribution
    mastery_result = await db.execute(
        select(Flashcard.mastery_level, func.count())
        .where(Flashcard.deck_id == deck_id)
        .group_by(Flashcard.mastery_level)
    )
    mastery_dist = {str(row[0].value): row[1] for row in mastery_result.all()}
    
    return ReviewStats(
        total_cards=total_cards,
        due_today=due_today,
        reviewed_today=0,
        mastery_distribution=mastery_dist,
        average_accuracy=0,
        streak_days=0
    )


# ============================================================================
# AI Flashcard Generation
# ============================================================================

@router.post("/generate", response_model=GenerateFlashcardsResponse)
async def generate_flashcards(
    request: GenerateFlashcardsRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Generate flashcards from content using AI."""
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
    
    # Get or create deck
    if request.deck_id:
        result = await db.execute(
            select(Deck).where(Deck.id == request.deck_id, Deck.user_id == user_id)
        )
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deck not found"
            )
    else:
        # Create new deck from content title
        deck = Deck(
            user_id=user_id,
            name=f"Flashcards: {content.title[:50]}",
            description=f"Auto-generated from: {content.title}"
        )
        db.add(deck)
        await db.commit()
        await db.refresh(deck)
    
    # Generate flashcards using AI
    from app.services.flashcard_service import FlashcardService
    fc_service = FlashcardService(db, user_id)
    
    try:
        generated = await fc_service.generate_from_content(
            content=content,
            deck_id=deck.id,
            count=request.num_cards,
            card_types=request.card_types,
            difficulty=request.difficulty
        )
        
        return GenerateFlashcardsResponse(
            deck_id=deck.id,
            deck_name=deck.name,
            cards_generated=len(generated),
            flashcards=generated
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate flashcards: {str(e)}"
        )


# ============================================================================
# Helper Functions
# ============================================================================

async def _get_deck_response(db: AsyncSession, deck: Deck) -> DeckResponse:
    """Build DeckResponse with card statistics."""
    now = datetime.utcnow()
    
    # Get due count
    due_result = await db.execute(
        select(func.count()).where(
            Flashcard.deck_id == deck.id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    due_count = due_result.scalar() or 0
    
    # Get mastery counts (mature cards are considered mastered)
    mastered_result = await db.execute(
        select(func.count()).where(
            Flashcard.deck_id == deck.id,
            Flashcard.mastery_level == MasteryLevel.MATURE
        )
    )
    mastered_count = mastered_result.scalar() or 0
    
    return DeckResponse(
        id=deck.id,
        user_id=deck.user_id,
        name=deck.name,
        description=deck.description,
        color=deck.color,
        icon=deck.icon,
        card_count=deck.card_count,
        new_count=deck.new_count,
        due_count=due_count,
        last_studied=deck.last_studied,
        created_at=deck.created_at,
        updated_at=deck.updated_at
    )


async def _get_deck_list_response(db: AsyncSession, deck: Deck) -> DeckListResponse:
    """Build DeckListResponse with basic stats."""
    now = datetime.utcnow()
    
    due_result = await db.execute(
        select(func.count()).where(
            Flashcard.deck_id == deck.id,
            Flashcard.is_suspended == False,
            Flashcard.next_review <= now
        )
    )
    due_count = due_result.scalar() or 0
    
    return DeckListResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        card_count=deck.card_count,
        due_count=due_count,
        color=deck.color,
        icon=deck.icon,
        created_at=deck.created_at
    )
