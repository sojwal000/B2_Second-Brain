import api from './api'
import type { DashboardStats, ActivityItem, WeeklyActivity } from '../types'

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  async getActivity(limit: number = 20): Promise<ActivityItem[]> {
    const response = await api.get<ActivityItem[]>('/dashboard/activity', {
      params: { limit },
    })
    return response.data
  },

  async getWeeklyActivity(): Promise<WeeklyActivity[]> {
    const response = await api.get<WeeklyActivity[]>('/dashboard/weekly')
    return response.data
  },

  async getSubjectBreakdown(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>('/dashboard/subjects')
    return response.data
  },

  async getTagBreakdown(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>('/dashboard/tags')
    return response.data
  },

  async getQuickAccess(): Promise<{
    recent: Array<{ id: number; title: string; type: string }>
    pinned: Array<{ id: number; title: string; type: string }>
    favorites: Array<{ id: number; title: string; type: string }>
  }> {
    const response = await api.get('/dashboard/quick-access')
    return response.data
  },

  async getTodayFocus(): Promise<{
    due_flashcards: number
    pending_tasks: number
    suggested_content: Array<{ id: number; title: string }>
  }> {
    const response = await api.get('/dashboard/today')
    return response.data
  },
}

export default dashboardService
