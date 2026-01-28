import { create } from 'zustand'
import type { Content, ContentType } from '../types'
import { contentService } from '../services'

interface ContentState {
  contents: Content[]
  selectedContent: Content | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
  filters: {
    contentType?: ContentType
    subject?: string
    tag?: string
    search?: string
    isFavorite?: boolean
    isPinned?: boolean
    isArchived?: boolean
  }

  // Actions
  fetchContents: () => Promise<void>
  fetchContent: (id: number) => Promise<void>
  uploadFile: (file: File, data?: { title?: string; subjects?: string[]; tags?: string[] }) => Promise<Content>
  createText: (data: { title: string; text_content: string; subjects?: string[]; tags?: string[] }) => Promise<Content>
  updateContent: (id: number, data: Partial<Content>) => Promise<void>
  deleteContent: (id: number) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
  togglePin: (id: number) => Promise<void>
  toggleArchive: (id: number) => Promise<void>
  setFilters: (filters: Partial<ContentState['filters']>) => void
  setPage: (page: number) => void
  clearError: () => void
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  selectedContent: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    pages: 0,
  },
  filters: {},

  fetchContents: async () => {
    set({ isLoading: true, error: null })
    const { pagination, filters } = get()

    try {
      const response = await contentService.list({
        page: pagination.page,
        page_size: pagination.pageSize,
        content_type: filters.contentType,
        subject: filters.subject,
        tag: filters.tag,
        search: filters.search,
        is_favorite: filters.isFavorite,
        is_pinned: filters.isPinned,
        is_archived: filters.isArchived,
      })

      set({
        contents: response.items,
        pagination: {
          ...pagination,
          total: response.total,
          pages: response.pages,
        },
        isLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch content'
      set({ error: message, isLoading: false })
    }
  },

  fetchContent: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const content = await contentService.get(id)
      set({ selectedContent: content, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch content'
      set({ error: message, isLoading: false })
    }
  },

  uploadFile: async (file: File, data?) => {
    set({ isLoading: true, error: null })
    try {
      const content = await contentService.uploadFile(file, data)
      set((state) => ({
        contents: [content, ...state.contents],
        isLoading: false,
      }))
      return content
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  createText: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const content = await contentService.createText(data)
      set((state) => ({
        contents: [content, ...state.contents],
        isLoading: false,
      }))
      return content
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Creation failed'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateContent: async (id: number, data: Partial<Content>) => {
    try {
      const updated = await contentService.update(id, data)
      set((state) => ({
        contents: state.contents.map((c) => (c.id === id ? updated : c)),
        selectedContent: state.selectedContent?.id === id ? updated : state.selectedContent,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      set({ error: message })
      throw error
    }
  },

  deleteContent: async (id: number) => {
    try {
      await contentService.delete(id)
      set((state) => ({
        contents: state.contents.filter((c) => c.id !== id),
        selectedContent: state.selectedContent?.id === id ? null : state.selectedContent,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      set({ error: message })
      throw error
    }
  },

  toggleFavorite: async (id: number) => {
    try {
      const updated = await contentService.toggleFavorite(id)
      set((state) => ({
        contents: state.contents.map((c) => (c.id === id ? updated : c)),
        selectedContent: state.selectedContent?.id === id ? updated : state.selectedContent,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Toggle favorite failed'
      set({ error: message })
    }
  },

  togglePin: async (id: number) => {
    try {
      const updated = await contentService.togglePin(id)
      set((state) => ({
        contents: state.contents.map((c) => (c.id === id ? updated : c)),
        selectedContent: state.selectedContent?.id === id ? updated : state.selectedContent,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Toggle pin failed'
      set({ error: message })
    }
  },

  toggleArchive: async (id: number) => {
    try {
      const updated = await contentService.toggleArchive(id)
      set((state) => ({
        contents: state.contents.map((c) => (c.id === id ? updated : c)),
        selectedContent: state.selectedContent?.id === id ? updated : state.selectedContent,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Toggle archive failed'
      set({ error: message })
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }))
    get().fetchContents()
  },

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }))
    get().fetchContents()
  },

  clearError: () => set({ error: null }),
}))
