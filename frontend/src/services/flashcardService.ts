import api from './api'
import type { Deck, Flashcard, ReviewRequest, ReviewStats } from '../types'

export const flashcardService = {
  // Decks
  async listDecks(): Promise<Deck[]> {
    const response = await api.get('/flashcards/decks')
    return response.data.items || response.data
  },

  async getDeck(id: number): Promise<Deck> {
    const response = await api.get<Deck>(`/flashcards/decks/${id}`)
    return response.data
  },

  async createDeck(data: { name: string; description?: string; subject?: string }): Promise<Deck> {
    const response = await api.post<Deck>('/flashcards/decks', data)
    return response.data
  },

  async updateDeck(id: number, data: Partial<Deck>): Promise<Deck> {
    const response = await api.patch<Deck>(`/flashcards/decks/${id}`, data)
    return response.data
  },

  async deleteDeck(id: number): Promise<void> {
    await api.delete(`/flashcards/decks/${id}`)
  },

  // Cards
  async listCards(deckId: number): Promise<Flashcard[]> {
    // Get cards for a deck
    const response = await api.get<Flashcard[]>(`/flashcards/decks/${deckId}/cards`)
    return response.data || []
  },

  async getDueCards(deckId: number): Promise<Flashcard[]> {
    const response = await api.get<Flashcard[]>(`/flashcards/decks/${deckId}/review`)
    return response.data
  },

  async getCard(cardId: number): Promise<Flashcard> {
    const response = await api.get<Flashcard>(`/flashcards/cards/${cardId}`)
    return response.data
  },

  async createCard(
    deckId: number,
    data: { question: string; answer: string; explanation?: string }
  ): Promise<Flashcard> {
    const response = await api.post<Flashcard>(`/flashcards/decks/${deckId}/cards`, data)
    return response.data
  },

  async updateCard(cardId: number, data: Partial<Flashcard>): Promise<Flashcard> {
    const response = await api.patch<Flashcard>(`/flashcards/cards/${cardId}`, data)
    return response.data
  },

  async deleteCard(cardId: number): Promise<void> {
    await api.delete(`/flashcards/cards/${cardId}`)
  },

  // Review
  async submitReview(cardId: number, review: ReviewRequest): Promise<Flashcard> {
    const response = await api.post<Flashcard>(`/flashcards/cards/${cardId}/review`, review)
    return response.data
  },

  async getReviewStats(deckId?: number): Promise<ReviewStats> {
    if (deckId) {
      const response = await api.get<ReviewStats>(`/flashcards/decks/${deckId}/stats`)
      return response.data
    }
    const response = await api.get<ReviewStats>('/flashcards/stats')
    return response.data
  },

  // AI Generation
  async generateFromContent(
    contentId: number,
    deckId: number,
    count: number = 10
  ): Promise<Flashcard[]> {
    const response = await api.post<{ flashcards: Flashcard[] }>('/flashcards/generate', {
      content_id: contentId,
      deck_id: deckId,
      num_cards: count,
    })
    return response.data.flashcards || response.data
  },

  async generateFromText(
    text: string,
    deckId: number,
    count: number = 10
  ): Promise<Flashcard[]> {
    const response = await api.post<{ flashcards: Flashcard[] }>('/flashcards/generate', {
      text,
      deck_id: deckId,
      count,
    })
    return response.data.flashcards || response.data
  },
}

export default flashcardService
