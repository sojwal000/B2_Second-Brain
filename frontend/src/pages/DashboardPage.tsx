import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Article,
  Style,
  Task,
  TrendingUp,
  Star,
  Schedule,
  ArrowForward,
} from '@mui/icons-material'
import { Card, CardContent, Badge } from '../components/ui'
import { dashboardService } from '../services'
import type { DashboardStats, ActivityItem } from '../types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getActivity(10),
        ])
        setStats(statsData)
        setActivity(activityData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Content',
      value: stats?.total_content || 0,
      icon: Article,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Flashcards Due',
      value: stats?.flashcards_due || 0,
      icon: Style,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Pending Tasks',
      value: stats?.tasks_pending || 0,
      icon: Task,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Study Streak',
      value: `${stats?.study_streak || 0} days`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-secondary-400">Welcome back! Here's your knowledge overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-400 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={stat.color} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Focus */}
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Today's Focus</h2>
              <Badge variant="primary">
                <Schedule fontSize="small" className="mr-1" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Due Flashcards */}
              <div
                className="flex items-center justify-between p-4 bg-secondary-900 rounded-lg cursor-pointer hover:bg-secondary-800 transition-colors"
                onClick={() => navigate('/flashcards')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Style className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Review Flashcards</p>
                    <p className="text-secondary-400 text-sm">
                      {stats?.flashcards_due || 0} cards due for review
                    </p>
                  </div>
                </div>
                <ArrowForward className="text-secondary-500" />
              </div>

              {/* Pending Tasks */}
              <div
                className="flex items-center justify-between p-4 bg-secondary-900 rounded-lg cursor-pointer hover:bg-secondary-800 transition-colors"
                onClick={() => navigate('/tasks')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Task className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Complete Tasks</p>
                    <p className="text-secondary-400 text-sm">
                      {stats?.tasks_pending || 0} tasks pending
                    </p>
                  </div>
                </div>
                <ArrowForward className="text-secondary-500" />
              </div>

              {/* Ask Assistant */}
              <div
                className="flex items-center justify-between p-4 bg-secondary-900 rounded-lg cursor-pointer hover:bg-secondary-800 transition-colors"
                onClick={() => navigate('/assistant')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Star className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Ask Your Knowledge Base</p>
                    <p className="text-secondary-400 text-sm">
                      Query your personal AI assistant
                    </p>
                  </div>
                </div>
                <ArrowForward className="text-secondary-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.length > 0 ? (
                activity.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2 hover:bg-secondary-900 rounded-lg transition-colors"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.title}</p>
                      <p className="text-xs text-secondary-500">{item.action}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content by Type */}
      {stats?.content_by_type && (
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-white mb-4">Content Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(stats.content_by_type).map(([type, count]) => (
                <div key={type} className="text-center p-4 bg-secondary-900 rounded-lg">
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-secondary-400 text-sm capitalize">{type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
