import { useEffect, useState, useCallback } from 'react'
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
} from '@mui/icons-material'
import { Card, CardContent, Button, Input, Badge, Modal, TextArea } from '../components/ui'
import { useContentStore } from '../store/contentStore'
import type { Content, ContentType } from '../types'

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

  useEffect(() => {
    fetchContents()
  }, [])

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
          <Button onClick={() => setShowUploadModal(true)}>
            <CloudUpload fontSize="small" className="mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
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

      {/* Content Grid */}
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
    </div>
  )
}

interface ContentCardProps {
  content: Content
  index: number
  onClick: () => void
  onFavorite: () => void
  onPin: () => void
}

function ContentCard({ content, index, onClick, onFavorite, onPin }: ContentCardProps) {
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
