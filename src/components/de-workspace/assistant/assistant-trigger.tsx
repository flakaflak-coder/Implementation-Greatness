'use client'

import { Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface AssistantTriggerProps {
  onClick: () => void
  hasHints?: boolean
  className?: string
}

export function AssistantTrigger({ onClick, hasHints, className }: AssistantTriggerProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className={cn(
              'relative bg-[#C2703E] hover:bg-[#A05A32] text-white shadow-lg shadow-[#C2703E]/15',
              className
            )}
          >
            <Bot className="w-4 h-4 mr-2" />
            Freddy
            {hasHints && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C2703E]" />
            <span>Ask Freddy for help</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded border">⌘J</kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
