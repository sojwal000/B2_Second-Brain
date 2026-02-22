"""
Pydantic Schemas for API Request/Response
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class ContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    WEB = "web"
    CODE = "code"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class CardType(str, Enum):
    BASIC = "basic"
    CLOZE = "cloze"
    IMAGE_OCCLUSION = "image_occlusion"
    AUDIO = "audio"
    CODE = "code"


class ContextStyle(str, Enum):
    TEACHER = "teacher"
    CLIENT = "client"
    SELF = "self"
    ACADEMIC = "academic"


class QuestionType(str, Enum):
    MCQ = "mcq"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    SHORT_ANSWER = "short_answer"


class LinkType(str, Enum):
    EXPLAINS = "explains"
    EXAMPLE_OF = "example_of"
    SIMILAR_TO = "similar_to"
    DEPENDS_ON = "depends_on"
    CONTRADICTS = "contradicts"
    EXTENDS = "extends"
    REFERENCES = "references"
    PART_OF = "part_of"
    CAUSED_BY = "caused_by"
    TEMPORAL = "temporal"
    USER_DEFINED = "user_defined"


# ============================================================================
# Base Schemas
# ============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    created_at: datetime
    updated_at: datetime


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)


class UserPreferences(BaseModel):
    theme: str = "system"  # light, dark, system
    mode: str = "everything"  # learning, work, research, everything
    default_context_style: ContextStyle = ContextStyle.SELF
    auto_process: bool = True
    flashcard_daily_goal: int = 20
    notifications_enabled: bool = True


class UserResponse(UserBase, TimestampMixin):
    id: int
    is_active: bool
    preferences: Dict[str, Any] = {}
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str
    password: str


# ============================================================================
# Auth Schemas
# ============================================================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


# ============================================================================
# Content Schemas
# ============================================================================

class ContentBase(BaseModel):
    title: Optional[str] = None
    tags: List[str] = []
    subject: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    context_style: ContextStyle = ContextStyle.SELF


class ContentCreateText(ContentBase):
    text_content: str = Field(..., min_length=1)


class ContentCreateWeb(ContentBase):
    url: str


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    subject: Optional[str] = None
    source: Optional[str] = None
    context_style: Optional[ContextStyle] = None
    is_favorite: Optional[bool] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=5)


class ContentEntities(BaseModel):
    people: List[str] = []
    organizations: List[str] = []
    locations: List[str] = []
    concepts: List[str] = []
    dates: List[str] = []
    products: List[str] = []
    technical_terms: List[str] = []


class ContentProcessingMetadata(BaseModel):
    ocr_confidence: Optional[float] = None
    stt_confidence: Optional[float] = None
    embedding_model: Optional[str] = None
    chunk_count: Optional[int] = None
    processing_time_ms: Optional[int] = None


class ContentResponse(ContentBase, TimestampMixin):
    id: int
    user_id: int
    content_type: ContentType
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    text_content: Optional[str] = None
    summary: Optional[str] = None
    summary_bullets: Optional[List[str]] = None
    entities: ContentEntities = ContentEntities()
    topics: List[str] = []
    sentiment: Optional[str] = None
    language: Optional[str] = None
    reading_time_minutes: Optional[int] = None
    is_favorite: bool = False
    is_pinned: bool = False
    is_archived: bool = False
    priority: int = 0
    is_processed: bool = False
    processing_status: ProcessingStatus
    processing_error: Optional[str] = None
    processing_metadata: ContentProcessingMetadata = ContentProcessingMetadata()
    view_count: int = 0
    last_accessed: Optional[datetime] = None
    content_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ContentListResponse(BaseModel):
    id: int
    title: Optional[str]
    content_type: ContentType
    summary: Optional[str]
    tags: List[str]
    subject: Optional[str]
    is_favorite: bool
    is_pinned: bool
    processing_status: ProcessingStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ContentUploadResponse(BaseModel):
    id: int
    title: Optional[str]
    content_type: ContentType
    processing_status: ProcessingStatus
    task_id: Optional[str] = None
    message: str


# ============================================================================
# Content Chunk Schemas
# ============================================================================

class ChunkResponse(BaseModel):
    id: int
    content_id: int
    chunk_index: int
    chunk_text: str
    token_count: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Task Schemas
# ============================================================================

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    tags: List[str] = []
    project: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskCreate(TaskBase):
    content_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    actual_duration_minutes: Optional[int] = None
    tags: Optional[List[str]] = None
    project: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskResponse(TaskBase, TimestampMixin):
    id: int
    user_id: int
    content_id: Optional[int]
    actual_duration_minutes: Optional[int]
    completed_at: Optional[datetime]
    is_recurring: bool
    recurrence_rule: Optional[str]
    source_quote: Optional[str]
    extraction_confidence: float
    ai_generated: bool
    
    model_config = ConfigDict(from_attributes=True)


class TaskExtractRequest(BaseModel):
    text: str


class TaskExtractResponse(BaseModel):
    tasks: List[TaskResponse]
    extraction_count: int


# Aliases for backward compatibility
ExtractTasksRequest = TaskExtractRequest
ExtractTasksResponse = TaskExtractResponse


class TaskListResponse(BaseModel):
    """Task response for list views."""
    id: int
    title: str
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    content_id: Optional[int]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Deck Schemas
# ============================================================================

class DeckBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class DeckCreate(DeckBase):
    pass


class DeckUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class DeckResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    card_count: int = 0
    new_count: int = 0
    due_count: int = 0
    last_studied: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class DeckListResponse(BaseModel):
    """Simplified deck response for list views."""
    id: int
    name: str
    description: Optional[str] = None
    card_count: int = 0
    due_count: int = 0
    color: Optional[str] = None
    icon: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    model_config = ConfigDict(from_attributes=True)



# ============================================================================
# Flashcard Schemas
# ============================================================================

class FlashcardBase(BaseModel):
    card_type: CardType = CardType.BASIC
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    explanation: Optional[str] = None
    hints: List[str] = []
    subject: Optional[str] = None
    tags: List[str] = []


class FlashcardCreate(FlashcardBase):
    deck_id: int
    content_id: Optional[int] = None


class FlashcardUpdate(BaseModel):
    question: Optional[str] = Field(None, min_length=1)
    answer: Optional[str] = Field(None, min_length=1)
    explanation: Optional[str] = None
    hints: Optional[List[str]] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None
    deck_id: Optional[int] = None
    is_suspended: Optional[bool] = None


class FlashcardResponse(FlashcardBase, TimestampMixin):
    id: int
    user_id: int
    deck_id: int
    content_id: Optional[int]
    difficulty: float
    stability: float
    retrievability: float
    last_review: Optional[datetime]
    next_review: Optional[datetime]
    review_count: int
    lapses: int
    average_response_time_ms: float
    streak: int
    mastery_level: str
    ai_generated: bool
    is_suspended: bool
    is_buried: bool
    
    model_config = ConfigDict(from_attributes=True)


class FlashcardReviewRequest(BaseModel):
    rating: int = Field(..., ge=1, le=4)  # 1=Again, 2=Hard, 3=Good, 4=Easy
    response_time_ms: Optional[int] = None


# Alias for backward compatibility
ReviewRequest = FlashcardReviewRequest


class FlashcardReviewResponse(BaseModel):
    flashcard_id: int
    next_review: datetime
    scheduled_days: float
    new_difficulty: float
    new_stability: float


class ReviewResponse(BaseModel):
    """Review response with legacy field names."""
    card_id: int
    new_interval: float
    next_review: datetime
    mastery_level: str
    ease_factor: float


class FlashcardGenerateRequest(BaseModel):
    content_id: int
    deck_id: Optional[int] = None
    num_cards: int = Field(default=10, ge=1, le=50)
    card_types: List[CardType] = [CardType.BASIC]
    difficulty: Optional[str] = None  # easy, medium, hard


# Alias for backward compatibility
GenerateFlashcardsRequest = FlashcardGenerateRequest


class FlashcardGenerateResponse(BaseModel):
    deck_id: int
    deck_name: str
    cards_generated: int
    flashcards: List[FlashcardResponse]


# Alias for backward compatibility
GenerateFlashcardsResponse = FlashcardGenerateResponse


class FlashcardDueResponse(BaseModel):
    cards: List[FlashcardResponse]
    total_due: int
    new_cards: int
    review_cards: int


class FlashcardStatsResponse(BaseModel):
    total_cards: int
    new_cards: int
    learning_cards: int
    young_cards: int
    mature_cards: int
    suspended_cards: int
    today_reviews: int
    streak_days: int
    average_accuracy: float


# Alias for backward compatibility
ReviewStats = FlashcardStatsResponse


# ============================================================================
# RAG / Assistant Schemas
# ============================================================================

class QueryConfig(BaseModel):
    max_sources: int = Field(default=5, ge=1, le=20)
    context_style: ContextStyle = ContextStyle.SELF
    include_reasoning: bool = False
    date_filter: Optional[Dict[str, str]] = None  # {"from": "2025-01-01", "to": "2025-12-31"}
    content_types: Optional[List[ContentType]] = None
    subjects: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    config: QueryConfig = QueryConfig()
    session_id: Optional[str] = None


class QuerySource(BaseModel):
    content_id: int
    title: Optional[str]
    snippet: str
    relevance_score: float
    supporting_quote: Optional[str] = None
    created_at: datetime


class QueryResponse(BaseModel):
    query_id: str
    answer: str
    confidence: float
    sources: List[QuerySource]
    reasoning_trace: Optional[str] = None
    follow_up_questions: List[str] = []
    processing_time_ms: int


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=100)
    content_types: Optional[List[ContentType]] = None
    subjects: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class SearchResult(BaseModel):
    content_id: int
    title: Optional[str]
    content_type: ContentType
    snippet: str
    relevance_score: float
    tags: List[str]
    created_at: datetime


class SearchHit(BaseModel):
    """Search hit for internal use."""
    content_id: int
    title: Optional[str]
    text_preview: str
    score: float
    content_type: str
    highlights: List[str] = []


class SourceReference(BaseModel):
    """Source reference for RAG responses."""
    content_id: int
    title: Optional[str]
    chunk_index: int
    text_preview: str
    relevance_score: float


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_count: int
    query_time_ms: int


# ============================================================================
# Chat Schemas
# ============================================================================

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    context_style: ContextStyle = ContextStyle.SELF
    use_knowledge_base: bool = True


class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage
    sources: List[QuerySource] = []
    suggested_questions: List[str] = []
    processing_time_ms: Optional[int] = None


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    created_at: datetime
    last_message_at: Optional[datetime]


# ============================================================================
# Content Link Schemas
# ============================================================================

class ContentLinkCreate(BaseModel):
    target_id: int
    link_type: LinkType
    description: Optional[str] = None


class ContentLinkResponse(BaseModel):
    id: int
    source_id: int
    target_id: int
    link_type: LinkType
    confidence: float
    description: Optional[str]
    created_by: str
    bidirectional: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Mind Map Schemas
# ============================================================================

class MindMapNode(BaseModel):
    id: str
    label: str
    content_id: Optional[int] = None
    content_type: Optional[ContentType] = None
    group: Optional[str] = None
    size: float = 1.0
    color: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MindMapEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    link_type: Optional[LinkType] = None
    weight: float = 1.0
    
    model_config = ConfigDict(from_attributes=True)


class MindMapResponse(BaseModel):
    nodes: List[MindMapNode]
    edges: List[MindMapEdge]
    center_node: Optional[str] = None


# ============================================================================
# Collection Schemas
# ============================================================================

class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class CollectionResponse(BaseModel):
    id: int
    user_id: int
    parent_id: Optional[int]
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    created_at: datetime
    children: List["CollectionResponse"] = []
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Annotation Schemas
# ============================================================================

class AnnotationCreate(BaseModel):
    note_text: str = Field(..., min_length=1)
    note_type: str = "note"
    start_position: Optional[int] = None
    end_position: Optional[int] = None
    selected_text: Optional[str] = None
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    color: Optional[str] = None
    tags: List[str] = []


class AnnotationResponse(BaseModel):
    id: int
    content_id: int
    note_text: str
    note_type: str
    start_position: Optional[int]
    end_position: Optional[int]
    selected_text: Optional[str]
    timestamp_start: Optional[float]
    timestamp_end: Optional[float]
    color: Optional[str]
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Dashboard Schemas
# ============================================================================

class WeeklyActivity(BaseModel):
    date: str
    content_added: int
    flashcards_reviewed: int
    tasks_completed: int


class DashboardStats(BaseModel):
    """Simple dashboard stats matching frontend expectations."""
    total_content: int
    content_by_type: Dict[str, int]
    total_flashcards: int
    flashcards_due: int
    total_tasks: int
    tasks_pending: int
    tasks_completed_today: int
    study_streak: int
    weekly_activity: List[WeeklyActivity]


class ActivityItem(BaseModel):
    id: str
    type: str  # 'content', 'flashcard', 'task'
    action: str
    title: str
    timestamp: str


class RecentActivity(BaseModel):
    recent_content: List[ContentListResponse]
    upcoming_tasks: List[TaskResponse]
    due_flashcards: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    activity: RecentActivity


# ============================================================================
# Pagination Schemas
# ============================================================================

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# ============================================================================
# Generic Response Schemas
# ============================================================================

class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============================================================================
# Content Sharing Schemas
# ============================================================================

class ShareContentRequest(BaseModel):
    """Request to share content with another user."""
    content_id: int
    shared_with_username: str = Field(..., min_length=1, description="Username of the recipient")
    message: Optional[str] = Field(None, max_length=500, description="Optional message")


class SharedContentResponse(BaseModel):
    """Response for a shared content item."""
    id: int
    content_id: int
    content_title: Optional[str]
    content_type: ContentType
    content_summary: Optional[str]
    shared_by_username: str
    shared_by_fullname: Optional[str]
    shared_with_username: str
    shared_with_fullname: Optional[str]
    message: Optional[str]
    is_read: bool
    shared_at: datetime
    read_at: Optional[datetime]


class SharedByMeResponse(BaseModel):
    """Content I shared with others."""
    id: int
    content_id: int
    content_title: Optional[str]
    content_type: ContentType
    shared_with_username: str
    shared_with_fullname: Optional[str]
    message: Optional[str]
    is_read: bool
    shared_at: datetime


class UserSearchResult(BaseModel):
    """User search result for sharing."""
    id: int
    username: str
    full_name: Optional[str]


# ============================================================================
# Quiz Schemas
# ============================================================================

class QuizGenerateRequest(BaseModel):
    content_id: int
    num_questions: int = Field(default=10, ge=1, le=30)
    question_types: List[QuestionType] = [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK]
    difficulty: Optional[str] = None  # easy, medium, hard


class QuizQuestionResponse(BaseModel):
    id: int
    question_type: QuestionType
    question_text: str
    options: List[str] = []
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    order_index: int = 0

    model_config = ConfigDict(from_attributes=True)


class QuizResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    content_id: Optional[int] = None
    difficulty: Optional[str] = None
    total_questions: int
    score: Optional[float] = None
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    questions: List[QuizQuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class QuizListResponse(BaseModel):
    id: int
    title: str
    content_id: Optional[int] = None
    difficulty: Optional[str] = None
    total_questions: int
    score: Optional[float] = None
    completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizAnswerRequest(BaseModel):
    question_id: int
    answer: str


class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerRequest]


class QuizResultResponse(BaseModel):
    quiz_id: int
    score: float
    total_questions: int
    correct_count: int
    results: List[QuizQuestionResponse]


# ============================================================================
# Collaborative Workspace Schemas
# ============================================================================

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None

class WorkspaceMemberAdd(BaseModel):
    username: str
    role: str = "viewer"  # owner, admin, editor, viewer

class WorkspaceMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: Optional[str] = None
    role: str
    joined_at: datetime

class WorkspaceContentAdd(BaseModel):
    content_id: int

class WorkspaceContentResponse(BaseModel):
    id: int
    content_id: int
    content_title: Optional[str] = None
    content_type: Optional[str] = None
    added_by_username: str
    added_at: datetime

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    owner_username: Optional[str] = None
    member_count: int = 0
    content_count: int = 0
    created_at: datetime
    updated_at: datetime

class WorkspaceDetailResponse(WorkspaceResponse):
    members: List[WorkspaceMemberResponse] = []
    contents: List[WorkspaceContentResponse] = []


# Enable forward references
CollectionResponse.model_rebuild()
