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
  text: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  document: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  image: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  audio: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  video: 'bg-red-500/10 text-red-400 border border-red-500/20',
  code: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  url: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
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
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Content Library</h1>
          <p className="text-zinc-500 mt-1">Manage your knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowTextModal(true)}>
            <Add style={{ fontSize: 16 }} className="mr-1" />
            Add Text
          </Button>
          <Button variant="secondary" onClick={() => setShowRecordModal(true)}>
            <Mic style={{ fontSize: 16 }} className="mr-1" />
            Record Audio
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <CloudUpload style={{ fontSize: 16 }} className="mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 w-fit border border-zinc-800/50">
        <button
          onClick={() => setActiveTab('my-content')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'my-content'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          My Content
        </button>
        <button
          onClick={() => setActiveTab('shared-with-me')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'shared-with-me'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          <Inbox style={{ fontSize: 16 }} />
          Shared With Me
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
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
            <Star style={{ fontSize: 16 }} />
          </Button>
          <Button
            variant={filters.isPinned ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilters({ isPinned: !filters.isPinned })}
          >
            <PushPin style={{ fontSize: 16 }} />
          </Button>
          <Button variant="ghost" size="sm">
            <FilterList style={{ fontSize: 16 }} className="mr-1" />
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
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
          <CloudUpload className="text-zinc-700 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
          <p className="text-zinc-500 mb-6">
            Upload files or add text to start building your knowledge base
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Add style={{ fontSize: 16 }} className="mr-1" />
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
              <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
              <Inbox className="text-zinc-700 text-5xl mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No shared content</h3>
              <p className="text-zinc-500">
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
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <input {...getInputProps()} />
          <CloudUpload className="text-zinc-600 text-5xl mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-white">Drop files here...</p>
          ) : (
            <>
              <p className="text-white mb-2">Drag & drop files here</p>
              <p className="text-zinc-600 text-sm">
                or click to browse (PDF, DOCX, TXT, MD, images, audio, video)
              </p>
            </>
          )}
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-zinc-500 mb-2">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
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
                  ? 'bg-emerald-500/20' 
                  : 'bg-zinc-800'
            }`}>
              <Mic className={`text-4xl ${
                isRecording 
                  ? 'text-red-500' 
                  : audioBlob 
                    ? 'text-emerald-500' 
                    : 'text-zinc-500'
              }`} />
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono text-white mb-4">
              {formatTime(recordingTime)}
            </div>

            {/* Status text */}
            <p className="text-zinc-500 text-sm">
              {isRecording 
                ? 'Recording in progress...' 
                : audioBlob 
                  ? 'Recording complete! Ready to save.' 
                  : 'Click the button below to start recording'}
            </p>
          </div>

          {/* Audio preview */}
          {audioBlob && !isRecording && (
            <div className="bg-zinc-800/60 rounded-xl p-4">
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
                <Mic style={{ fontSize: 16 }} className="mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button variant="danger" onClick={stopRecording} className="px-8">
                <Stop style={{ fontSize: 16 }} className="mr-2" />
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
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Search users to share with
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

          {/* User results */}
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
  const colorClass = contentTypeColors[content.content_type] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'

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
            <div className={`p-2.5 rounded-xl ${colorClass}`}>
              <Icon style={{ fontSize: 18 }} />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFavorite()
                }}
                className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors ${
                  content.is_favorite ? 'text-amber-400' : 'text-zinc-600'
                }`}
              >
                <Star style={{ fontSize: 16 }} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPin()
                }}
                className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors ${
                  content.is_pinned ? 'text-indigo-400' : 'text-zinc-600'
                }`}
              >
                <PushPin style={{ fontSize: 16 }} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare()
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-600 hover:text-indigo-400"
              >
                <Share style={{ fontSize: 16 }} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-600">
                <MoreVert style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>

          <h3 className="font-medium text-white mb-2 line-clamp-2">{content.title}</h3>

          {content.summary && (
            <p className="text-zinc-500 text-sm mb-3 line-clamp-2">
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

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-600 capitalize">
              {content.content_type}
            </span>
            <span className="text-xs text-zinc-600">
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
  const colorClass = contentTypeColors[item.content_type] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hoverable onClick={onClick} className={`h-full ${!item.is_read ? 'ring-1 ring-indigo-500/40' : ''}`}>
        <CardContent>
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${colorClass}`}>
              <Icon style={{ fontSize: 18 }} />
            </div>
            <div className="flex items-center gap-2">
              {!item.is_read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" title="Unread" />
              )}
              <People style={{ fontSize: 16 }} className="text-zinc-600" />
            </div>
          </div>

          <h3 className="font-medium text-white mb-2 line-clamp-2">
            {item.content_title || 'Untitled'}
          </h3>

          {item.content_summary && (
            <p className="text-zinc-500 text-sm mb-2 line-clamp-2">
              {item.content_summary}
            </p>
          )}

          {item.message && (
            <div className="bg-zinc-800/60 rounded-xl px-3 py-2 mb-3">
              <p className="text-zinc-400 text-xs italic line-clamp-2">"{item.message}"</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                {(item.shared_by_fullname || item.shared_by_username).charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-zinc-500 truncate max-w-[100px]">
                {item.shared_by_fullname || item.shared_by_username}
              </span>
            </div>
            <span className="text-xs text-zinc-600">
              {new Date(item.shared_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
