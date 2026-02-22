import { api } from './api'

export interface WorkspaceItem {
  id: number
  name: string
  description: string | null
  owner_id: number
  owner_username: string | null
  member_count: number
  content_count: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: number
  user_id: number
  username: string
  full_name: string | null
  role: string
  joined_at: string
}

export interface WorkspaceContentItem {
  id: number
  content_id: number
  content_title: string | null
  content_type: string | null
  added_by_username: string
  added_at: string
}

export interface WorkspaceDetail extends WorkspaceItem {
  members: WorkspaceMember[]
  contents: WorkspaceContentItem[]
}

const workspaceService = {
  async listWorkspaces(page = 1, pageSize = 20): Promise<{
    items: WorkspaceItem[]
    total: number
    page: number
    page_size: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }> {
    const { data } = await api.get('/workspaces', { params: { page, page_size: pageSize } })
    return data
  },

  async getWorkspace(id: number): Promise<WorkspaceDetail> {
    const { data } = await api.get(`/workspaces/${id}`)
    return data
  },

  async createWorkspace(name: string, description?: string): Promise<WorkspaceItem> {
    const { data } = await api.post('/workspaces', { name, description })
    return data
  },

  async updateWorkspace(id: number, updates: { name?: string; description?: string }): Promise<WorkspaceItem> {
    const { data } = await api.patch(`/workspaces/${id}`, updates)
    return data
  },

  async deleteWorkspace(id: number): Promise<void> {
    await api.delete(`/workspaces/${id}`)
  },

  async addMember(workspaceId: number, username: string, role = 'viewer'): Promise<WorkspaceMember> {
    const { data } = await api.post(`/workspaces/${workspaceId}/members`, { username, role })
    return data
  },

  async removeMember(workspaceId: number, userId: number): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
  },

  async addContent(workspaceId: number, contentId: number): Promise<WorkspaceContentItem> {
    const { data } = await api.post(`/workspaces/${workspaceId}/content`, { content_id: contentId })
    return data
  },

  async removeContent(workspaceId: number, contentId: number): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/content/${contentId}`)
  },
}

export default workspaceService
