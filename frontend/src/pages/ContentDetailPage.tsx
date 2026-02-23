import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  ArrowBack,
  Star,
  PushPin,
  Archive,
  Delete,
  Edit,
  Refresh,
  Style,
  Task,
  VolumeUp,
  Stop,
  Share,
  PersonSearch,
  Send,
  Recommend,
  OpenInNew,
} from '@mui/icons-material'
import { Button, Card, CardContent, Badge, Modal, Input } from '../components/ui'
import { useContentStore } from '../store/contentStore'
import { useAuthStore } from '../store/authStore'
import { contentService, flashcardService, taskService, sharingService } from '../services'
import type { ContentRecommendation } from '../services/contentService'
import type { UserSearchResult } from '../types'
import toast from 'react-hot-toast'

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    selectedContent: content,
    isLoading,
    fetchContent,
    toggleFavorite,
    togglePin,
    toggleArchive,
    deleteContent,
  } = useContentStore()
  const currentUser = useAuthStore((s) => s.user)
  const isOwner = !!(content && currentUser && content.user_id === currentUser.id)

  const [isProcessing, setIsProcessing] = useState(false)
  const [showFlashcardModal, setShowFlashcardModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [flashcardCount, setFlashcardCount] = useState(10)
  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState('')
  
  // Read Aloud state
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUserQuery, setShareUserQuery] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const userSearchTimer = useRef<NodeJS.Timeout | null>(null)

  // Recommendations state
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)

  const handleUserSearch = (query: string) => {
    setShareUserQuery(query)
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current)
    if (query.trim().length < 2) {
      setUserSearchResults([])
      return
    }
    userSearchTimer.current = setTimeout(async () => {
      setIsSearchingUsers(true)
      try {
        const results = await sharingService.searchUsers(query.trim())
        setUserSearchResults(results)
      } catch {
        setUserSearchResults([])
      } finally {
        setIsSearchingUsers(false)
      }
    }, 300)
  }

  const handleShare = async (username: string) => {
    if (!content) return
    setIsSharing(true)
    try {
      await sharingService.shareContent(content.id, username, shareMessage || undefined)
      toast.success(`Shared with ${username}`)
      setShowShareModal(false)
      setShareUserQuery('')
      setShareMessage('')
      setUserSearchResults([])
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to share'
      toast.error(msg)
    } finally {
      setIsSharing(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchContent(parseInt(id))
      loadRecommendations(parseInt(id))
    }
  }, [id, fetchContent])

  useEffect(() => {
    if (content) {
      setEditTitle(content.title)
      setEditTags(content.tags?.join(', ') || '')
    }
  }, [content])

  const loadRecommendations = async (contentId: number) => {
    setIsLoadingRecs(true)
    try {
      const recs = await contentService.getRecommendations(contentId, 5)
      setRecommendations(recs)
    } catch {
      // Recommendations are optional, silently fail
    } finally {
      setIsLoadingRecs(false)
    }
  }

  const handleReprocess = async () => {
    if (!content) return
    setIsProcessing(true)
    try {
      await contentService.reprocess(content.id)
      toast.success('Content reprocessing started')
      // Refresh content after a delay
      setTimeout(() => fetchContent(content.id), 2000)
    } catch {
      toast.error('Failed to reprocess content')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExtractTasks = async () => {
    if (!content) return
    setIsProcessing(true)
    try {
      const tasks = await taskService.extractFromContent(content.id)
      toast.success(`Extracted ${tasks.length} tasks`)
      navigate('/tasks')
    } catch {
      toast.error('Failed to extract tasks')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!content || !deckName.trim()) {
      toast.error('Please enter a deck name')
      return
    }
    setIsProcessing(true)
    try {
      // Create a new deck first
      const deck = await flashcardService.createDeck({
        name: deckName.trim(),
        description: `Generated from: ${content.title}`,
      })
      // Generate flashcards
      const cards = await flashcardService.generateFromContent(content.id, deck.id, flashcardCount)
      toast.success(`Generated ${cards.length} flashcards`)
      setShowFlashcardModal(false)
      setDeckName('')
      navigate('/flashcards')
    } catch {
      toast.error('Failed to generate flashcards')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEdit = async () => {
    if (!content) return
    setIsProcessing(true)
    try {
      await contentService.update(content.id, {
        title: editTitle,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('Content updated')
      setShowEditModal(false)
      fetchContent(content.id)
    } catch {
      toast.error('Failed to update content')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!content) return
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteContent(content.id)
        toast.success('Content deleted')
        navigate('/content')
      } catch {
        toast.error('Failed to delete content')
      }
    }
  }

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleReadAloud = () => {
    if (!content) return

    // Check for browser support
    if (!window.speechSynthesis) {
      toast.error('Text-to-speech is not supported in this browser')
      return
    }

    // If already speaking, stop
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      toast.success('Stopped reading')
      return
    }

    // Get the text to read
    const textToRead = content.text_content || content.summary || content.title
    
    if (!textToRead) {
      toast.error('No text content available to read')
      return
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(textToRead)
    speechSynthRef.current = utterance

    // Configure voice settings
    utterance.rate = 1.0  // Speed: 0.1 to 10
    utterance.pitch = 1.0 // Pitch: 0 to 2
    utterance.volume = 1.0 // Volume: 0 to 1

    // Try to get a good English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.startsWith('en'))
    
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true)
      toast.success('🔊 Reading aloud...')
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsSpeaking(false)
      toast.error('Failed to read content')
    }

    // Start speaking
    window.speechSynthesis.speak(utterance)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Content not found</h2>
        <p className="text-zinc-500 mb-4">The content you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/content')}>
          <ArrowBack style={{ fontSize: 16 }} className="mr-1" />
          Back to Content
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/content')}>
          <ArrowBack style={{ fontSize: 16 }} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{content.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="primary">{content.content_type}</Badge>
            <span className="text-zinc-600 text-sm">
              Added {new Date(content.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {isOwner && (
          <>
            <Button
              variant={content.is_favorite ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleFavorite(content.id)}
            >
              <Star style={{ fontSize: 16 }} className="mr-1" />
              {content.is_favorite ? 'Favorited' : 'Favorite'}
            </Button>
            <Button
              variant={content.is_pinned ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => togglePin(content.id)}
            >
              <PushPin style={{ fontSize: 16 }} className="mr-1" />
              {content.is_pinned ? 'Pinned' : 'Pin'}
            </Button>
            <Button
              variant={content.is_archived ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleArchive(content.id)}
            >
              <Archive style={{ fontSize: 16 }} className="mr-1" />
              {content.is_archived ? 'Archived' : 'Archive'}
            </Button>
          </>
        )}
        <Button
          variant={isSpeaking ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleReadAloud}
        >
          {isSpeaking ? (
            <>
              <Stop style={{ fontSize: 16 }} className="mr-1" />
              Stop Reading
            </>
          ) : (
            <>
              <VolumeUp style={{ fontSize: 16 }} className="mr-1" />
              Read Aloud
            </>
          )}
        </Button>
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShareUserQuery('')
              setShareMessage('')
              setUserSearchResults([])
              setShowShareModal(true)
            }}
          >
            <Share style={{ fontSize: 16 }} className="mr-1" />
            Share
          </Button>
        )}
        <div className="flex-1" />
        {isOwner && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowFlashcardModal(true)} disabled={isProcessing}>
              <Style style={{ fontSize: 16 }} className="mr-1" />
              Generate Flashcards
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExtractTasks} disabled={isProcessing}>
              <Task style={{ fontSize: 16 }} className="mr-1" />
              Extract Tasks
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(true)} disabled={isProcessing}>
              <Edit style={{ fontSize: 16 }} className="mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReprocess} disabled={isProcessing}>
              <Refresh style={{ fontSize: 16 }} className={isProcessing ? 'animate-spin mr-1' : 'mr-1'} />
              Reprocess
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Delete style={{ fontSize: 16 }} />
            </Button>
          </>
        )}
        {!isOwner && (
          <span className="text-zinc-500 text-sm italic">Viewing shared content (read-only)</span>
        )}
      </div>

      {/* Tags and Subjects */}
      {(content.subjects?.length > 0 || content.tags?.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {content.subjects?.map((subject) => (
            <Badge key={subject} variant="primary">
              {subject}
            </Badge>
          ))}
          {content.tags?.map((tag) => (
            <Badge key={tag} variant="default">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Summary */}
      {content.summary && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
            <p className="text-zinc-400 leading-relaxed">{content.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {content.text_content && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-white mb-4">Content</h3>
            <div className="markdown-content prose prose-invert max-w-none">
              <ReactMarkdown>{content.text_content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-zinc-600 text-sm">Type</dt>
              <dd className="text-white capitalize">{content.content_type}</dd>
            </div>
            <div>
              <dt className="text-zinc-600 text-sm">Status</dt>
              <dd className="text-white capitalize">{content.processing_status}</dd>
            </div>
            <div>
              <dt className="text-zinc-600 text-sm">Created</dt>
              <dd className="text-white">
                {new Date(content.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-600 text-sm">Updated</dt>
              <dd className="text-white">
                {new Date(content.updated_at).toLocaleString()}
              </dd>
            </div>
            {content.source && (
              <div className="col-span-2">
                <dt className="text-zinc-600 text-sm">Source</dt>
                <dd className="text-white break-all">{content.source}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Related Content (AI Recommendations) */}
      {(isLoadingRecs || recommendations.length > 0) && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Recommend style={{ fontSize: 18 }} className="text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Related Content</h3>
            </div>
            {isLoadingRecs ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => navigate(`/content/${rec.id}`)}
                    className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-all text-left group border border-zinc-800/50 hover:border-zinc-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate group-hover:text-indigo-300">
                        {rec.title}
                      </p>
                      {rec.summary && (
                        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{rec.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" size="sm">{rec.content_type}</Badge>
                        <span className="text-xs text-zinc-600">
                          {Math.round(rec.similarity_score * 100)}% match
                        </span>
                      </div>
                    </div>
                    <OpenInNew style={{ fontSize: 16 }} className="text-zinc-600 group-hover:text-indigo-400 mt-1 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Flashcards Modal */}
      <Modal
        isOpen={showFlashcardModal}
        onClose={() => setShowFlashcardModal(false)}
        title="Generate Flashcards"
      >
        <div className="space-y-4">
          <Input
            label="Deck Name"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name..."
          />
          <Input
            label="Number of Flashcards"
            type="number"
            value={flashcardCount}
            onChange={(e) => setFlashcardCount(parseInt(e.target.value) || 10)}
            min={1}
            max={50}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowFlashcardModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateFlashcards} disabled={isProcessing}>
              {isProcessing ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Content Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Content"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Content title..."
          />
          <Input
            label="Tags (comma separated)"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="tag1, tag2, tag3..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Share "${content.title}"`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Message (optional)
            </label>
            <Input
              placeholder="Add a note..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Search users
            </label>
            <div className="relative">
              <PersonSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Type a username or name..."
                value={shareUserQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {isSearchingUsers && (
            <div className="text-center text-zinc-500 text-sm py-2">Searching...</div>
          )}
          {userSearchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleShare(user.username)}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-all text-left border border-zinc-800/50 hover:border-zinc-700"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.username}</p>
                    {user.full_name && (
                      <p className="text-zinc-500 text-xs truncate">{user.full_name}</p>
                    )}
                  </div>
                  <Send style={{ fontSize: 16 }} className="text-indigo-400" />
                </button>
              ))}
            </div>
          )}
          {shareUserQuery.length >= 2 && !isSearchingUsers && userSearchResults.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-2">No users found</p>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
