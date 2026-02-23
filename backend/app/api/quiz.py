"""
Quiz API Routes
AI-powered quiz generation from content with MCQ, True/False, Fill-in-the-blank questions.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import Content, Quiz, QuizQuestion, QuestionType
from app.schemas.schemas import (
    QuizGenerateRequest, QuizResponse, QuizListResponse,
    QuizSubmitRequest, QuizResultResponse, QuizQuestionResponse,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


# ============================================================================
# Generate Quiz
# ============================================================================

@router.post("/generate", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request: QuizGenerateRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Generate a quiz from content using AI."""
    # Verify content
    result = await db.execute(
        select(Content).where(Content.id == request.content_id, Content.user_id == user_id)
    )
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    text = content.text_content or content.summary or ""
    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content doesn't have enough text to generate a quiz"
        )

    # Build the AI prompt
    type_names = [qt.value for qt in request.question_types]
    difficulty_hint = f"\nDifficulty level: {request.difficulty}" if request.difficulty else ""

    prompt = f"""Generate exactly {request.num_questions} quiz questions from the following text.
Question types to include: {', '.join(type_names)}{difficulty_hint}

For each question, return a JSON object with:
- "type": one of {type_names}
- "question": the question text
- "options": for mcq, provide exactly 4 options as a list. For true_false, use ["True", "False"]. For fill_blank and short_answer, use an empty list [].
- "correct_answer": the correct answer (for mcq/true_false, must match one of the options exactly)
- "explanation": brief explanation of why this is correct
- "difficulty": "easy", "medium", or "hard"

Text:
{text[:6000]}

Respond with a JSON array of question objects only."""

    system_prompt = """You are an expert educator creating quiz questions for exam preparation.
Create clear, unambiguous questions that test real understanding.
For MCQ, ensure exactly one correct answer and three plausible distractors.
For true/false, make statements that are clearly true or false.
For fill_blank, use ___ to mark the blank in the question.
For short_answer, expect a brief 1-3 word answer.
Return only valid JSON."""

    from app.services.ai_service import AIService
    import json

    ai = AIService()
    try:
        response = await ai.generate(prompt=prompt, system_prompt=system_prompt, max_tokens=4096, temperature=0.5)

        # Parse JSON
        json_text = response
        if "```json" in response:
            json_text = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            json_text = response.split("```")[1].split("```")[0]

        questions_data = json.loads(json_text.strip())
        if not isinstance(questions_data, list):
            raise ValueError("Expected a JSON array")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}"
        )

    # Create quiz
    quiz = Quiz(
        user_id=user_id,
        content_id=request.content_id,
        title=f"Quiz: {content.title[:100]}",
        description=f"AI-generated quiz from: {content.title}",
        difficulty=request.difficulty,
        total_questions=len(questions_data),
    )
    db.add(quiz)
    await db.flush()

    # Create questions
    type_map = {
        "mcq": QuestionType.MCQ,
        "true_false": QuestionType.TRUE_FALSE,
        "fill_blank": QuestionType.FILL_BLANK,
        "short_answer": QuestionType.SHORT_ANSWER,
    }

    for i, qd in enumerate(questions_data):
        qt = type_map.get(qd.get("type", "mcq"), QuestionType.MCQ)
        qq = QuizQuestion(
            quiz_id=quiz.id,
            question_type=qt,
            question_text=qd.get("question", ""),
            options=qd.get("options", []),
            correct_answer=str(qd.get("correct_answer", "")),
            explanation=qd.get("explanation"),
            difficulty=qd.get("difficulty"),
            order_index=i,
        )
        db.add(qq)

    await db.commit()
    await db.refresh(quiz)

    # Load questions
    q_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)
    )
    quiz_questions = q_result.scalars().all()

    return QuizResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        content_id=quiz.content_id,
        difficulty=quiz.difficulty,
        total_questions=quiz.total_questions,
        score=quiz.score,
        completed=quiz.completed,
        completed_at=quiz.completed_at,
        created_at=quiz.created_at,
        questions=[QuizQuestionResponse.model_validate(q) for q in quiz_questions],
    )


# ============================================================================
# List Quizzes
# ============================================================================

@router.get("", response_model=PaginatedResponse)
async def list_quizzes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    completed: Optional[bool] = None,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's quizzes."""
    query = select(Quiz).where(Quiz.user_id == user_id)
    if completed is not None:
        query = query.where(Quiz.completed == completed)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.order_by(Quiz.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    quizzes = result.scalars().all()

    items = [
        QuizListResponse(
            id=qz.id,
            title=qz.title,
            content_id=qz.content_id,
            difficulty=qz.difficulty,
            total_questions=qz.total_questions,
            score=qz.score,
            completed=qz.completed,
            created_at=qz.created_at,
        ).model_dump()
        for qz in quizzes
    ]

    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


# ============================================================================
# Get Quiz Detail
# ============================================================================

@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get quiz with questions."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    q_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)
    )
    questions = q_result.scalars().all()

    return QuizResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        content_id=quiz.content_id,
        difficulty=quiz.difficulty,
        total_questions=quiz.total_questions,
        score=quiz.score,
        completed=quiz.completed,
        completed_at=quiz.completed_at,
        created_at=quiz.created_at,
        questions=[QuizQuestionResponse.model_validate(q) for q in questions],
    )


# ============================================================================
# Submit Quiz Answers
# ============================================================================

@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmitRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Submit answers and get quiz results."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    # Get all questions
    q_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id)
    )
    questions = {q.id: q for q in q_result.scalars().all()}

    # Process answers
    correct_count = 0
    answer_map = {a.question_id: a.answer for a in submission.answers}

    for qid, question in questions.items():
        user_answer = answer_map.get(qid)
        if user_answer is not None:
            question.user_answer = user_answer
            # Normalize comparison
            is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
            question.is_correct = is_correct
            if is_correct:
                correct_count += 1

    # Calculate score
    score = (correct_count / len(questions) * 100) if questions else 0
    quiz.score = round(score, 1)
    quiz.completed = True
    quiz.completed_at = datetime.utcnow()

    await db.commit()

    # Reload questions
    q_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index)
    )
    final_questions = q_result.scalars().all()

    return QuizResultResponse(
        quiz_id=quiz.id,
        score=quiz.score,
        total_questions=quiz.total_questions,
        correct_count=correct_count,
        results=[QuizQuestionResponse.model_validate(q) for q in final_questions],
    )


# ============================================================================
# Delete Quiz
# ============================================================================

@router.delete("/{quiz_id}", response_model=SuccessResponse)
async def delete_quiz(
    quiz_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a quiz."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    await db.delete(quiz)
    await db.commit()
    return SuccessResponse(message="Quiz deleted successfully")
 