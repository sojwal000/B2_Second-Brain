import { api } from './api'
import type {
  QuizGenerateRequest,
  QuizDetail,
  QuizListItem,
  QuizAnswer,
  QuizResult,
} from '../types'

const quizService = {
  async generateQuiz(request: QuizGenerateRequest): Promise<QuizDetail> {
    const { data } = await api.post('/quiz/generate', request)
    return data
  },

  async listQuizzes(page = 1, pageSize = 20, completed?: boolean): Promise<{
    items: QuizListItem[]
    total: number
    page: number
    page_size: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }> {
    const params: Record<string, unknown> = { page, page_size: pageSize }
    if (completed !== undefined) params.completed = completed
    const { data } = await api.get('/quiz', { params })
    return data
  },

  async getQuiz(quizId: number): Promise<QuizDetail> {
    const { data } = await api.get(`/quiz/${quizId}`)
    return data
  },

  async submitQuiz(quizId: number, answers: QuizAnswer[]): Promise<QuizResult> {
    const { data } = await api.post(`/quiz/${quizId}/submit`, { answers })
    return data
  },

  async deleteQuiz(quizId: number): Promise<void> {
    await api.delete(`/quiz/${quizId}`)
  },
}

export default quizService
