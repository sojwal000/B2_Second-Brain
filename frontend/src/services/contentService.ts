import api from './api'
import type {
  Content,
  ContentListResponse,
  ContentTextRequest,
  PaginationParams,
  ContentType,
} from '../types'

interface ContentFilters extends PaginationParams {
  content_type?: ContentType
  subject?: string
  tag?: string
  is_favorite?: boolean
  is_pinned?: boolean
  is_archived?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export const contentService = {
  async list(filters: ContentFilters = {}): Promise<ContentListResponse> {
    const response = await api.get<ContentListResponse>('/content', { params: filters })
    return response.data
  },

  async get(id: number): Promise<Content> {
    const response = await api.get<Content>(`/content/${id}`)
    return response.data
  },

  async uploadFile(
    file: File,
    data: { title?: string; subjects?: string[]; tags?: string[] } = {}
  ): Promise<Content> {
    const formData = new FormData()
    formData.append('file', file)
    if (data.title) formData.append('title', data.title)
    if (data.subjects) formData.append('subjects', JSON.stringify(data.subjects))
    if (data.tags) formData.append('tags', JSON.stringify(data.tags))

    const response = await api.post<Content>('/content/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async createText(data: ContentTextRequest): Promise<Content> {
    const response = await api.post<Content>('/content/text', data)
    return response.data
  },

  async createFromUrl(url: string, data: { title?: string } = {}): Promise<Content> {
    const response = await api.post<Content>('/content/url', { url, ...data })
    return response.data
  },

  async update(id: number, data: Partial<Content>): Promise<Content> {
    const response = await api.patch<Content>(`/content/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/content/${id}`)
  },

  async toggleFavorite(id: number): Promise<Content> {
    const response = await api.post<Content>(`/content/${id}/favorite`)
    return response.data
  },

  async togglePin(id: number): Promise<Content> {
    const response = await api.post<Content>(`/content/${id}/pin`)
    return response.data
  },

  async toggleArchive(id: number): Promise<Content> {
    const response = await api.post<Content>(`/content/${id}/archive`)
    return response.data
  },

  async reprocess(id: number): Promise<Content> {
    const response = await api.post<Content>(`/content/${id}/reprocess`)
    return response.data
  },

  async getStatus(id: number): Promise<{ status: string; progress?: number }> {
    const response = await api.get(`/content/${id}/status`)
    return response.data
  },

  async getSubjects(): Promise<string[]> {
    const response = await api.get<string[]>('/content/subjects')
    return response.data
  },

  async getTags(): Promise<string[]> {
    const response = await api.get<string[]>('/content/tags')
    return response.data
  },
}

export default contentService
