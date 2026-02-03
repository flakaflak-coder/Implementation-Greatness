'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Flame,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trophy,
  Zap,
  AlertTriangle,
  AlertCircle,
  Upload,
  PartyPopper,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getDEAvatar } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Types
interface WorkforceDE {
  id: string
  name: string
  description: string | null
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  channels: string[]
  companyId: string
  companyName: string
  currentJourneyPhase: string
  goLiveDate: string | null
  designWeek: {
    phase: number
    status: string
    ambiguousCount: number
  } | null
  healthScore: number | null
}

interface ActionItem {
  id: string
  type: 'ambiguous' | 'upload' | 'review' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  deId: string
  deName: string
  companyName: string
  href: string
}

interface Win {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  deId?: string
  deName?: string
}

interface DashboardData {
  stats: {
    totalDigitalEmployees: number
    activeDesignWeeks: number
    liveAgents: number
    itemsNeedResolution: number
  }
  workforce: WorkforceDE[]
  actionItems: ActionItem[]
  gamification: {
    healthyStreak: number
    wins: Win[]
    totalWinsThisWeek: number
  }
}

// Channel icons
const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-3 h-3" />,
  WEBCHAT: <MessageSquare className="w-3 h-3" />,
  VOICE: <Phone className="w-3 h-3" />,
}

// Status config
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  LIVE: {
    label: 'Live',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    icon: <Rocket className="w-3 h-3" />,
  },
  DESIGN: {
    label: 'In Design',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: <Sparkles className="w-3 h-3" />,
  },
  ONBOARDING: {
    label: 'Onboarding',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: <Zap className="w-3 h-3" />,
  },
  UAT: {
    label: 'UAT',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    icon: <Target className="w-3 h-3" />,
  },
  PAUSED: {
    label: 'Paused',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: <Bot className="w-3 h-3" />,
  },
}

// DE Card Component
function DECard({ de }: { de: WorkforceDE }) {
  const status = statusConfig[de.status] || statusConfig.PAUSED
  const avatarUrl = getDEAvatar(de.id, de.name)

  return (
    <Link
      href={`/companies/${de.companyId}/digital-employees/${de.id}`}
      className="group"
    >
      <Card className="h-full bg-white border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
        <CardContent className="p-4">
          {/* Avatar and status */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-md group-hover:ring-indigo-200 transition-all">
                <Image
                  src={avatarUrl}
                  alt={de.name}
                  width={56}
                  height={56}
                  className="w-full h-full"
                  unoptimized
                />
              </div>
              {/* Status dot */}
              <div className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white',
                status.bgColor
              )}>
                <span className={status.color}>{status.icon}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {de.name}
              </h3>
              <p className="text-xs text-gray-500 truncate">{de.companyName}</p>
              <div className="flex items-center gap-1 mt-1">
                {de.channels.slice(0, 3).map((channel) => (
                  <span
                    key={channel}
                    className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-500"
                    title={channel}
                  >
                    {channelIcons[channel] || <MessageSquare className="w-3 h-3" />}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Status info */}
          <div className="flex items-center justify-between">
            <Badge className={cn('text-xs', status.bgColor, status.color, 'border-0')}>
              {status.label}
            </Badge>

            {/* Live health score */}
            {de.status === 'LIVE' && de.healthScore !== null && (
              <div className="flex items-center gap-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  de.healthScore >= 90 ? 'bg-emerald-500' :
                  de.healthScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                )} />
                <span className="text-xs font-medium text-gray-600">{de.healthScore}%</span>
              </div>
            )}

            {/* Design phase */}
            {de.status === 'DESIGN' && de.designWeek && (
              <span className="text-xs text-gray-500">
                Phase {de.designWeek.phase}/4
              </span>
            )}
          </div>

          {/* Ambiguous items warning */}
          {de.designWeek && de.designWeek.ambiguousCount > 0 && (
            <div className="mt-2 px-2 py-1 bg-amber-50 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-700">
                {de.designWeek.ambiguousCount} needs attention
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

// Action Item Component
function ActionItemCard({ item }: { item: ActionItem }) {
  const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    ambiguous: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    blocked: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    upload: {
      icon: <Upload className="w-4 h-4" />,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    review: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
    },
  }

  const config = typeConfig[item.type] || typeConfig.review

  return (
    <Link href={item.href} className="block group">
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bg)}>
          <span className={config.color}>{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
            {item.title}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {item.deName} • {item.companyName}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// Main Dashboard
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async (showToastOnError = true) => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
        setLastUpdated(new Date())
      } else {
        setError(result.error || 'Failed to load dashboard')
        if (showToastOnError) {
          toast.error('Failed to load dashboard', {
            description: result.error || 'Please try again',
            action: {
              label: 'Retry',
              onClick: () => fetchData(true),
            },
          })
        }
      }
    } catch {
      const errorMsg = 'Unable to connect to server'
      setError(errorMsg)
      if (showToastOnError) {
        toast.error(errorMsg, {
          description: 'Check your internet connection and try again',
          action: {
            label: 'Retry',
            onClick: () => fetchData(true),
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(false) // Don't toast on initial load - inline error is visible
  }, [])

  // Filter workforce based on search
  const filteredWorkforce = data?.workforce.filter((de) =>
    searchQuery === '' ||
    de.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    de.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? []

  const formatLastUpdated = () => {
    if (!lastUpdated) return ''
    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} mins ago`
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const stats = data?.stats ?? {
    totalDigitalEmployees: 0,
    activeDesignWeeks: 0,
    liveAgents: 0,
    itemsNeedResolution: 0,
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header with streak */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mission Control</h1>
              <p className="text-gray-500">
                Your Digital Workforce at a glance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Streak indicator */}
          {data?.gamification && data.gamification.healthyStreak > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl border border-orange-200">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="font-bold text-orange-600">{data.gamification.healthyStreak}</span>
                    <span className="text-sm text-orange-600">day streak</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>All systems healthy for {data.gamification.healthyStreak} days!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {lastUpdated && (
            <span className="text-sm text-gray-400">
              Updated {formatLastUpdated()}
            </span>
          )}
          <Button
            onClick={() => fetchData(true)}
            variant="outline"
            size="sm"
            disabled={loading}
            className="bg-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-500">Check your connection and try again</p>
              </div>
            </div>
            <Button
              onClick={() => fetchData(true)}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalDigitalEmployees}</p>
                <p className="text-sm text-indigo-100">Digital Employees</p>
              </div>
              <Bot className="w-8 h-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.liveAgents}</p>
                <p className="text-sm text-emerald-100">Live & Working</p>
              </div>
              <Rocket className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.activeDesignWeeks}</p>
                <p className="text-sm text-amber-100">In Design</p>
              </div>
              <Sparkles className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'border-0 text-white',
          stats.itemsNeedResolution > 0
            ? 'bg-gradient-to-br from-rose-500 to-pink-600'
            : 'bg-gradient-to-br from-gray-400 to-gray-500'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.itemsNeedResolution}</p>
                <p className="text-sm text-rose-100">Need Attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital Workforce Grid - Main area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workforce Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Digital Workforce
              <Badge variant="secondary" className="ml-2">
                {filteredWorkforce.length}
              </Badge>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* Workforce Grid */}
          {loading && !data ? (
            <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="sr-only">Loading dashboard...</span>
            </div>
          ) : filteredWorkforce.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No matching DEs' : 'No Digital Employees yet'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start by adding a company and creating your first DE'}
                </p>
                {!searchQuery && (
                  <Button asChild className="bg-gradient-to-r from-indigo-500 to-violet-600">
                    <Link href="/companies/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Company
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredWorkforce.map((de) => (
                <DECard key={de.id} de={de} />
              ))}
              {/* Add new DE card */}
              <Link href="/companies" className="group">
                <Card className="h-full bg-white border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[140px]">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-2 transition-colors">
                      <Plus className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">
                      Add DE
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar - Actions & Wins */}
        <div className="space-y-6">
          {/* Action Center */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-amber-500" />
                Action Center
                {(data?.actionItems.length ?? 0) > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 ml-auto">
                    {data?.actionItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.actionItems && data.actionItems.length > 0 ? (
                <div className="space-y-1">
                  {data.actionItems.map((item) => (
                    <ActionItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">All clear!</p>
                  <p className="text-xs text-gray-400">No urgent actions needed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wins & Celebrations */}
          <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-violet-500" />
                This Week&apos;s Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.gamification.wins && data.gamification.wins.length > 0 ? (
                <div className="space-y-3">
                  {data.gamification.wins.map((win) => (
                    <div
                      key={win.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-violet-100"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                        <PartyPopper className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{win.title}</p>
                        <p className="text-xs text-gray-500">{win.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-violet-600">Keep going! Wins will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link
                href="/companies"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">View Companies</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/portfolio"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">Portfolio View</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
