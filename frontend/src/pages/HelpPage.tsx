import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Article,
  SmartToy,
  Style,
  Task,
  AccountTree,
  Quiz,
  Workspaces,
  Dashboard,
  ArrowForward,
  AutoAwesome,
  CheckCircleOutline,
} from '@mui/icons-material'
import { Card, CardContent } from '../components/ui'
import { dashboardService } from '../services'

interface CapabilityFeature {
  id: string
  title: string
  description: string
  icon: string
  color: string
  path: string
  features: string[]
}

const iconMap: Record<string, React.ElementType> = {
  Article,
  SmartToy,
  Style,
  Task,
  AccountTree,
  Quiz,
  Workspaces,
  Dashboard,
}

const colorMap: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'hover:border-blue-500/30',
  },
  indigo: {
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'hover:border-indigo-500/30',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'hover:border-purple-500/30',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'hover:border-amber-500/30',
  },
  emerald: {
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'hover:border-emerald-500/30',
  },
  pink: {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'hover:border-pink-500/30',
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'hover:border-cyan-500/30',
  },
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'hover:border-orange-500/30',
  },
}

export default function HelpPage() {
  const [capabilities, setCapabilities] = useState<CapabilityFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const data = await dashboardService.getCapabilities()
        setCapabilities(data.capabilities)
      } catch (error) {
        console.error('Failed to fetch capabilities:', error)
        // Graceful fallback handled by empty state
      } finally {
        setLoading(false)
      }
    }

    fetchCapabilities()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <AutoAwesome className="text-white" style={{ fontSize: 22 }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">What Can B2 Do For You?</h1>
        </div>
        <p className="text-zinc-500 mt-2 max-w-2xl">
          B2 Second Brain is your AI-powered personal knowledge management system.
          Explore the features below to get the most out of your second brain.
        </p>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {capabilities.map((capability, index) => {
          const IconComponent = iconMap[capability.icon] || Article
          const colors = colorMap[capability.color] || colorMap.blue
          const isExpanded = expandedId === capability.id

          return (
            <motion.div
              key={capability.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg shrink-0`}>
                          <IconComponent className="text-white" style={{ fontSize: 22 }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{capability.title}</h3>
                          <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{capability.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features List (expandable) */}
                    <div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : capability.id)}
                        className={`text-sm font-medium ${colors.text} hover:underline cursor-pointer`}
                      >
                        {isExpanded ? 'Hide features' : `View ${capability.features.length} features`}
                      </button>

                      {isExpanded && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 space-y-2"
                        >
                          {capability.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                              <CheckCircleOutline className={colors.text} style={{ fontSize: 16, marginTop: 2 }} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </div>

                    {/* Go to Feature Button */}
                    <button
                      onClick={() => navigate(capability.path)}
                      className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl ${colors.bg} ${colors.text} text-sm font-medium transition-all hover:gap-3`}
                    >
                      Try it out
                      <ArrowForward style={{ fontSize: 16 }} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Empty state */}
      {capabilities.length === 0 && !loading && (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <AutoAwesome className="text-zinc-600 mx-auto mb-3" style={{ fontSize: 40 }} />
              <p className="text-zinc-400 text-lg font-medium">Capabilities information unavailable</p>
              <p className="text-zinc-600 text-sm mt-1">Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
