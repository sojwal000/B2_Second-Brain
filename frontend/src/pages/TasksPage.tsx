import { useState, useEffect } from 'react'
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
} from '@mui/icons-material'
import { Button, Card, CardContent, Input, Modal, TextArea, Badge } from '../components/ui'
import { taskService } from '../services'
import type { Task, TaskStatus, TaskPriority } from '../types'
import toast from 'react-hot-toast'

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-secondary-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
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
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-secondary-400">Manage your to-dos and action items</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Add fontSize="small" className="mr-1" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all'
              ? 'All'
              : status === 'todo'
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
          <div className="p-4 text-center text-secondary-500 text-sm border-2 border-dashed border-secondary-700 rounded-lg">
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
  const isDone = task.status === 'done'
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
            className="mt-0.5 text-secondary-400 hover:text-primary-400 transition-colors"
          >
            {isDone ? (
              <CheckCircle className="text-green-400" />
            ) : (
              <RadioButtonUnchecked />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={`text-white ${isDone ? 'line-through text-secondary-500' : ''}`}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="text-secondary-500 text-sm mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Flag fontSize="small" className={priorityColors[task.priority]} />
              <Badge variant={priorityBadgeVariants[task.priority]} size="sm">
                {task.priority}
              </Badge>

              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isOverdue
                      ? 'text-red-400'
                      : isDueToday
                      ? 'text-orange-400'
                      : 'text-secondary-500'
                  }`}
                >
                  <Schedule fontSize="small" />
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
            className="p-1 text-secondary-500 hover:text-red-400 transition-colors"
          >
            <Delete fontSize="small" />
          </button>
        </div>
      </Card>
    </motion.div>
  )
}
