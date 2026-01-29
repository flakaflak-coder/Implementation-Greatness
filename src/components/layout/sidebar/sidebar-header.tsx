'use client'

import Link from 'next/link'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/providers/sidebar-provider'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function SidebarHeader() {
  const { isCollapsed, toggleCollapse } = useSidebar()

  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200/50 group-hover:shadow-indigo-300/50 transition-shadow duration-300">
          <span className="text-xl">🚀</span>
        </div>
        <div
          className={cn(
            'transition-all duration-300 overflow-hidden',
            isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
          )}
        >
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent whitespace-nowrap">
            Onboarding
          </span>
          <p className="text-[10px] text-gray-500 -mt-1">Command Center</p>
        </div>
      </Link>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'h-8 w-8 flex-shrink-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100',
              isCollapsed && 'absolute right-2'
            )}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
          {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
