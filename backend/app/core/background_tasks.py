"""
Background Task Manager
Replaces Celery/Redis for development.
Uses asyncio for async task processing.
"""

import asyncio
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor

from app.core.config import settings

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Task execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    """Task priority levels."""
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class TaskResult:
    """Result of a background task."""
    task_id: str
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


@dataclass
class Task:
    """Background task definition."""
    id: str
    name: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def to_result(self) -> TaskResult:
        return TaskResult(
            task_id=self.id,
            status=self.status,
            result=self.result,
            error=self.error,
            started_at=self.started_at,
            completed_at=self.completed_at
        )


class BackgroundTaskManager:
    """
    Manages background task execution using asyncio.
    Replacement for Celery in development.
    """
    
    def __init__(
        self,
        max_concurrent: int = 5,
        max_queue_size: int = 1000
    ):
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        self.tasks: Dict[str, Task] = {}
        self.queue: asyncio.PriorityQueue = None
        self.running = False
        self.workers: List[asyncio.Task] = []
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
        self._lock = asyncio.Lock()
    
    async def start(self):
        """Start the task manager."""
        if self.running:
            return
        
        self.running = True
        self.queue = asyncio.PriorityQueue(maxsize=self.max_queue_size)
        
        # Start worker tasks
        for i in range(self.max_concurrent):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        
        logger.info(f"Background task manager started with {self.max_concurrent} workers")
    
    async def stop(self):
        """Stop the task manager gracefully."""
        if not self.running:
            return
        
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        
        # Shutdown thread executor
        self.executor.shutdown(wait=True)
        
        logger.info("Background task manager stopped")
    
    async def _worker(self, worker_name: str):
        """Worker coroutine that processes tasks from the queue."""
        logger.info(f"{worker_name} started")
        
        while self.running:
            try:
                # Wait for a task with timeout
                try:
                    priority, task_id = await asyncio.wait_for(
                        self.queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Get task details
                async with self._lock:
                    task = self.tasks.get(task_id)
                    if not task or task.status == TaskStatus.CANCELLED:
                        continue
                    task.status = TaskStatus.RUNNING
                    task.started_at = datetime.utcnow()
                
                logger.info(f"{worker_name} executing task: {task.name} ({task_id})")
                
                try:
                    # Execute the task
                    if asyncio.iscoroutinefunction(task.func):
                        result = await task.func(*task.args, **task.kwargs)
                    else:
                        # Run sync functions in thread pool
                        loop = asyncio.get_event_loop()
                        result = await loop.run_in_executor(
                            self.executor,
                            lambda: task.func(*task.args, **task.kwargs)
                        )
                    
                    async with self._lock:
                        task.result = result
                        task.status = TaskStatus.COMPLETED
                        task.completed_at = datetime.utcnow()
                    
                    logger.info(f"{worker_name} completed task: {task.name} ({task_id})")
                    
                except Exception as e:
                    async with self._lock:
                        task.error = str(e)
                        task.status = TaskStatus.FAILED
                        task.completed_at = datetime.utcnow()
                    
                    logger.error(
                        f"{worker_name} failed task: {task.name} ({task_id}): {e}\n"
                        f"{traceback.format_exc()}"
                    )
                
                finally:
                    self.queue.task_done()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"{worker_name} error: {e}")
        
        logger.info(f"{worker_name} stopped")
    
    async def submit(
        self,
        func: Callable,
        *args,
        name: Optional[str] = None,
        priority: TaskPriority = TaskPriority.MEDIUM,
        **kwargs
    ) -> str:
        """
        Submit a task for background execution.
        Returns the task ID.
        """
        task_id = str(uuid.uuid4())
        task_name = name or func.__name__
        
        task = Task(
            id=task_id,
            name=task_name,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority
        )
        
        async with self._lock:
            self.tasks[task_id] = task
        
        # Add to queue with priority (lower priority value = higher priority)
        await self.queue.put((-priority.value, task_id))
        
        logger.info(f"Task submitted: {task_name} ({task_id})")
        return task_id
    
    async def get_status(self, task_id: str) -> Optional[TaskResult]:
        """Get the status of a task."""
        async with self._lock:
            task = self.tasks.get(task_id)
            if task:
                return task.to_result()
        return None
    
    async def cancel(self, task_id: str) -> bool:
        """Cancel a pending task."""
        async with self._lock:
            task = self.tasks.get(task_id)
            if task and task.status == TaskStatus.PENDING:
                task.status = TaskStatus.CANCELLED
                logger.info(f"Task cancelled: {task.name} ({task_id})")
                return True
        return False
    
    async def get_pending_count(self) -> int:
        """Get number of pending tasks."""
        return self.queue.qsize() if self.queue else 0
    
    async def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove completed/failed tasks older than max_age_hours."""
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        removed = 0
        
        async with self._lock:
            to_remove = []
            for task_id, task in self.tasks.items():
                if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                    if task.completed_at and task.completed_at < cutoff:
                        to_remove.append(task_id)
            
            for task_id in to_remove:
                del self.tasks[task_id]
                removed += 1
        
        if removed > 0:
            logger.info(f"Cleaned up {removed} old tasks")
        
        return removed


from datetime import timedelta

# Global task manager instance
task_manager = BackgroundTaskManager(
    max_concurrent=settings.MAX_CONCURRENT_TASKS,
    max_queue_size=1000
)


# ============================================================================
# Convenience Functions
# ============================================================================

async def submit_task(
    func: Callable,
    *args,
    name: Optional[str] = None,
    priority: TaskPriority = TaskPriority.MEDIUM,
    **kwargs
) -> str:
    """Submit a task for background execution."""
    return await task_manager.submit(
        func, *args,
        name=name,
        priority=priority,
        **kwargs
    )


async def get_task_status(task_id: str) -> Optional[TaskResult]:
    """Get the status of a background task."""
    return await task_manager.get_status(task_id)


async def cancel_task(task_id: str) -> bool:
    """Cancel a pending background task."""
    return await task_manager.cancel(task_id)
