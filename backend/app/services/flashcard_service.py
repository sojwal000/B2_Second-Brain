"""
Flashcard Service
Handles flashcard generation and management
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Content, Flashcard, Deck, CardType, MasteryLevel
from app.services.ai_service import AIService
from app.schemas.schemas import FlashcardResponse

logger = logging.getLogger(__name__)


class FlashcardService:
    """Service for flashcard operations."""
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.ai_service = AIService()
    
    async def generate_from_content(
        self,
        content: Content,
        deck_id: int,
        count: int = 10,
        card_types: List[str] = None,
        difficulty: str = "medium"
    ) -> List[FlashcardResponse]:
        """Generate flashcards from content using AI."""
        
        card_types = card_types or ["basic", "cloze"]
        
        # Get text content
        text = content.text_content or content.summary or ""
        
        if not text:
            logger.warning(f"No text content for flashcard generation: {content.id}")
            return []
        
        try:
            # Generate flashcards using AI
            generated = await self.ai_service.generate_flashcards(
                text=text[:8000],  # Limit input
                count=count,
                card_types=card_types
            )
            
            # Create flashcard objects
            flashcards = []
            for card_data in generated:
                card_type = CardType.CLOZE if card_data.get("type") == "cloze" else CardType.BASIC
                
                flashcard = Flashcard(
                    deck_id=deck_id,
                    user_id=self.user_id,
                    content_id=content.id,
                    question=card_data.get("front", card_data.get("question", "")),
                    answer=card_data.get("back", card_data.get("answer", "")),
                    explanation=card_data.get("explanation"),
                    card_type=card_type,
                    difficulty=self._map_difficulty(difficulty) if difficulty else 0.0,
                    next_review=datetime.utcnow(),
                    ai_generated=True
                )
                
                self.db.add(flashcard)
                flashcards.append(flashcard)
            
            # Update deck card count
            result = await self.db.execute(
                select(Deck).where(Deck.id == deck_id)
            )
            deck = result.scalar_one_or_none()
            if deck:
                deck.card_count += len(flashcards)
            
            await self.db.commit()
            
            # Refresh to get IDs
            for fc in flashcards:
                await self.db.refresh(fc)
            
            return [FlashcardResponse.model_validate(fc) for fc in flashcards]
            
        except Exception as e:
            logger.error(f"Flashcard generation failed: {e}")
            raise
    
    async def generate_from_text(
        self,
        text: str,
        deck_id: int,
        count: int = 10,
        card_types: List[str] = None
    ) -> List[FlashcardResponse]:
        """Generate flashcards from arbitrary text."""
        
        card_types = card_types or ["basic"]
        
        try:
            generated = await self.ai_service.generate_flashcards(
                text=text[:8000],
                count=count,
                card_types=card_types
            )
            
            flashcards = []
            for card_data in generated:
                flashcard = Flashcard(
                    deck_id=deck_id,
                    user_id=self.user_id,
                    front=card_data.get("front", ""),
                    back=card_data.get("back", ""),
                    explanation=card_data.get("explanation"),
                    card_type=CardType.BASIC,
                    ease_factor=2.5,
                    interval=0,
                    repetitions=0,
                    next_review=datetime.utcnow(),
                    is_ai_generated=True
                )
                
                self.db.add(flashcard)
                flashcards.append(flashcard)
            
            await self.db.commit()
            
            for fc in flashcards:
                await self.db.refresh(fc)
            
            return [
                FlashcardResponse(
                    id=fc.id,
                    deck_id=fc.deck_id,
                    front=fc.front,
                    back=fc.back,
                    explanation=fc.explanation,
                    card_type=fc.card_type,
                    mastery_level=fc.mastery_level,
                    next_review=fc.next_review,
                    is_ai_generated=fc.is_ai_generated
                )
                for fc in flashcards
            ]
            
        except Exception as e:
            logger.error(f"Text flashcard generation failed: {e}")
            raise
    
    async def improve_flashcard(
        self,
        flashcard: Flashcard
    ) -> Dict[str, str]:
        """Use AI to suggest improvements to a flashcard."""
        
        prompt = f"""Review this flashcard and suggest improvements:

Front: {flashcard.front}
Back: {flashcard.back}

Provide:
1. An improved version of the front (question/prompt)
2. An improved version of the back (answer)
3. A brief explanation of the improvements

Make the card clearer, more memorable, and better for learning."""
        
        try:
            response = await self.ai_service.generate(
                prompt=prompt,
                max_tokens=512,
                temperature=0.5
            )
            
            return {
                "suggestions": response,
                "original_front": flashcard.front,
                "original_back": flashcard.back
            }
            
        except Exception as e:
            logger.error(f"Flashcard improvement failed: {e}")
            return {
                "suggestions": "Unable to generate suggestions.",
                "original_front": flashcard.front,
                "original_back": flashcard.back
            }
    
    def _map_difficulty(self, difficulty: str) -> float:
        """Map difficulty string to numeric value."""
        mapping = {
            "easy": 0.2,
            "medium": 0.5,
            "hard": 0.8
        }
        return mapping.get(difficulty.lower(), 0.5)
