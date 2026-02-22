// User types
export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  preferences: UserPreferences
  created_at: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  default_ai_provider: 'gemini' | 'openai' | 'anthropic'
  notifications_enabled: boolean
  daily_review_reminder: boolean
  reminder_time: string
}

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Content types
export type ContentType = 'text' | 'document' | 'image' | 'audio' | 'video' | 'url' | 'code'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Content {
  id: number
  user_id: number
  title: string
  content_type: ContentType
  source: string | null
  file_path: string | null
  text_content: string | null
  summary: string | null
  subjects: string[]
  tags: string[]
  processing_status: ProcessingStatus
  is_favorite: boolean
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ContentListResponse {
  items: Content[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ContentUploadRequest {
  file: File
  title?: string
  subjects?: string[]
  tags?: string[]
}

export interface ContentTextRequest {
  title: string
  text_content: string
  content_type?: ContentType
  subjects?: string[]
  tags?: string[]
}

// Assistant types
export interface QueryRequest {
  query: string
  config?: {
    max_sources?: number
    context_style?: 'self' | 'professor' | 'friend' | 'coach'
    include_reasoning?: boolean
    date_filter?: { from?: string; to?: string }
    content_types?: ContentType[]
    subjects?: string[]
    tags?: string[]
  }
  session_id?: string
}

export interface QueryResponse {
  query_id: string
  answer: string
  sources: ContentSource[]
  confidence: number
  reasoning_trace?: string
  follow_up_questions: string[]
  processing_time_ms: number
}

export interface ContentSource {
  content_id: number
  title: string | null
  snippet: string
  relevance_score: number
  supporting_quote?: string
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ContentSource[]
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

// Flashcard types
export type CardType = 'basic' | 'cloze' | 'reverse'
export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered'

export interface Deck {
  id: number
  name: string
  description: string | null
  subject: string | null
  card_count: number
  due_count: number
  new_count: number
  mastered_count: number
  created_at: string
}

export interface Flashcard {
  id: number
  deck_id: number
  user_id: number
  content_id: number | null
  question: string
  answer: string
  explanation: string | null
  card_type: CardType
  difficulty: number
  stability: number
  retrievability: number
  last_review: string | null
  next_review: string | null
  review_count: number
  lapses: number
  average_response_time_ms: number
  streak: number
  mastery_level: string
  ai_generated: boolean
  is_suspended: boolean
  is_buried: boolean
  created_at: string
  updated_at: string
}

export interface ReviewRequest {
  rating: number // 1=Again, 2=Hard, 3=Good, 4=Easy
  response_time_ms?: number
}

export interface ReviewStats {
  total_reviews: number
  correct_reviews: number
  average_quality: number
  streak: number
}

// Task types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  project: string | null
  content_id: number | null
  tags: string[]
  created_at: string
  completed_at: string | null
}

export interface TaskCreateRequest {
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
  project?: string
}

export interface TaskStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
}

// Mind Map types
export interface MindMapNode {
  id: string
  label: string
  type: 'content' | 'subject' | 'tag' | 'entity'
  size: number
  color: string
  data?: Record<string, unknown>
}

export interface MindMapEdge {
  source: string
  target: string
  weight: number
  type: 'subject' | 'tag' | 'semantic' | 'manual' | 'shared_tag' | 'same_subject' | 'related'
}

export interface MindMapData {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

// Dashboard types
export interface DashboardStats {
  total_content: number
  content_by_type: Record<ContentType, number>
  total_flashcards: number
  flashcards_due: number
  total_tasks: number
  tasks_pending: number
  tasks_completed_today: number
  study_streak: number
  weekly_activity: WeeklyActivity[]
}

export interface WeeklyActivity {
  date: string
  content_added: number
  flashcards_reviewed: number
  tasks_completed: number
}

export interface ActivityItem {
  id: string
  type: 'content' | 'flashcard' | 'task'
  action: string
  title: string
  timestamp: string
}

// Search types
export interface SearchResult {
  content_id: number
  title: string
  content_type: ContentType
  excerpt: string
  score: number
  highlights: string[]
}

// Common types
export interface PaginationParams {
  page?: number
  page_size?: number
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ApiError {
  detail: string
  status_code?: number
}

// Sharing types
export interface SharedContentItem {
  id: number
  content_id: number
  content_title: string | null
  content_type: ContentType
  content_summary: string | null
  shared_by_username: string
  shared_by_fullname: string | null
  shared_with_username: string
  shared_with_fullname: string | null
  message: string | null
  is_read: boolean
  shared_at: string
  read_at: string | null
}

export interface SharedByMeItem {
  id: number
  content_id: number
  content_title: string | null
  content_type: ContentType
  shared_with_username: string
  shared_with_fullname: string | null
  message: string | null
  is_read: boolean
  shared_at: string
}

export interface UserSearchResult {
  id: number
  username: string
  full_name: string | null
}

export interface SharedContentDetail {
  id: number
  title: string | null
  content_type: ContentType
  text_content: string | null
  raw_markdown: string | null
  summary: string | null
  summary_bullets: string[] | null
  tags: string[]
  subject: string | null
  created_at: string
  shared_by: {
    username: string
    full_name: string | null
  }
  shared_at: string
  message: string | null
}

// Quiz types
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer'

export interface QuizGenerateRequest {
  content_id: number
  num_questions?: number
  question_types?: QuestionType[]
  difficulty?: string
}

export interface QuizQuestion {
  id: number
  question_type: QuestionType
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  difficulty: string | null
  user_answer: string | null
  is_correct: boolean | null
  order_index: number
}

export interface QuizDetail {
  id: number
  title: string
  description: string | null
  content_id: number | null
  difficulty: string | null
  total_questions: number
  score: number | null
  completed: boolean
  completed_at: string | null
  created_at: string
  questions: QuizQuestion[]
}

export interface QuizListItem {
  id: number
  title: string
  content_id: number | null
  difficulty: string | null
  total_questions: number
  score: number | null
  completed: boolean
  created_at: string
}

export interface QuizAnswer {
  question_id: number
  answer: string
}

export interface QuizResult {
  quiz_id: number
  score: number
  total_questions: number
  correct_count: number
  results: QuizQuestion[]
}
