import api from './api'
import type {
  SharedContentItem,
  SharedByMeItem,
  UserSearchResult,
  SharedContentDetail,
} from '../types'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export const sharingService = {
  // Search users to share with
  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const response = await api.get<UserSearchResult[]>('/sharing/users/search', {
      params: { q: query },
    })
    return response.data
  },

  // Share content with a user
  async shareContent(contentId: number, username: string, message?: string): Promise<SharedContentItem> {
    const response = await api.post<SharedContentItem>('/sharing/share', {
      content_id: contentId,
      shared_with_username: username,
      message,
    })
    return response.data
  },

  // Get content shared with me
  async getSharedWithMe(page = 1, pageSize = 20, unreadOnly = false): Promise<PaginatedResponse<SharedContentItem>> {
    const response = await api.get<PaginatedResponse<SharedContentItem>>('/sharing/shared-with-me', {
      params: { page, page_size: pageSize, unread_only: unreadOnly },
    })
    return response.data
  },

  // Get content I shared
  async getSharedByMe(page = 1, pageSize = 20): Promise<PaginatedResponse<SharedByMeItem>> {
    const response = await api.get<PaginatedResponse<SharedByMeItem>>('/sharing/shared-by-me', {
      params: { page, page_size: pageSize },
    })
    return response.data
  },

  // View shared content detail
  async getSharedContent(contentId: number): Promise<SharedContentDetail> {
    const response = await api.get<SharedContentDetail>(`/sharing/content/${contentId}`)
    return response.data
  },

  // Mark as read
  async markAsRead(shareId: number): Promise<void> {
    await api.post(`/sharing/${shareId}/read`)
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ unread_count: number }>('/sharing/unread-count')
    return response.data.unread_count
  },

  // Remove share
  async unshare(shareId: number): Promise<void> {
    await api.delete(`/sharing/${shareId}`)
  },
}

export default sharingService
