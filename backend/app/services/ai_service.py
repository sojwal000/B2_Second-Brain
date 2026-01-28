"""
AI Service
Handles LLM interactions for summarization, entity extraction, and generation
Uses Google Gemini only.
"""

import logging
from typing import Optional, List, Dict, Any
import asyncio
import json

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI/LLM operations using Google Gemini."""
    
    def __init__(self):
        # Fail fast if API key is missing
        if not settings.GOOGLE_API_KEY:
            raise RuntimeError("GOOGLE_API_KEY is required but not set. Check your .env file.")
        
        self.provider = settings.AI_PROVIDER
        self.model = settings.GEMINI_MODEL
        self._client = None
        logger.info(f"AIService initialized: provider={self.provider}, model={self.model}")
    
    async def _get_client(self):
        """Get or create the Gemini client."""
        if self._client:
            return self._client
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self._client = genai.GenerativeModel(self.model)
            logger.info(f"Initialized Gemini model: {self.model}")
        except ImportError:
            logger.error("google-generativeai not installed. Run: pip install google-generativeai")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            raise
        
        return self._client
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> str:
        """Generate text using Gemini."""
        client = await self._get_client()
        
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            response = await asyncio.to_thread(
                client.generate_content,
                full_prompt,
                generation_config={
                    "max_output_tokens": max_tokens,
                    "temperature": temperature
                }
            )
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise
    
    async def summarize(
        self,
        text: str,
        max_length: int = 500,
        style: str = "concise"
    ) -> str:
        """Generate a summary of the text."""
        if len(text) < max_length:
            return text
        
        system_prompt = """You are a helpful assistant that creates clear, accurate summaries.
Focus on the key points and main ideas. Be concise but comprehensive."""
        
        prompt = f"""Please summarize the following text in approximately {max_length} characters.
Style: {style}

Text:
{text[:10000]}  # Limit input length

Summary:"""
        
        try:
            summary = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_length // 3,  # Rough estimate
                temperature=0.3
            )
            return summary.strip()
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            # Return truncated text as fallback
            return text[:max_length] + "..."
    
    async def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities, keywords, and topics from text."""
        system_prompt = """You are an expert at extracting structured information from text.
Extract and categorize entities, keywords, and topics.
Return your response as valid JSON."""
        
        prompt = f"""Analyze the following text and extract:
1. keywords: List of 5-10 important keywords
2. topics: List of 2-5 main topics/themes
3. entities: Named entities (people, places, organizations, concepts)
4. key_phrases: 3-5 important phrases or sentences

Text:
{text[:5000]}

Respond with a JSON object containing these fields."""
        
        try:
            response = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=1024,
                temperature=0.2
            )
            
            # Parse JSON from response
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]
            
            return json.loads(json_match)
        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            return {
                "keywords": [],
                "topics": [],
                "entities": {},
                "key_phrases": []
            }
    
    async def generate_questions(
        self,
        text: str,
        count: int = 5,
        question_types: List[str] = None
    ) -> List[Dict[str, str]]:
        """Generate study questions from text."""
        question_types = question_types or ["factual", "conceptual", "analytical"]
        
        system_prompt = """You are an expert educator creating study questions.
Generate questions that test understanding at different levels.
Include both simple recall and deeper comprehension questions."""
        
        prompt = f"""Based on the following text, generate {count} study questions.
Include a mix of question types: {', '.join(question_types)}

For each question, provide:
- question: The question text
- answer: The expected answer
- type: The type of question
- difficulty: easy, medium, or hard

Text:
{text[:5000]}

Respond with a JSON array of question objects."""
        
        try:
            response = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=2048,
                temperature=0.5
            )
            
            # Parse JSON
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]
            
            questions = json.loads(json_match)
            return questions if isinstance(questions, list) else []
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return []
    
    async def generate_flashcards(
        self,
        text: str,
        count: int = 10,
        card_types: List[str] = None
    ) -> List[Dict[str, str]]:
        """Generate flashcards from text."""
        card_types = card_types or ["basic", "cloze"]
        
        system_prompt = """You are an expert at creating effective flashcards for learning.
Create cards that:
- Focus on key concepts and facts
- Are clear and unambiguous
- Test understanding, not just memorization
- Use active recall principles"""
        
        prompt = f"""Create {count} flashcards from the following text.
Card types to include: {', '.join(card_types)}

For each flashcard, provide:
- front: The question or prompt
- back: The answer
- type: basic or cloze
- explanation: Brief explanation of why this is important (optional)

Text:
{text[:5000]}

Respond with a JSON array of flashcard objects."""
        
        try:
            response = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=2048,
                temperature=0.5
            )
            
            # Parse JSON
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]
            
            cards = json.loads(json_match)
            return cards if isinstance(cards, list) else []
        except Exception as e:
            logger.error(f"Flashcard generation failed: {e}")
            return []
    
    async def extract_tasks(self, text: str) -> List[Dict[str, Any]]:
        """Extract action items and tasks from text."""
        system_prompt = """You are an expert at identifying action items and tasks in text.
Look for:
- Explicit to-do items
- Implied actions ("need to", "should", "must")
- Deadlines and due dates
- Priorities and urgency"""
        
        prompt = f"""Extract all action items and tasks from the following text.

For each task, provide:
- title: Brief task description
- description: Additional details if any
- priority: high, medium, or low
- due_date: If mentioned (in ISO format YYYY-MM-DD, or null)
- category: General category of the task

Text:
{text[:5000]}

Respond with a JSON array of task objects."""
        
        try:
            response = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=1024,
                temperature=0.3
            )
            
            # Parse JSON
            json_match = response
            if "```json" in response:
                json_match = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_match = response.split("```")[1].split("```")[0]
            
            tasks = json.loads(json_match)
            return tasks if isinstance(tasks, list) else []
        except Exception as e:
            logger.error(f"Task extraction failed: {e}")
            return []
    
    async def answer_question(
        self,
        question: str,
        context: str,
        context_style: str = "self"
    ) -> Dict[str, Any]:
        """Answer a question based on provided context (RAG)."""
        style_prompts = {
            "self": "The context is from the user's personal notes. Answer as if helping them recall their own knowledge.",
            "professor": "Answer like a knowledgeable professor, explaining concepts clearly with examples.",
            "tutor": "Answer like a patient tutor, breaking down concepts step by step.",
            "friend": "Answer casually like a knowledgeable friend would."
        }
        
        system_prompt = f"""You are a helpful assistant answering questions based on the user's knowledge base.
{style_prompts.get(context_style, style_prompts['self'])}

Important:
- Only use information from the provided context
- If the answer isn't in the context, say so
- Cite specific parts of the context when possible
- Be accurate and helpful"""
        
        prompt = f"""Context from knowledge base:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above."""
        
        try:
            answer = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=1024,
                temperature=0.4
            )
            
            return {
                "answer": answer.strip(),
                "model": self.model,
                "context_style": context_style
            }
        except Exception as e:
            logger.error(f"Question answering failed: {e}")
            raise
    
    async def generate_follow_up_questions(
        self,
        question: str,
        answer: str,
        context: str
    ) -> List[str]:
        """Generate follow-up questions based on Q&A."""
        prompt = f"""Based on this question and answer, suggest 3 follow-up questions the user might want to ask.

Original Question: {question}
Answer: {answer}

The questions should:
- Build on the original topic
- Explore related concepts
- Help deepen understanding

Return just the questions, one per line."""
        
        try:
            response = await self.generate(
                prompt=prompt,
                max_tokens=256,
                temperature=0.6
            )
            
            questions = [q.strip().lstrip("- ").lstrip("1234567890.") for q in response.strip().split("\n") if q.strip()]
            return questions[:3]
        except Exception as e:
            logger.error(f"Follow-up generation failed: {e}")
            return []
