'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/providers/sidebar-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems = [
  { name: 'Dashboard', href: '/', emoji: '📊', color: 'from-indigo-500 to-violet-600' },
  { name: 'Portfolio', href: '/portfolio', emoji: '📈', color: 'from-purple-500 to-pink-600' },
  { name: 'Companies', href: '/companies', emoji: '🏢', color: 'from-blue-500 to-indigo-600' },
  { name: 'Support', href: '/support', emoji: '🎧', color: 'from-emerald-500 to-teal-600' },
  { name: 'Observatory', href: '/observatory', emoji: '🔭', color: 'from-amber-500 to-orange-600' },
]

const bottomNavItems = [
  { name: 'Settings', href: '/settings', emoji: '⚙️', color: 'from-gray-500 to-gray-600' },
]

interface NavItemProps {
  item: {
    name: string
    href: string
    emoji: string
    color?: string
  }
  isActive: boolean
  isCollapsed: boolean
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
  const content = (
    <Link
      href={item.href}
      aria-label={isCollapsed ? item.name : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md',
        item.color ? `bg-gradient-to-br ${item.color}` : 'bg-gray-100'
      )}>
        <span className="text-lg">{item.emoji}</span>
      </div>
      {!isCollapsed && <span className="font-semibold">{item.name}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
          {item.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export function SidebarNav() {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation">
      {!isCollapsed && (
        <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Navigation
        </p>
      )}
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          isCollapsed={isCollapsed}
        />
      ))}
    </nav>
  )
}

export function SidebarBottomNav() {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Settings navigation">
      {bottomNavItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          isCollapsed={isCollapsed}
        />
      ))}
    </nav>
  )
}
