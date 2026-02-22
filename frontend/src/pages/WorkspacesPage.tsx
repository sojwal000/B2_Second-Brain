import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Workspaces as WorkspacesIcon,
  Add,
  Delete,
  PersonAdd,
  PersonRemove,
  Article,
  ArrowBack,
  Close,
  Group,
} from '@mui/icons-material'
import { Button, Card, CardContent, Modal } from '../components/ui'
import workspaceService, {
  WorkspaceItem, WorkspaceDetail
} from '../services/workspaceService'
import { contentService } from '../services'
import type { Content } from '../types'
import toast from 'react-hot-toast'

type ViewMode = 'list' | 'detail'

export default function WorkspacesPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWs, setSelectedWs] = useState<WorkspaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddContent, setShowAddContent] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)

  // Forms
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [memberUsername, setMemberUsername] = useState('')
  const [memberRole, setMemberRole] = useState('viewer')
  const [userContents, setUserContents] = useState<Content[]>([])
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true)
      const data = await workspaceService.listWorkspaces()
      setWorkspaces(data.items)
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openWorkspace = async (id: number) => {
    try {
      const detail = await workspaceService.getWorkspace(id)
      setSelectedWs(detail)
      setView('detail')
    } catch (error) {
      toast.error('Failed to load workspace')
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await workspaceService.createWorkspace(newName, newDesc || undefined)
      toast.success('Workspace created!')
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      loadWorkspaces()
    } catch (error) {
      toast.error('Failed to create workspace')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await workspaceService.deleteWorkspace(id)
      toast.success('Workspace deleted')
      setShowDeleteConfirm(null)
      if (selectedWs?.id === id) {
        setSelectedWs(null)
        setView('list')
      }
      loadWorkspaces()
    } catch (error) {
      toast.error('Failed to delete workspace')
    }
  }

  const handleAddMember = async () => {
    if (!selectedWs || !memberUsername.trim()) return
    try {
      await workspaceService.addMember(selectedWs.id, memberUsername, memberRole)
      toast.success(`Added ${memberUsername}`)
      setShowAddMember(false)
      setMemberUsername('')
      setMemberRole('viewer')
      openWorkspace(selectedWs.id)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (userId: number) => {
    if (!selectedWs) return
    try {
      await workspaceService.removeMember(selectedWs.id, userId)
      toast.success('Member removed')
      openWorkspace(selectedWs.id)
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const openAddContent = async () => {
    try {
      const data = await contentService.list({ page: 1, page_size: 100 })
      setUserContents(data.items)
      setShowAddContent(true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleAddContent = async () => {
    if (!selectedWs || !selectedContentId) return
    try {
      await workspaceService.addContent(selectedWs.id, selectedContentId)
      toast.success('Content added to workspace')
      setShowAddContent(false)
      setSelectedContentId(null)
      openWorkspace(selectedWs.id)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add content')
    }
  }

  const handleRemoveContent = async (contentId: number) => {
    if (!selectedWs) return
    try {
      await workspaceService.removeContent(selectedWs.id, contentId)
      toast.success('Content removed')
      openWorkspace(selectedWs.id)
    } catch (error) {
      toast.error('Failed to remove content')
    }
  }

  const roleColors: Record<string, string> = {
    owner: 'bg-yellow-600/20 text-yellow-400',
    admin: 'bg-purple-600/20 text-purple-400',
    editor: 'bg-blue-600/20 text-blue-400',
    viewer: 'bg-secondary-700 text-secondary-300',
  }

  // ========== LIST VIEW ==========
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <WorkspacesIcon className="text-primary-400" /> Workspaces
            </h1>
            <p className="text-secondary-400 mt-1">Collaborate with others on shared content</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Add className="w-4 h-4 mr-1" /> New Workspace
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
          </div>
        ) : workspaces.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <WorkspacesIcon className="text-secondary-600 mx-auto mb-4" style={{ fontSize: 48 }} />
              <h3 className="text-lg font-medium text-secondary-300 mb-2">No Workspaces</h3>
              <p className="text-secondary-500 mb-4">Create a workspace to collaborate with others</p>
              <Button onClick={() => setShowCreate(true)}>Create Workspace</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary-500/50 transition-colors"
                  onClick={() => openWorkspace(ws.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-white">{ws.name}</h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(ws.id) }}
                        className="text-secondary-500 hover:text-red-400"
                      >
                        <Delete fontSize="small" />
                      </button>
                    </div>
                    {ws.description && (
                      <p className="text-sm text-secondary-400 mb-3 line-clamp-2">{ws.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-secondary-500">
                      <span className="flex items-center gap-1">
                        <Group fontSize="inherit" /> {ws.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Article fontSize="inherit" /> {ws.content_count} items
                      </span>
                    </div>
                    <p className="text-xs text-secondary-500 mt-2">
                      by {ws.owner_username} · {new Date(ws.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Workspace">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-secondary-300 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Workspace name"
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-secondary-300 mb-1">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this workspace for?"
                rows={3}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
            </div>
          </div>
        </Modal>

        {/* Delete confirmation */}
        <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Workspace">
          <p className="text-secondary-300 mb-4">This will permanently delete the workspace and remove all members. Content will not be deleted.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  // ========== DETAIL VIEW ==========
  if (view === 'detail' && selectedWs) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelectedWs(null) }} className="text-secondary-400 hover:text-white">
              <ArrowBack />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedWs.name}</h1>
              {selectedWs.description && (
                <p className="text-secondary-400 mt-0.5">{selectedWs.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddMember(true)}>
              <PersonAdd fontSize="small" className="mr-1" /> Add Member
            </Button>
            <Button size="sm" onClick={openAddContent}>
              <Add fontSize="small" className="mr-1" /> Add Content
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Members */}
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <h2 className="text-sm font-medium text-secondary-300 mb-3 flex items-center gap-2">
                <Group fontSize="small" /> Members ({selectedWs.members.length})
              </h2>
              <div className="space-y-2">
                {selectedWs.members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-sm text-primary-400 font-medium">
                        {(m.full_name || m.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white">{m.full_name || m.username}</p>
                        <p className="text-xs text-secondary-500">@{m.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${roleColors[m.role] || roleColors.viewer}`}>
                        {m.role}
                      </span>
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-secondary-500 hover:text-red-400"
                        >
                          <PersonRemove style={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <h2 className="text-sm font-medium text-secondary-300 mb-3 flex items-center gap-2">
                <Article fontSize="small" /> Content ({selectedWs.contents.length})
              </h2>
              {selectedWs.contents.length === 0 ? (
                <p className="text-secondary-500 text-sm py-4 text-center">No content added yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedWs.contents.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary-800/50 hover:bg-secondary-800 transition-colors"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/content/${c.content_id}`)}
                      >
                        <p className="text-sm text-white">{c.content_title || 'Untitled'}</p>
                        <p className="text-xs text-secondary-500">
                          {c.content_type} · added by {c.added_by_username} · {new Date(c.added_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveContent(c.content_id)}
                        className="text-secondary-500 hover:text-red-400 ml-2"
                      >
                        <Close fontSize="small" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Member Modal */}
        <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-secondary-300 mb-1">Username</label>
              <input
                type="text"
                value={memberUsername}
                onChange={e => setMemberUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-secondary-300 mb-1">Role</label>
              <select
                value={memberRole}
                onChange={e => setMemberRole(e.target.value)}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="viewer">Viewer - Can view content</option>
                <option value="editor">Editor - Can add/remove content</option>
                <option value="admin">Admin - Can manage members</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddMember(false)}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={!memberUsername.trim()}>Add</Button>
            </div>
          </div>
        </Modal>

        {/* Add Content Modal */}
        <Modal isOpen={showAddContent} onClose={() => setShowAddContent(false)} title="Add Content to Workspace">
          <div className="space-y-4">
            <select
              value={selectedContentId || ''}
              onChange={e => setSelectedContentId(Number(e.target.value) || null)}
              className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select content...</option>
              {userContents
                .filter(c => !selectedWs.contents.some(wc => wc.content_id === c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.content_type})</option>
                ))
              }
            </select>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddContent(false)}>Cancel</Button>
              <Button onClick={handleAddContent} disabled={!selectedContentId}>Add</Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return null
}
