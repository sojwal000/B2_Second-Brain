import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isPast, isToday } from 'date-fns'
import {
  Add,
  CheckCircle,
  RadioButtonUnchecked,
  Flag,
  Schedule,
  FilterList,
  MoreVert,
  Delete,
  Edit,
  Mic,
  MicOff,
  Stop,
} from '@mui/icons-material'
import { Button, Card, CardContent, Input, Modal, TextArea, Badge } from '../components/ui'
import { taskService } from '../services'
import type { Task, TaskStatus, TaskPriority } from '../types'
import toast from 'react-hot-toast'

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-zinc-500',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
}

const priorityBadgeVariants: Record<TaskPriority, 'default' | 'info' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [filter])

  const loadTasks = async () => {
    setIsLoading(true)
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const data = await taskService.list(params)
      setTasks(data.items)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Voice recording functions
  const startVoiceRecording = async () => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    // First, request microphone permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately, we just needed to get permission
      stream.getTracks().forEach(track => track.stop())
    } catch (err) {
      console.error('Microphone permission error:', err)
      toast.error('Microphone access denied. Please allow microphone access in your browser settings.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true  // Keep listening until manually stopped
    recognition.interimResults = true  // Show interim results
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    let finalTranscript = ''
    let silenceTimer: NodeJS.Timeout | null = null

    recognition.onstart = () => {
      setIsRecording(true)
      finalTranscript = ''
      toast.success('🎤 Listening... Speak now and click Stop when done', { duration: 4000 })
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Reset silence timer on any speech
      if (silenceTimer) clearTimeout(silenceTimer)
      
      // Auto-stop after 2 seconds of silence if we have a final transcript
      if (finalTranscript.trim()) {
        silenceTimer = setTimeout(() => {
          if (recognitionRef.current && finalTranscript.trim()) {
            recognition.stop()
          }
        }, 2000)
      }
      
      console.log('Interim:', interimTranscript, 'Final:', finalTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access in browser settings.')
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Make sure your microphone is working and speak clearly.')
      } else if (event.error === 'audio-capture') {
        toast.error('No microphone found. Please connect a microphone and try again.')
      } else if (event.error === 'network') {
        toast.error('Network error. Please check your internet connection.')
      } else {
        toast.error(`Voice recognition error: ${event.error}`)
      }
    }

    recognition.onend = async () => {
      setIsRecording(false)
      if (silenceTimer) clearTimeout(silenceTimer)
      
      const trimmedTranscript = finalTranscript.trim()
      
      if (trimmedTranscript) {
        setIsProcessingVoice(true)
        try {
          const task = await taskService.create({
            title: trimmedTranscript,
            priority: 'medium',
          })
          setTasks((prev) => [task, ...prev])
          toast.success(`✅ Task added: "${trimmedTranscript}"`)
        } catch (error) {
          toast.error('Failed to create task from voice')
        } finally {
          setIsProcessingVoice(false)
        }
      }
    }

    recognitionRef.current = recognition
    
    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      toast.error('Failed to start voice recognition. Please try again.')
    }
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const createTask = async () => {
    if (!newTitle.trim()) return

    try {
      const task = await taskService.create({
        title: newTitle,
        description: newDescription || undefined,
        priority: newPriority,
        due_date: newDueDate || undefined,
      })
      setTasks((prev) => [task, ...prev])
      setShowCreateModal(false)
      resetForm()
      toast.success('Task created!')
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const toggleTask = async (task: Task) => {
    try {
      const updated = await taskService.toggleComplete(task.id)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await taskService.delete(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      toast.success('Task deleted')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const resetForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewPriority('medium')
    setNewDueDate('')
  }

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === 'pending')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'completed')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
          <p className="text-zinc-500 mt-1">Manage your to-dos and action items</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? 'danger' : 'secondary'}
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isProcessingVoice}
          >
            {isProcessingVoice ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : isRecording ? (
              <>
                <Stop style={{ fontSize: 16 }} className="mr-1" />
                Stop
              </>
            ) : (
              <>
                <Mic style={{ fontSize: 16 }} className="mr-1" />
                Add Voice
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Add style={{ fontSize: 16 }} className="mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all'
              ? 'All'
              : status === 'pending'
              ? 'To Do'
              : status === 'in_progress'
              ? 'In Progress'
              : 'Done'}
          </Button>
        ))}
      </div>

      {/* Task Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do */}
        <TaskColumn
          title="To Do"
          tasks={todoTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />

        {/* In Progress */}
        <TaskColumn
          title="In Progress"
          tasks={inProgressTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />

        {/* Done */}
        <TaskColumn
          title="Done"
          tasks={doneTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Task"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <TextArea
            label="Description (optional)"
            placeholder="Add more details..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select
                className="input w-full"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input w-full"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={!newTitle.trim()}>
              Add Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface TaskColumnProps {
  title: string
  tasks: Task[]
  onToggle: (task: Task) => void
  onDelete: (id: number) => void
}

function TaskColumn({ title, tasks, onToggle, onDelete }: TaskColumnProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">{title}</h2>
        <Badge variant="default">{tasks.length}</Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggle(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="p-4 text-center text-zinc-600 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onToggle: () => void
  onDelete: () => void
}

function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const isDone = task.status === 'completed'
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isDone
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className={`p-3 ${isDone ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="mt-0.5 text-zinc-600 hover:text-indigo-400 transition-colors"
          >
            {isDone ? (
              <CheckCircle className="text-emerald-400" />
            ) : (
              <RadioButtonUnchecked />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={`text-white ${isDone ? 'line-through text-zinc-600' : ''}`}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="text-zinc-600 text-sm mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Flag style={{ fontSize: 14 }} className={priorityColors[task.priority]} />
              <Badge variant={priorityBadgeVariants[task.priority]} size="sm">
                {task.priority}
              </Badge>

              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isOverdue
                      ? 'text-red-400'
                      : isDueToday
                      ? 'text-amber-400'
                      : 'text-zinc-600'
                  }`}
                >
                  <Schedule style={{ fontSize: 14 }} />
                  {format(new Date(task.due_date), 'MMM d')}
                </div>
              )}

              {task.is_ai_extracted && (
                <Badge variant="primary" size="sm">
                  AI
                </Badge>
              )}
            </div>
          </div>

          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-all"
          >
            <Delete style={{ fontSize: 16 }} />
          </button>
        </div>
      </Card>
    </motion.div>
  )
}
