'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Sparkles,
  AlertCircle,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/providers/sidebar-provider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface NotificationTypeConfig {
  icon: LucideIcon
  color: string
  borderColor: string
}

// ─── Notification type icon/color mapping ────────────────────────────────────

const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  EXTRACTION_COMPLETE: {
    icon: Sparkles,
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
  },
  EXTRACTION_FAILED: {
    icon: AlertCircle,
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
  },
  HEALTH_CHANGE: {
    icon: Heart,
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
  },
  NEW_AMBIGUOUS_ITEMS: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
  },
  PHASE_COMPLETE: {
    icon: CheckCircle2,
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
  },
  DESIGN_WEEK_COMPLETE: {
    icon: Trophy,
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
  },
  PREREQUISITE_RECEIVED: {
    icon: Package,
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
  },
}

const DEFAULT_TYPE_CONFIG: NotificationTypeConfig = {
  icon: Bell,
  color: 'text-gray-500',
  borderColor: 'border-l-gray-400',
}

// ─── Relative time helper ────────────────────────────────────────────────────

function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Notification Item ───────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification
  onNavigate: (link: string | null) => void
}) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type] || DEFAULT_TYPE_CONFIG
  const Icon = config.icon

  return (
    <button
      aria-label={`${notification.read ? '' : 'Unread: '}${notification.title}`}
      onClick={() => onNavigate(notification.link)}
      className={cn(
        'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors',
        'border-l-2 hover:bg-gray-50',
        config.borderColor,
        !notification.read && 'bg-orange-50/40'
      )}
    >
      <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'text-sm truncate',
            notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#C2703E]" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-[10px] text-gray-400 mt-1">{getRelativeTime(notification.createdAt)}</p>
      </div>
    </button>
  )
}

// ─── NotificationBell ────────────────────────────────────────────────────────

export function NotificationBell() {
  const { isCollapsed } = useSidebar()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data.notifications)
        setUnreadCount(json.data.unreadCount)
      }
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, [])

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = (link: string | null) => {
    setIsOpen(false)
    if (link) {
      window.location.href = link
    }
  }

  const bellButton = (
    <PopoverTrigger asChild>
      <button
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 w-full relative',
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          isOpen && 'bg-gray-100 text-gray-900',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-5 h-5 text-gray-500" />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {!isCollapsed && <span className="font-medium">Notifications</span>}
      </button>
    </PopoverTrigger>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{bellButton}</TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </TooltipContent>
        </Tooltip>
      ) : (
        bellButton
      )}

      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-96 p-0 max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="text-xs text-[#C2703E] hover:text-[#a85c30] font-medium transition-colors disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Bell className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                System events will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>

      </PopoverContent>
    </Popover>
  )
}
