'use client'

import { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AIAssistantPanel } from './ai-assistant-panel'

interface PortfolioFreddyProps {
  onChangesApplied?: () => void
  className?: string
}

/**
 * Portable Freddy component for Portfolio page
 * Provides a floating button to open Freddy in portfolio mode
 */
export function PortfolioFreddy({ onChangesApplied, className }: PortfolioFreddyProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <TooltipProvider>
      {/* Floating button */}
      {!isOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              className={cn(
                'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg',
                'bg-[#C2703E] hover:bg-[#A05A32]',
                'transition-all hover:scale-105',
                className
              )}
            >
              <Bot className="w-6 h-6 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Ask Freddy about your portfolio</span>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl rounded-2xl overflow-hidden border border-gray-200 z-50">
          <AIAssistantPanel
            context={{ mode: 'portfolio' }}
            uiContext={{ activeTab: 'portfolio' }}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onChangesApplied={() => {
              onChangesApplied?.()
            }}
          />
        </div>
      )}
    </TooltipProvider>
  )
}
