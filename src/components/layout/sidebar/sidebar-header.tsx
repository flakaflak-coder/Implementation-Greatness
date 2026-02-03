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
    <div className="flex h-16 items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-3 group">
        {/* Clean logo mark */}
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <div
          className={cn(
            'transition-all duration-300 overflow-hidden',
            isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
          )}
        >
          <span className="font-bold text-xl text-gray-900 whitespace-nowrap tracking-tight">
            Freeday
          </span>
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
              'h-8 w-8 flex-shrink-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100',
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
