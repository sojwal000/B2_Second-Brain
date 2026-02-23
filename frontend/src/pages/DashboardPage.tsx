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
  AutoAwesome,
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
        const statsData = await dashboardService.getStats().catch(err => {
          console.error('Failed to fetch stats:', err)
          return null
        })
        const activityData = await dashboardService.getActivity(10).catch(err => {
          console.error('Failed to fetch activity:', err)
          return []
        })
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
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Content',
      value: stats?.total_content || 0,
      icon: Article,
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/5',
    },
    {
      title: 'Flashcards Due',
      value: stats?.flashcards_due || 0,
      icon: Style,
      gradient: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/5',
    },
    {
      title: 'Pending Tasks',
      value: stats?.tasks_pending || 0,
      icon: Task,
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/5',
    },
    {
      title: 'Study Streak',
      value: `${stats?.study_streak || 0} days`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-500',
      bgGlow: 'bg-emerald-500/5',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Welcome back! Here's your knowledge overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <div className={`relative overflow-hidden rounded-2xl border border-zinc-800/80 p-5 ${stat.bgGlow}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="text-white" style={{ fontSize: 20 }} />
                </div>
              </div>
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 blur-xl`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Focus */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10">
                    <AutoAwesome className="text-indigo-400" style={{ fontSize: 20 }} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Today's Focus</h2>
                </div>
                <Badge variant="primary">
                  <Schedule style={{ fontSize: 14 }} className="mr-1" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Due Flashcards */}
                <div
                  className="group flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-800"
                  onClick={() => navigate('/flashcards')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/15 transition-colors">
                      <Style className="text-purple-400" style={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Review Flashcards</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {stats?.flashcards_due || 0} cards due for review
                      </p>
                    </div>
                  </div>
                  <ArrowForward className="text-zinc-700 group-hover:text-zinc-500 transition-colors" style={{ fontSize: 18 }} />
                </div>

                {/* Pending Tasks */}
                <div
                  className="group flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-800"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/15 transition-colors">
                      <Task className="text-amber-400" style={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Complete Tasks</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {stats?.tasks_pending || 0} tasks pending
                      </p>
                    </div>
                  </div>
                  <ArrowForward className="text-zinc-700 group-hover:text-zinc-500 transition-colors" style={{ fontSize: 18 }} />
                </div>

                {/* Ask Assistant */}
                <div
                  className="group flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-800"
                  onClick={() => navigate('/assistant')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/15 transition-colors">
                      <Star className="text-indigo-400" style={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Ask Your Knowledge Base</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        Query your personal AI assistant
                      </p>
                    </div>
                  </div>
                  <ArrowForward className="text-zinc-700 group-hover:text-zinc-500 transition-colors" style={{ fontSize: 18 }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-white mb-5">Recent Activity</h2>
            <div className="space-y-3">
              {activity.length > 0 ? (
                activity.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 hover:bg-zinc-900/60 rounded-xl transition-colors"
                  >
                    <div className="w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{item.title}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{item.action}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 text-sm text-center py-6">
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
            <h2 className="text-lg font-semibold text-white mb-5">Content Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(stats.content_by_type).map(([type, count]) => (
                <div key={type} className="text-center p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-zinc-500 text-xs capitalize mt-1">{type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
