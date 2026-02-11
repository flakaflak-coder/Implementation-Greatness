'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  PieChart,
  Building2,
  HeadphonesIcon,
  Telescope,
  Settings,
  Search,
  Command,
  LogOut,
  User,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/providers/sidebar-provider'
import { useCommandPalette } from '@/providers/command-palette-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NotificationBell } from '@/components/layout/sidebar/notification-bell'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Portfolio', href: '/portfolio', icon: PieChart },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Support', href: '/support', icon: HeadphonesIcon },
  { name: 'Observatory', href: '/observatory', icon: Telescope },
]

const bottomNavItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface NavItemProps {
  item: {
    name: string
    href: string
    icon: LucideIcon
  }
  isActive: boolean
  isCollapsed: boolean
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
  const Icon = item.icon

  const content = (
    <Link
      href={item.href}
      aria-label={isCollapsed ? item.name : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-gray-500')} />
      {!isCollapsed && <span className="font-medium">{item.name}</span>}
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

function SearchButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { setOpen } = useCommandPalette()

  const content = (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 w-full',
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Search className="w-5 h-5 flex-shrink-0 text-gray-500" />
      {!isCollapsed && (
        <div className="flex items-center justify-between flex-1">
          <span className="font-medium">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-500 rounded font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      )}
    </button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
          Search (⌘K)
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
    if (href === '/portfolio') {
      return pathname.startsWith('/portfolio')
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex flex-col gap-1 px-2" role="navigation" aria-label="Main navigation">
      {/* Search button */}
      <SearchButton isCollapsed={isCollapsed} />

      {/* Notifications */}
      <NotificationBell />

      <div className="my-2 border-t border-gray-100" />

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

function UserProfile({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: session } = useSession()

  if (!session?.user) return null

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  const userSection = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
        'bg-gray-100',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-[#C2703E] flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-white" />
      </div>
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{session.user.name || 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
        </div>
      )}
    </div>
  )

  const logoutButton = (
    <button
      onClick={handleSignOut}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 w-full',
        'text-gray-600 hover:bg-red-50 hover:text-red-600',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <LogOut className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && <span className="font-medium">Sign Out</span>}
    </button>
  )

  if (isCollapsed) {
    return (
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>{userSection}</TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
            {session.user.name || session.user.email}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
            Sign Out
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {userSection}
      {logoutButton}
    </div>
  )
}

export function SidebarBottomNav() {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="flex flex-col gap-1 px-2" role="navigation" aria-label="Settings navigation">
      {bottomNavItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          isCollapsed={isCollapsed}
        />
      ))}
      <div className="my-2 border-t border-gray-100" />
      <UserProfile isCollapsed={isCollapsed} />
    </nav>
  )
}
