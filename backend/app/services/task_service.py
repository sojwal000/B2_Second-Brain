"""
Task Service
Handles task extraction and management
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Content, Task, TaskStatus, TaskPriority
from app.services.ai_service import AIService
from app.schemas.schemas import TaskResponse

logger = logging.getLogger(__name__)


class TaskService:
    """Service for task extraction and management."""
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.ai_service = AIService()
    
    async def extract_from_content(
        self,
        content: Content,
        auto_save: bool = True
    ) -> List[TaskResponse]:
        """Extract tasks/action items from content using AI."""
        
        text = content.text_content or content.summary or ""
        
        if not text:
            logger.warning(f"No text content for task extraction: {content.id}")
            return []
        
        try:
            # Extract tasks using AI
            extracted = await self.ai_service.extract_tasks(text[:8000])
            
            tasks = []
            for task_data in extracted:
                # Parse priority
                priority = self._parse_priority(task_data.get("priority", "medium"))
                
                # Parse due date
                due_date = self._parse_due_date(task_data.get("due_date"))
                
                task = Task(
                    user_id=self.user_id,
                    content_id=content.id,
                    title=task_data.get("title", "Untitled Task")[:255],
                    description=task_data.get("description"),
                    status=TaskStatus.TODO,
                    priority=priority,
                    due_date=due_date,
                    category=task_data.get("category"),
                    is_ai_extracted=True
                )
                
                if auto_save:
                    self.db.add(task)
                
                tasks.append(task)
            
            if auto_save:
                await self.db.commit()
                for task in tasks:
                    await self.db.refresh(task)
            
            return [
                TaskResponse(
                    id=t.id if t.id else 0,
                    title=t.title,
                    description=t.description,
                    status=t.status,
                    priority=t.priority,
                    due_date=t.due_date,
                    category=t.category,
                    content_id=t.content_id,
                    is_ai_extracted=t.is_ai_extracted,
                    created_at=t.created_at or datetime.utcnow()
                )
                for t in tasks
            ]
            
        except Exception as e:
            logger.error(f"Task extraction failed: {e}")
            raise
    
    async def extract_from_text(
        self,
        text: str,
        auto_save: bool = True
    ) -> List[TaskResponse]:
        """Extract tasks from arbitrary text."""
        
        try:
            extracted = await self.ai_service.extract_tasks(text[:8000])
            
            tasks = []
            for task_data in extracted:
                priority = self._parse_priority(task_data.get("priority", "medium"))
                due_date = self._parse_due_date(task_data.get("due_date"))
                
                task = Task(
                    user_id=self.user_id,
                    title=task_data.get("title", "Untitled Task")[:255],
                    description=task_data.get("description"),
                    status=TaskStatus.TODO,
                    priority=priority,
                    due_date=due_date,
                    category=task_data.get("category"),
                    is_ai_extracted=True
                )
                
                if auto_save:
                    self.db.add(task)
                
                tasks.append(task)
            
            if auto_save:
                await self.db.commit()
                for task in tasks:
                    await self.db.refresh(task)
            
            return [
                TaskResponse(
                    id=t.id if t.id else 0,
                    title=t.title,
                    description=t.description,
                    status=t.status,
                    priority=t.priority,
                    due_date=t.due_date,
                    category=t.category,
                    is_ai_extracted=t.is_ai_extracted,
                    created_at=t.created_at or datetime.utcnow()
                )
                for t in tasks
            ]
            
        except Exception as e:
            logger.error(f"Text task extraction failed: {e}")
            raise
    
    async def suggest_priority(self, task_title: str, task_description: str = None) -> str:
        """Use AI to suggest priority for a task."""
        
        prompt = f"""Analyze this task and suggest a priority level (high, medium, or low):

Task: {task_title}
{f'Description: {task_description}' if task_description else ''}

Consider:
- Urgency
- Importance
- Typical deadlines for such tasks

Respond with just one word: high, medium, or low."""
        
        try:
            response = await self.ai_service.generate(
                prompt=prompt,
                max_tokens=10,
                temperature=0.3
            )
            
            priority = response.strip().lower()
            if priority in ["high", "medium", "low"]:
                return priority
            return "medium"
            
        except Exception as e:
            logger.error(f"Priority suggestion failed: {e}")
            return "medium"
    
    async def suggest_due_date(self, task_title: str, task_description: str = None) -> Optional[str]:
        """Use AI to suggest a due date for a task."""
        
        prompt = f"""Analyze this task and suggest a reasonable due date:

Task: {task_title}
{f'Description: {task_description}' if task_description else ''}
Current date: {datetime.utcnow().strftime('%Y-%m-%d')}

Consider typical timeframes for such tasks.
Respond with a date in YYYY-MM-DD format, or 'none' if no specific date is appropriate."""
        
        try:
            response = await self.ai_service.generate(
                prompt=prompt,
                max_tokens=20,
                temperature=0.3
            )
            
            date_str = response.strip()
            if date_str.lower() == "none":
                return None
            
            # Validate date format
            datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
            
        except Exception as e:
            logger.error(f"Due date suggestion failed: {e}")
            return None
    
    def _parse_priority(self, priority_str: str) -> TaskPriority:
        """Parse priority string to enum."""
        mapping = {
            "high": TaskPriority.HIGH,
            "medium": TaskPriority.MEDIUM,
            "low": TaskPriority.LOW,
            "urgent": TaskPriority.URGENT
        }
        return mapping.get(priority_str.lower(), TaskPriority.MEDIUM)
    
    def _parse_due_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse due date string to datetime."""
        if not date_str:
            return None
        
        try:
            # Try ISO format first
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            pass
        
        try:
            # Try YYYY-MM-DD
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            pass
        
        return None
