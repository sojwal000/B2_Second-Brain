import api from './api'
import type { Task, TaskCreateRequest, TaskStats, TaskStatus, TaskPriority } from '../types'

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  category?: string
  due_before?: string
  due_after?: string
  is_overdue?: boolean
  page?: number
  page_size?: number
}

export const taskService = {
  async list(filters: TaskFilters = {}): Promise<{ items: Task[]; total: number }> {
    const response = await api.get('/tasks', { params: filters })
    return response.data
  },

  async get(id: number): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`)
    return response.data
  },

  async create(data: TaskCreateRequest): Promise<Task> {
    const response = await api.post<Task>('/tasks', data)
    return response.data
  },

  async update(id: number, data: Partial<Task>): Promise<Task> {
    const response = await api.put<Task>(`/tasks/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  async toggleComplete(id: number): Promise<Task> {
    const response = await api.post<Task>(`/tasks/${id}/toggle`)
    return response.data
  },

  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/${id}/status`, { status })
    return response.data
  },

  async updatePriority(id: number, priority: TaskPriority): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/${id}/priority`, { priority })
    return response.data
  },

  async bulkUpdate(taskIds: number[], data: Partial<Task>): Promise<Task[]> {
    const response = await api.post<Task[]>('/tasks/bulk', {
      task_ids: taskIds,
      ...data,
    })
    return response.data
  },

  async bulkDelete(taskIds: number[]): Promise<void> {
    await api.delete('/tasks/bulk', { data: { task_ids: taskIds } })
  },

  async getStats(): Promise<TaskStats> {
    const response = await api.get<TaskStats>('/tasks/stats')
    return response.data
  },

  async extractFromContent(contentId: number): Promise<Task[]> {
    const response = await api.post<{ tasks: Task[] }>('/tasks/extract', {
      content_id: contentId,
      auto_save: true
    })
    return response.data.tasks || response.data
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<string[]>('/tasks/categories')
    return response.data
  },
}

export default taskService
