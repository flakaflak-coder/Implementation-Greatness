'use client'

import { useState, useEffect } from 'react'
import { Bot, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ONBOARDING_KEY = 'freddy-onboarding-dismissed'

interface AssistantTriggerProps {
  onClick: () => void
  hasHints?: boolean
  className?: string
}

export function AssistantTrigger({ onClick, hasHints, className }: AssistantTriggerProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY)
    if (!dismissed) {
      setShowOnboarding(true)
    }
  }, [])

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              onClick={onClick}
              size="sm"
              className={cn(
                'relative bg-[#C2703E] hover:bg-[#A05A32] text-white',
                className
              )}
            >
              <Bot className="w-4 h-4 mr-2" />
              Freddy
              {hasHints && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
              )}
            </Button>

            {showOnboarding && (
              <div className="absolute right-0 bottom-full mb-3 w-72 rounded-lg bg-white border border-gray-200 shadow-xl p-4 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="absolute bottom-0 right-6 translate-y-full">
                  <div className="w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45 -translate-y-1.5" />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#C2703E]/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-[#C2703E]" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900">Meet Freddy</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissOnboarding()
                    }}
                    className="text-gray-400 hover:text-gray-600 -mt-0.5"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Your AI assistant. Ask about gaps, next steps, or draft client updates. Press{' '}
                  <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded border">⌘J</kbd>{' '}
                  anytime.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissOnboarding()
                  }}
                  className="w-full text-center text-sm font-medium text-white bg-[#C2703E] hover:bg-[#A05A32] rounded-md py-1.5 transition-colors"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
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
