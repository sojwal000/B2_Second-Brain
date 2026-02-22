import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Add,
  CloudUpload,
  Description,
  Image,
  AudioFile,
  VideoFile,
  Code,
  Link as LinkIcon,
  FilterList,
  Search,
  Star,
  PushPin,
  MoreVert,
  Mic,
  Stop,
  Share,
  People,
  PersonSearch,
  Inbox,
  Send,
} from '@mui/icons-material'
import { Card, CardContent, Button, Input, Badge, Modal, TextArea } from '../components/ui'
import { useContentStore } from '../store/contentStore'
import { sharingService } from '../services'
import type { Content, ContentType, SharedContentItem, UserSearchResult } from '../types'
import toast from 'react-hot-toast'

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  text: Description,
  document: Description,
  image: Image,
  audio: AudioFile,
  video: VideoFile,
  code: Code,
  url: LinkIcon,
}

const contentTypeColors: Record<ContentType, string> = {
  text: 'bg-blue-500/10 text-blue-400',
  document: 'bg-purple-500/10 text-purple-400',
  image: 'bg-green-500/10 text-green-400',
  audio: 'bg-orange-500/10 text-orange-400',
  video: 'bg-red-500/10 text-red-400',
  code: 'bg-yellow-500/10 text-yellow-400',
  url: 'bg-cyan-500/10 text-cyan-400',
}

export default function ContentPage() {
  const navigate = useNavigate()
  const {
    contents,
    isLoading,
    pagination,
    filters,
    fetchContents,
    uploadFile,
    createText,
    toggleFavorite,
    togglePin,
    setFilters,
    setPage,
  } = useContentStore()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Text content form
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')

  // Audio recording
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTitle, setRecordingTitle] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sharing
  const [activeTab, setActiveTab] = useState<'my-content' | 'shared-with-me'>('my-content')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareContentId, setShareContentId] = useState<number | null>(null)
  const [shareContentTitle, setShareContentTitle] = useState('')
  const [shareUserQuery, setShareUserQuery] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [sharedWithMe, setSharedWithMe] = useState<SharedContentItem[]>([])
  const [isLoadingShared, setIsLoadingShared] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const userSearchTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchContents()
    loadUnreadCount()
  }, [])

  // Load shared-with-me content when tab changes
  useEffect(() => {
    if (activeTab === 'shared-with-me') {
      loadSharedWithMe()
    }
  }, [activeTab])

  const loadUnreadCount = async () => {
    try {
      const count = await sharingService.getUnreadCount()
      setUnreadCount(count)
    } catch { /* ignore */ }
  }

  const loadSharedWithMe = async () => {
    setIsLoadingShared(true)
    try {
      const response = await sharingService.getSharedWithMe()
      setSharedWithMe(response.items)
    } catch (error) {
      console.error('Failed to load shared content:', error)
      toast.error('Failed to load shared content')
    } finally {
      setIsLoadingShared(false)
    }
  }

  const openShareModal = (contentId: number, title: string) => {
    setShareContentId(contentId)
    setShareContentTitle(title)
    setShareUserQuery('')
    setShareMessage('')
    setUserSearchResults([])
    setShowShareModal(true)
  }

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
    if (!shareContentId) return
    setIsSharing(true)
    try {
      await sharingService.shareContent(shareContentId, username, shareMessage || undefined)
      toast.success(`Shared "${shareContentTitle}" with ${username}`)
      setShowShareModal(false)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to share'
      toast.error(msg)
    } finally {
      setIsSharing(false)
    }
  }

  const handleMarkAsRead = async (shareId: number) => {
    try {
      await sharingService.markAsRead(shareId)
      setSharedWithMe(prev => prev.map(s => s.id === shareId ? { ...s, is_read: true } : s))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        await uploadFile(acceptedFiles[i])
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100)
      }
      setShowUploadModal(false)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'audio/*': ['.mp3', '.wav'],
      'video/*': ['.mp4', '.webm'],
    },
  })

  const handleTextSubmit = async () => {
    if (!textTitle.trim() || !textContent.trim()) return

    try {
      await createText({
        title: textTitle,
        text_content: textContent,
      })
      setShowTextModal(false)
      setTextTitle('')
      setTextContent('')
    } catch (error) {
      console.error('Failed to create text content:', error)
    }
  }

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success('🎤 Recording started...')
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to access microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      toast.success('Recording stopped')
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setAudioBlob(null)
    setRecordingTime(0)
    setRecordingTitle('')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setShowRecordModal(false)
  }

  const saveRecording = async () => {
    if (!audioBlob) {
      toast.error('No recording to save')
      return
    }

    // Generate safe filename (no special characters)
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const safeTitle = recordingTitle.trim().replace(/[<>:"/\\|?*]/g, '_') || `Recording_${timestamp}`
    const file = new File([audioBlob], `${safeTitle}.webm`, { type: 'audio/webm' })

    setIsUploading(true)
    try {
      await uploadFile(file)
      toast.success('Recording saved successfully!')
      cancelRecording()
    } catch (error) {
      console.error('Failed to save recording:', error)
      toast.error('Failed to save recording')
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ search: searchQuery })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Library</h1>
          <p className="text-secondary-400">Manage your knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowTextModal(true)}>
            <Add fontSize="small" className="mr-1" />
            Add Text
          </Button>
          <Button variant="secondary" onClick={() => setShowRecordModal(true)}>
            <Mic fontSize="small" className="mr-1" />
            Record Audio
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <CloudUpload fontSize="small" className="mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-secondary-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('my-content')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my-content'
              ? 'bg-primary-600 text-white'
              : 'text-secondary-400 hover:text-white hover:bg-secondary-700'
          }`}
        >
          My Content
        </button>
        <button
          onClick={() => setActiveTab('shared-with-me')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'shared-with-me'
              ? 'bg-primary-600 text-white'
              : 'text-secondary-400 hover:text-white hover:bg-secondary-700'
          }`}
        >
          <Inbox fontSize="small" />
          Shared With Me
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      {activeTab === 'my-content' && (
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        <div className="flex items-center gap-2">
          <Button
            variant={filters.isFavorite ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilters({ isFavorite: !filters.isFavorite })}
          >
            <Star fontSize="small" />
          </Button>
          <Button
            variant={filters.isPinned ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilters({ isPinned: !filters.isPinned })}
          >
            <PushPin fontSize="small" />
          </Button>
          <Button variant="ghost" size="sm">
            <FilterList fontSize="small" className="mr-1" />
            Filters
          </Button>
        </div>
      </div>
      )}

      {/* Content Grid or Shared With Me */}
      {activeTab === 'my-content' ? (
      <>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : contents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {contents.map((content, index) => (
              <ContentCard
                key={content.id}
                content={content}
                index={index}
                onClick={() => navigate(`/content/${content.id}`)}
                onFavorite={() => toggleFavorite(content.id)}
                onPin={() => togglePin(content.id)}
                onShare={() => openShareModal(content.id, content.title)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <CloudUpload className="text-secondary-500 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
          <p className="text-secondary-400 mb-4">
            Upload files or add text to start building your knowledge base
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Add fontSize="small" className="mr-1" />
            Add Content
          </Button>
        </Card>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === pagination.page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}
      </>
      ) : (
        /* Shared With Me Tab */
        <>
          {isLoadingShared ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : sharedWithMe.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {sharedWithMe.map((item, index) => (
                  <SharedContentCard
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => {
                      if (!item.is_read) handleMarkAsRead(item.id)
                      navigate(`/content/${item.content_id}`)
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Inbox className="text-secondary-500 text-5xl mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No shared content</h3>
              <p className="text-secondary-400">
                When someone shares content with you, it will appear here
              </p>
            </Card>
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Content"
        size="lg"
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-secondary-600 hover:border-secondary-500'
          }`}
        >
          <input {...getInputProps()} />
          <CloudUpload className="text-secondary-400 text-5xl mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-white">Drop files here...</p>
          ) : (
            <>
              <p className="text-white mb-2">Drag & drop files here</p>
              <p className="text-secondary-500 text-sm">
                or click to browse (PDF, DOCX, TXT, MD, images, audio, video)
              </p>
            </>
          )}
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-secondary-400 mb-2">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Text Modal */}
      <Modal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        title="Add Text Content"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Enter a title..."
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <TextArea
            label="Content"
            placeholder="Enter your text content..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={10}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowTextModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTextSubmit} disabled={!textTitle || !textContent}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Audio Modal */}
      <Modal
        isOpen={showRecordModal}
        onClose={cancelRecording}
        title="Record Audio"
        size="md"
      >
        <div className="space-y-6">
          <Input
            label="Recording Title (optional)"
            placeholder="Enter a title for your recording..."
            value={recordingTitle}
            onChange={(e) => setRecordingTitle(e.target.value)}
          />

          <div className="flex flex-col items-center py-8">
            {/* Recording indicator */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${
              isRecording 
                ? 'bg-red-500/20 animate-pulse' 
                : audioBlob 
                  ? 'bg-green-500/20' 
                  : 'bg-secondary-700'
            }`}>
              <Mic className={`text-4xl ${
                isRecording 
                  ? 'text-red-500' 
                  : audioBlob 
                    ? 'text-green-500' 
                    : 'text-secondary-400'
              }`} />
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono text-white mb-4">
              {formatTime(recordingTime)}
            </div>

            {/* Status text */}
            <p className="text-secondary-400 text-sm">
              {isRecording 
                ? 'Recording in progress...' 
                : audioBlob 
                  ? 'Recording complete! Ready to save.' 
                  : 'Click the button below to start recording'}
            </p>
          </div>

          {/* Audio preview */}
          {audioBlob && !isRecording && (
            <div className="bg-secondary-800 rounded-lg p-4">
              <audio 
                controls 
                className="w-full" 
                src={URL.createObjectURL(audioBlob)}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} className="px-8">
                <Mic fontSize="small" className="mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button variant="danger" onClick={stopRecording} className="px-8">
                <Stop fontSize="small" className="mr-2" />
                Stop Recording
              </Button>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button variant="secondary" onClick={() => {
                  setAudioBlob(null)
                  setRecordingTime(0)
                }}>
                  Record Again
                </Button>
                <Button onClick={saveRecording} disabled={isUploading}>
                  {isUploading ? 'Saving...' : 'Save Recording'}
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={cancelRecording}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Share "${shareContentTitle}"`}
        size="md"
      >
        <div className="space-y-4">
          {/* Optional message */}
          <TextArea
            label="Message (optional)"
            placeholder="Add a note for the recipient..."
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            rows={2}
          />

          {/* User search */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-1">
              Search users to share with
            </label>
            <div className="relative">
              <PersonSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" />
              <Input
                placeholder="Type a username or name..."
                value={shareUserQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User results */}
          {isSearchingUsers && (
            <div className="text-center text-secondary-400 text-sm py-2">Searching...</div>
          )}
          {userSearchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleShare(user.username)}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary-800 hover:bg-secondary-700 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.username}</p>
                    {user.full_name && (
                      <p className="text-secondary-400 text-xs truncate">{user.full_name}</p>
                    )}
                  </div>
                  <Send fontSize="small" className="text-primary-400" />
                </button>
              ))}
            </div>
          )}
          {shareUserQuery.length >= 2 && !isSearchingUsers && userSearchResults.length === 0 && (
            <p className="text-secondary-500 text-sm text-center py-2">No users found</p>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface ContentCardProps {
  content: Content
  index: number
  onClick: () => void
  onFavorite: () => void
  onPin: () => void
  onShare: () => void
}

function ContentCard({ content, index, onClick, onFavorite, onPin, onShare }: ContentCardProps) {
  const Icon = contentTypeIcons[content.content_type] || Description
  const colorClass = contentTypeColors[content.content_type] || 'bg-secondary-500/10 text-secondary-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hoverable onClick={onClick} className="h-full">
        <CardContent>
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon fontSize="small" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFavorite()
                }}
                className={`p-1 rounded hover:bg-secondary-700 transition-colors ${
                  content.is_favorite ? 'text-yellow-400' : 'text-secondary-500'
                }`}
              >
                <Star fontSize="small" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPin()
                }}
                className={`p-1 rounded hover:bg-secondary-700 transition-colors ${
                  content.is_pinned ? 'text-primary-400' : 'text-secondary-500'
                }`}
              >
                <PushPin fontSize="small" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare()
                }}
                className="p-1 rounded hover:bg-secondary-700 transition-colors text-secondary-500 hover:text-primary-400"
              >
                <Share fontSize="small" />
              </button>
              <button className="p-1 rounded hover:bg-secondary-700 transition-colors text-secondary-500">
                <MoreVert fontSize="small" />
              </button>
            </div>
          </div>

          <h3 className="font-medium text-white mb-2 line-clamp-2">{content.title}</h3>

          {content.summary && (
            <p className="text-secondary-400 text-sm mb-3 line-clamp-2">
              {content.summary}
            </p>
          )}

          <div className="flex flex-wrap gap-1">
            {content.subjects?.slice(0, 2).map((subject) => (
              <Badge key={subject} variant="primary" size="sm">
                {subject}
              </Badge>
            ))}
            {content.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-secondary-700">
            <span className="text-xs text-secondary-500 capitalize">
              {content.content_type}
            </span>
            <span className="text-xs text-secondary-500">
              {new Date(content.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Shared Content Card
interface SharedContentCardProps {
  item: SharedContentItem
  index: number
  onClick: () => void
}

function SharedContentCard({ item, index, onClick }: SharedContentCardProps) {
  const Icon = contentTypeIcons[item.content_type] || Description
  const colorClass = contentTypeColors[item.content_type] || 'bg-secondary-500/10 text-secondary-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hoverable onClick={onClick} className={`h-full ${!item.is_read ? 'ring-1 ring-primary-500/50' : ''}`}>
        <CardContent>
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon fontSize="small" />
            </div>
            <div className="flex items-center gap-2">
              {!item.is_read && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500" title="Unread" />
              )}
              <People fontSize="small" className="text-secondary-500" />
            </div>
          </div>

          <h3 className="font-medium text-white mb-2 line-clamp-2">
            {item.content_title || 'Untitled'}
          </h3>

          {item.content_summary && (
            <p className="text-secondary-400 text-sm mb-2 line-clamp-2">
              {item.content_summary}
            </p>
          )}

          {item.message && (
            <div className="bg-secondary-800 rounded-lg px-3 py-2 mb-3">
              <p className="text-secondary-300 text-xs italic line-clamp-2">"{item.message}"</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-secondary-700">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-[10px] text-white font-bold">
                {(item.shared_by_fullname || item.shared_by_username).charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-secondary-400 truncate max-w-[100px]">
                {item.shared_by_fullname || item.shared_by_username}
              </span>
            </div>
            <span className="text-xs text-secondary-500">
              {new Date(item.shared_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
