import api from './api'
import type { MindMapData, MindMapNode, MindMapEdge } from '../types'

interface MindMapFilters {
  subjects?: string[]
  content_types?: string[]
  include_tags?: boolean
  include_entities?: boolean
  max_nodes?: number
}

export const mindmapService = {
  async getMindMap(filters: MindMapFilters = {}): Promise<MindMapData> {
    const response = await api.get<MindMapData>('/mindmap', { params: filters })
    return response.data
  },

  async getContentGraph(contentId: number, depth: number = 2): Promise<MindMapData> {
    const response = await api.get<MindMapData>(`/mindmap/content/${contentId}`, {
      params: { depth },
    })
    return response.data
  },

  async getSubjectGraph(subject: string): Promise<MindMapData> {
    const response = await api.get<MindMapData>(`/mindmap/subject/${encodeURIComponent(subject)}`)
    return response.data
  },

  // Content links
  async createLink(
    sourceId: number,
    targetId: number,
    linkType: string = 'manual'
  ): Promise<{ source: number; target: number; type: string }> {
    const response = await api.post('/mindmap/links', {
      source_id: sourceId,
      target_id: targetId,
      link_type: linkType,
    })
    return response.data
  },

  async deleteLink(sourceId: number, targetId: number): Promise<void> {
    await api.delete('/mindmap/links', {
      data: { source_id: sourceId, target_id: targetId },
    })
  },

  async getLinks(contentId: number): Promise<Array<{
    linked_content_id: number
    title: string
    link_type: string
    created_at: string
  }>> {
    const response = await api.get(`/mindmap/links/${contentId}`)
    return response.data
  },

  async suggestLinks(contentId: number, topK: number = 5): Promise<Array<{
    content_id: number
    title: string
    score: number
    reason: string
  }>> {
    const response = await api.get(`/mindmap/suggest/${contentId}`, {
      params: { top_k: topK },
    })
    return response.data
  },

  async autoDiscoverLinks(threshold: number = 0.7): Promise<{
    discovered: number
    links: Array<{ source: number; target: number; score: number }>
  }> {
    const response = await api.post('/mindmap/discover', { threshold })
    return response.data
  },
}

export default mindmapService
