import api from './api'
import type {
  QueryRequest,
  QueryResponse,
  SearchResult,
  ChatSession,
  ChatMessage,
  ContentSource,
} from '../types'

interface ChatResponse {
  session_id: string
  message: ChatMessage
  sources: ContentSource[]
  suggested_questions: string[]
}

export const assistantService = {
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await api.post<QueryResponse>('/assistant/query', request)
    return response.data
  },

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/assistant/chat', {
      message,
      session_id: sessionId,
      use_knowledge_base: true,
    })
    return response.data
  },

  async search(query: string, topK: number = 10): Promise<SearchResult[]> {
    const response = await api.post<SearchResult[]>('/assistant/search', {
      query,
      top_k: topK,
    })
    return response.data
  },

  async getSuggestedQuestions(contentId?: number): Promise<string[]> {
    const params = contentId ? { content_id: contentId } : {}
    const response = await api.get<string[]>('/assistant/suggestions', { params })
    return response.data
  },

  // Chat sessions
  async createChatSession(title?: string): Promise<ChatSession> {
    const response = await api.post<ChatSession>('/assistant/chat/sessions', { title })
    return response.data
  },

  async listChatSessions(): Promise<ChatSession[]> {
    const response = await api.get<{ items: ChatSession[] }>('/assistant/chat/sessions')
    return response.data.items || []
  },

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await api.get<ChatSession>(`/assistant/chat/sessions/${sessionId}`)
    return response.data
  },

  async sendChatMessage(
    sessionId: string,
    message: string
  ): Promise<ChatMessage> {
    const response = await api.post<ChatMessage>(
      `/assistant/chat/sessions/${sessionId}/messages`,
      { message }
    )
    return response.data
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    await api.delete(`/assistant/chat/sessions/${sessionId}`)
  },

  // Query history
  async getQueryHistory(limit: number = 20): Promise<Array<{ query: string; timestamp: string }>> {
    const response = await api.get('/assistant/history', { params: { limit } })
    return response.data
  },

  async clearQueryHistory(): Promise<void> {
    await api.delete('/assistant/history')
  },
}

export default assistantService
