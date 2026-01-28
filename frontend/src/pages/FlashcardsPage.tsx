import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Add,
  Style,
  PlayArrow,
  Check,
  Close,
  ChevronLeft,
  ChevronRight,
  AutoAwesome,
} from '@mui/icons-material'
import { Button, Card, CardContent, Input, Modal, Badge } from '../components/ui'
import { flashcardService } from '../services'
import type { Deck, Flashcard } from '../types'
import toast from 'react-hot-toast'

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  // Form state
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDescription, setNewDeckDescription] = useState('')
  const [newCardQuestion, setNewCardQuestion] = useState('')
  const [newCardAnswer, setNewCardAnswer] = useState('')
  const [newCardExplanation, setNewCardExplanation] = useState('')

  useEffect(() => {
    loadDecks()
  }, [])

  useEffect(() => {
    if (selectedDeck) {
      loadCards(selectedDeck.id)
    }
  }, [selectedDeck])

  const loadDecks = async () => {
    try {
      const data = await flashcardService.listDecks()
      setDecks(data)
    } catch (error) {
      console.error('Failed to load decks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCards = async (deckId: number) => {
    try {
      const data = await flashcardService.getDueCards(deckId)
      setCards(data)
    } catch (error) {
      console.error('Failed to load cards:', error)
    }
  }

  const createDeck = async () => {
    if (!newDeckName.trim()) return

    try {
      const deck = await flashcardService.createDeck({
        name: newDeckName,
        description: newDeckDescription,
      })
      setDecks((prev) => [...prev, deck])
      setShowCreateModal(false)
      setNewDeckName('')
      setNewDeckDescription('')
      toast.success('Deck created!')
    } catch (error) {
      toast.error('Failed to create deck')
    }
  }

  const createCard = async () => {
    if (!selectedDeck || !newCardQuestion.trim() || !newCardAnswer.trim()) return

    try {
      const card = await flashcardService.createCard(selectedDeck.id, {
        question: newCardQuestion,
        answer: newCardAnswer,
        explanation: newCardExplanation || undefined,
      })
      setCards((prev) => [...prev, card])
      setShowAddCardModal(false)
      setNewCardQuestion('')
      setNewCardAnswer('')
      setNewCardExplanation('')
      // Reload cards and deck to update counts
      loadCards(selectedDeck.id)
      loadDecks()
      toast.success('Card created!')
    } catch (error) {
      toast.error('Failed to create card')
    }
  }

  const submitReview = async (rating: number) => {
    if (!selectedDeck || !cards[currentCardIndex]) return

    try {
      await flashcardService.submitReview(cards[currentCardIndex].id, {
        rating,
      })

      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex((prev) => prev + 1)
        setShowAnswer(false)
      } else {
        // Review complete
        toast.success('Review session complete!')
        setReviewMode(false)
        setCurrentCardIndex(0)
        loadCards(selectedDeck.id)
      }
    } catch (error) {
      toast.error('Failed to submit review')
    }
  }

  const startReview = () => {
    if (cards.length === 0) {
      toast.error('No cards due for review')
      return
    }
    setReviewMode(true)
    setCurrentCardIndex(0)
    setShowAnswer(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Review Mode
  if (reviewMode && selectedDeck && cards.length > 0) {
    const currentCard = cards[currentCardIndex]

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setReviewMode(false)}>
            <ChevronLeft fontSize="small" className="mr-1" />
            Back to Deck
          </Button>
          <Badge variant="primary">
            {currentCardIndex + 1} / {cards.length}
          </Badge>
        </div>

        {/* Flashcard */}
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="perspective-1000"
        >
          <Card
            className="min-h-[300px] cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
              <AnimatePresence mode="wait">
                {!showAnswer ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: 180 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: -180 }}
                  >
                    <p className="text-secondary-500 text-sm mb-4">QUESTION</p>
                    <p className="text-xl text-white">{currentCard.question}</p>
                    <p className="text-secondary-500 text-sm mt-8">
                      Click to reveal answer
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: -180 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 180 }}
                  >
                    <p className="text-secondary-500 text-sm mb-4">ANSWER</p>
                    <p className="text-xl text-white mb-4">{currentCard.answer}</p>
                    {currentCard.explanation && (
                      <p className="text-secondary-400 text-sm">
                        {currentCard.explanation}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Buttons */}
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-2"
          >
            <Button
              variant="danger"
              onClick={() => submitReview(1)}
              className="flex flex-col py-4"
            >
              <Close />
              <span className="text-xs mt-1">Again</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => submitReview(2)}
              className="flex flex-col py-4"
            >
              <span className="text-lg">😕</span>
              <span className="text-xs mt-1">Hard</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => submitReview(3)}
              className="flex flex-col py-4"
            >
              <span className="text-lg">🙂</span>
              <span className="text-xs mt-1">Good</span>
            </Button>
            <Button
              onClick={() => submitReview(4)}
              className="flex flex-col py-4"
            >
              <Check />
              <span className="text-xs mt-1">Easy</span>
            </Button>
          </motion.div>
        )}
      </div>
    )
  }

  // Deck View
  if (selectedDeck) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedDeck(null)}>
              <ChevronLeft fontSize="small" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedDeck.name}</h1>
              {selectedDeck.description && (
                <p className="text-secondary-400">{selectedDeck.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowAddCardModal(true)}>
              <Add fontSize="small" className="mr-1" />
              Add Card
            </Button>
            <Button onClick={startReview} disabled={cards.length === 0}>
              <PlayArrow fontSize="small" className="mr-1" />
              Start Review ({cards.length})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{selectedDeck.card_count}</p>
            <p className="text-secondary-400 text-sm">Total Cards</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{selectedDeck.new_count}</p>
            <p className="text-secondary-400 text-sm">New</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{selectedDeck.due_count}</p>
            <p className="text-secondary-400 text-sm">Due</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{selectedDeck.mastered_count}</p>
            <p className="text-secondary-400 text-sm">Mastered</p>
          </Card>
        </div>

        {/* Cards List */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-white mb-4">Cards Due for Review</h2>
            {cards.length > 0 ? (
              <div className="space-y-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 bg-secondary-900 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white">{card.question}</p>
                    </div>
                    <Badge
                      variant={
                        card.mastery_level === 'mastered'
                          ? 'success'
                          : card.mastery_level === 'learning'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {card.mastery_level}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary-500 text-center py-8">
                No cards due for review. Great job! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Decks List
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flashcards</h1>
          <p className="text-secondary-400">Study with spaced repetition</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Add fontSize="small" className="mr-1" />
          Create Deck
        </Button>
      </div>

      {/* Decks Grid */}
      {decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              hoverable
              onClick={() => setSelectedDeck(deck)}
              className="cursor-pointer"
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Style className="text-purple-400" />
                  </div>
                  {deck.due_count > 0 && (
                    <Badge variant="warning">{deck.due_count} due</Badge>
                  )}
                </div>
                <h3 className="font-medium text-white mb-1">{deck.name}</h3>
                {deck.description && (
                  <p className="text-secondary-400 text-sm mb-3">{deck.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-secondary-500">
                  <span>{deck.card_count} cards</span>
                  <span>{deck.mastered_count} mastered</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Style className="text-secondary-500 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No decks yet</h3>
          <p className="text-secondary-400 mb-4">
            Create a deck to start studying with flashcards
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Add fontSize="small" className="mr-1" />
            Create Deck
          </Button>
        </Card>
      )}

      {/* Create Deck Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Deck"
      >
        <div className="space-y-4">
          <Input
            label="Deck Name"
            placeholder="e.g., JavaScript Fundamentals"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
          />
          <Input
            label="Description (optional)"
            placeholder="What's this deck about?"
            value={newDeckDescription}
            onChange={(e) => setNewDeckDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createDeck} disabled={!newDeckName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Card Modal */}
      <Modal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        title="Add New Card"
      >
        <div className="space-y-4">
          <Input
            label="Question"
            placeholder="Enter the question"
            value={newCardQuestion}
            onChange={(e) => setNewCardQuestion(e.target.value)}
          />
          <Input
            label="Answer"
            placeholder="Enter the answer"
            value={newCardAnswer}
            onChange={(e) => setNewCardAnswer(e.target.value)}
          />
          <Input
            label="Explanation (optional)"
            placeholder="Why is this the answer?"
            value={newCardExplanation}
            onChange={(e) => setNewCardExplanation(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddCardModal(false)}>
              Cancel
            </Button>
            <Button onClick={createCard} disabled={!newCardQuestion.trim() || !newCardAnswer.trim()}>
              Add Card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
