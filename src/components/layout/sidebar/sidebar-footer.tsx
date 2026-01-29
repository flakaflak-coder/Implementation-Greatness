'use client'

import Link from 'next/link'
import { Settings, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/providers/sidebar-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function SidebarFooter() {
  const { isCollapsed } = useSidebar()

  const items = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Help Center', href: '/help', icon: HelpCircle },
  ]

  return (
    <div className="border-t border-gray-200 p-3">
      <div className={cn('flex gap-1', isCollapsed ? 'flex-col items-center' : 'flex-row')}>
        {items.map((item) => {
          const content = (
            <Link
              key={item.href}
              href={item.href}
              aria-label={isCollapsed ? item.name : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            )
          }

          return content
        })}
      </div>
    </div>
  )
}
