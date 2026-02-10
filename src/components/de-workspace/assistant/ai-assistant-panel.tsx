'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  ListChecks,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  X,
  Lightbulb,
  MessageSquare,
  Upload,
  Briefcase,
  Wrench,
  Rocket,
  ClipboardCheck,
  Square,
  RotateCcw,
  HelpCircle,
  Keyboard,
  TrendingUp,
  Calendar,
  ArrowRight,
  FileSignature,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { WorkspaceTab } from '../types'

// Proposed change from Freddy (portfolio mode)
export interface ProposedChange {
  deId: string
  deName: string
  companyName: string
  field: string
  fieldLabel: string
  oldValue: string | number | null
  newValue: string | number | null
}

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: FreddyAction[]
  proposedChanges?: ProposedChange[]
  isError?: boolean
  originalPrompt?: string // For retry functionality
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
  color: string
}

// Actions Freddy can trigger
export type FreddyAction =
  | { type: 'navigate'; tab: WorkspaceTab; label: string }
  | { type: 'upload'; phase?: number; label: string }
  | { type: 'refresh'; label: string }

// DE workspace context (single DE focus)
interface DEContext {
  deId: string
  deName: string
  companyName: string
  designWeekId: string
  currentPhase: number
  status: string
  ambiguousCount: number
  sessionsCount: number
  scopeItemsCount: number
  completeness: {
    business: number
    technical: number
  }
}

// Portfolio context (multiple DEs focus)
interface PortfolioContext {
  mode: 'portfolio'
  section?: 'timeline' | 'dashboard' | 'weekplan' | 'global'
}

// Combined context type
type FreddyContext = DEContext | PortfolioContext

interface UIContext {
  activeTab: WorkspaceTab | 'portfolio'
}

// Helper to check mode
function isPortfolioMode(ctx: FreddyContext): ctx is PortfolioContext {
  return 'mode' in ctx && ctx.mode === 'portfolio'
}

interface AIAssistantPanelProps {
  context: FreddyContext
  uiContext?: UIContext
  isOpen: boolean
  onClose: () => void
  onNavigate?: (tab: WorkspaceTab) => void
  onUpload?: (phase?: number) => void
  onRefresh?: () => void
  onChangesApplied?: () => void // Callback after applying portfolio changes
  // Auto-trigger a quick action when panel opens
  autoTriggerAction?: 'gaps' | 'next-steps' | 'client-update' | 'portfolio-health' | 'weekly-priorities'
}

// Quick actions for DE workspace mode
export const DE_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'gaps',
    label: "What's missing?",
    icon: <AlertCircle className="w-4 h-4" />,
    prompt: "Analyze the current progress and tell me what's missing or incomplete for this Design Week. Be specific about which areas need attention.",
    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    id: 'next-steps',
    label: 'Next steps',
    icon: <ListChecks className="w-4 h-4" />,
    prompt: 'Based on the current phase and progress, what should I focus on next? Give me a prioritized list of actionable tasks.',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    id: 'client-update',
    label: 'Draft update',
    icon: <FileText className="w-4 h-4" />,
    prompt: `Draft a consultative client status update email — the kind a senior implementation consultant would personally send after reviewing the project.

Think like a consultant writing to a client stakeholder, NOT like a system generating a status report. Follow this mental model:

1. **Reflect**: What changed since our last interaction? What decisions were made? What did we accomplish together?
2. **Assess timeline**: Are we on track for the target go-live date? Any shifts or risks to the timeline?
3. **Highlight wins**: What's going well? Reinforce confidence and momentum — people engage more when they feel progress.
4. **Flag what needs attention**: Any open questions or decisions that need client input? Be specific about what you need and propose options or a short meeting where possible.
5. **Propose next step**: End with a clear, concrete call-to-action — a meeting, a decision to make, a document to review. Always suggest a specific day or timeframe.

Tone & style:
- Write as a person, not a system. Warm, professional, direct.
- Lead with progress and wins before any asks
- Frame asks as collaboration: "I'd love your input on..." not "We need you to provide..."
- Reference the DE by name — make it feel like a real project, not a ticket
- No internal jargon whatsoever (no phases, profiles, scope items, extracted items, completeness percentages)
- 300-400 words — a proper consultative email that feels personal and substantive
- Use short paragraphs and the occasional bullet for scannability, but write in flowing prose — not a mechanical checklist
- Sign off warmly and personally

Example of the right tone and structure:
---
Hi Sarah,

Hope your week is off to a good start! Quick update on where we are with Claims Assistant.

Since our session on Tuesday, we've made really solid progress. We've now fully mapped out how Claims Assistant will handle all four main claim types — from initial intake through to resolution. We also locked in the escalation paths, so it's clear when Claims Assistant loops in your team versus handling things autonomously. That was a big milestone.

The process design is in great shape overall. One area I'd love your input on: for complaints that span multiple departments (we saw a couple of examples in Tuesday's session), we've identified two approaches. I can walk you through both in about 15 minutes — would Thursday afternoon work for a quick call?

Timeline-wise, we're tracking well for the March 15th go-live. Next week we move into the technical setup phase where we'll work with your IT team on the system integrations. I'll send a calendar invite for that session today.

Looking forward to Thursday — talk soon!

Best,
Sophie
---`,
    color: 'text-[#C2703E] bg-[#FDF3EC] hover:bg-[#F5E6DA] border-[#E8D5C4]',
  },
]

// Quick actions for portfolio mode
export const PORTFOLIO_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'portfolio-health',
    label: 'Portfolio health',
    icon: <TrendingUp className="w-4 h-4" />,
    prompt: 'Give me a quick portfolio health check. What needs my attention this week? Any blockers, risks, or upcoming go-lives I should know about?',
    color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  },
  {
    id: 'weekly-priorities',
    label: 'Weekly priorities',
    icon: <Calendar className="w-4 h-4" />,
    prompt: 'What should be my top 3-5 priorities this week across the portfolio? Consider go-lives, blockers, and high-risk projects.',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    id: 'blocked-review',
    label: 'Review blocked',
    icon: <AlertCircle className="w-4 h-4" />,
    prompt: 'Review all blocked projects and projects needing attention. For each one, what specific action is needed to unblock them?',
    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    id: 'resource-check',
    label: 'Resource conflicts',
    icon: <ListChecks className="w-4 h-4" />,
    prompt: 'Are there any resource conflicts or overlapping go-lives in the next 4 weeks that I should plan around?',
    color: 'text-[#C2703E] bg-[#FDF3EC] hover:bg-[#F5E6DA] border-[#E8D5C4]',
  },
]

// Legacy export for backwards compatibility
export const QUICK_ACTIONS = DE_QUICK_ACTIONS

// Example questions for empty state
const exampleQuestions = [
  "What integrations are missing?",
  "Summarize the scope for me",
  "Are we ready for sign-off?",
]

// Proactive hints based on context (DE mode only)
function getProactiveHints(context: FreddyContext): string[] {
  // No hints for portfolio mode - Freddy provides insights directly
  if (isPortfolioMode(context)) return []

  const hints: string[] = []

  if (context.ambiguousCount > 0) {
    hints.push(`${context.ambiguousCount} scope items need clarification - resolve these before moving to the next phase`)
  }

  if (context.currentPhase === 2 && context.sessionsCount < 2) {
    hints.push('Consider scheduling more process design sessions to capture all scenarios')
  }

  if (context.completeness.business < 50) {
    hints.push('Business profile is incomplete - review extracted items and add missing information')
  }

  if (context.completeness.technical < 30 && context.currentPhase >= 3) {
    hints.push('Technical profile needs attention - ensure integrations and data fields are documented')
  }

  return hints
}

// Parse action markers from Freddy's response
function parseActions(content: string): { cleanContent: string; actions: FreddyAction[] } {
  const actionRegex = /\[\[action:(\w+):([^:\]]+)(?::([^\]]+))?\]\]/g
  const actions: FreddyAction[] = []
  let match

  while ((match = actionRegex.exec(content)) !== null) {
    const [, type, param, label] = match
    if (type === 'navigate' && ['progress', 'business', 'technical', 'testplan'].includes(param)) {
      actions.push({
        type: 'navigate',
        tab: param as WorkspaceTab,
        label: label || `Go to ${param}`,
      })
    } else if (type === 'upload') {
      actions.push({
        type: 'upload',
        phase: param ? parseInt(param, 10) : undefined,
        label: label || 'Upload session',
      })
    } else if (type === 'refresh') {
      actions.push({
        type: 'refresh',
        label: label || 'Refresh data',
      })
    }
  }

  const cleanContent = content.replace(actionRegex, '').trim()
  return { cleanContent, actions }
}

// Tab icon mapping
const tabIcons: Record<WorkspaceTab, React.ReactNode> = {
  handover: <FileSignature className="w-3 h-3" />,
  progress: <Rocket className="w-3 h-3" />,
  business: <Briefcase className="w-3 h-3" />,
  technical: <Wrench className="w-3 h-3" />,
  testplan: <ClipboardCheck className="w-3 h-3" />,
}

// Format relative time (using UTC for consistent server/client rendering)
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  // Use UTC to avoid hydration mismatch
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`
}

export function AIAssistantPanel({
  context,
  uiContext,
  isOpen,
  onClose,
  onNavigate,
  onUpload,
  onRefresh,
  onChangesApplied,
  autoTriggerAction,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isApplyingChanges, setIsApplyingChanges] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const autoTriggerRef = useRef(false)

  const hints = getProactiveHints(context)
  const isPortfolio = isPortfolioMode(context)
  const quickActions = isPortfolio ? PORTFOLIO_QUICK_ACTIONS : DE_QUICK_ACTIONS

  // Handle action execution
  const executeAction = useCallback((action: FreddyAction) => {
    switch (action.type) {
      case 'navigate':
        onNavigate?.(action.tab)
        break
      case 'upload':
        onUpload?.(action.phase)
        break
      case 'refresh':
        onRefresh?.()
        break
    }
  }, [onNavigate, onUpload, onRefresh])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle auto-trigger action
  useEffect(() => {
    if (isOpen && autoTriggerAction && !autoTriggerRef.current && messages.length === 0) {
      autoTriggerRef.current = true
      const action = QUICK_ACTIONS.find(a => a.id === autoTriggerAction)
      if (action) {
        // Small delay to ensure panel is rendered
        setTimeout(() => handleSend(action.prompt), 200)
      }
    }
    if (!isOpen) {
      autoTriggerRef.current = false
    }
  }, [isOpen, autoTriggerAction, messages.length])

  // Keyboard shortcut handler (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Apply proposed changes
  const handleApplyChanges = async (changes: ProposedChange[], messageId: string) => {
    setIsApplyingChanges(true)
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })

      const data = await response.json()

      if (data.success) {
        // Update the message to show changes were applied
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, proposedChanges: undefined }
              : m
          )
        )
        // Add confirmation message
        const confirmMessage: Message = {
          id: `confirm-${Date.now()}`,
          role: 'assistant',
          content: `✅ ${data.message}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, confirmMessage])
        onChangesApplied?.()
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `❌ Failed to apply changes: ${data.error}`,
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "❌ Failed to apply changes. Please try again.",
        timestamp: new Date(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsApplyingChanges(false)
    }
  }

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Build context based on mode
      const requestContext = isPortfolio
        ? { mode: 'portfolio' as const, section: (context as PortfolioContext).section }
        : {
            deId: (context as DEContext).deId,
            deName: (context as DEContext).deName,
            companyName: (context as DEContext).companyName,
            designWeekId: (context as DEContext).designWeekId,
            currentPhase: (context as DEContext).currentPhase,
            status: (context as DEContext).status,
            ambiguousCount: (context as DEContext).ambiguousCount,
            sessionsCount: (context as DEContext).sessionsCount,
            scopeItemsCount: (context as DEContext).scopeItemsCount,
            completeness: (context as DEContext).completeness,
          }

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: requestContext,
          uiContext: uiContext ? {
            activeTab: uiContext.activeTab,
          } : undefined,
          history: messages.slice(-6),
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()

      if (data.success) {
        const { cleanContent, actions } = parseActions(data.response)

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: cleanContent,
          timestamp: new Date(),
          actions: actions.length > 0 ? actions : undefined,
          proposedChanges: data.proposedChanges,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: data.error === 'API key not configured'
            ? "I can't connect right now - the API key isn't configured. Please check your environment settings."
            : "Sorry, I couldn't process that request. This might be a temporary issue.",
          timestamp: new Date(),
          isError: true,
          originalPrompt: content,
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled
        return
      }
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting. This could be a network issue - please check your connection.",
        timestamp: new Date(),
        isError: true,
        originalPrompt: content,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  const handleRetry = (originalPrompt: string, errorMessageId: string) => {
    // Remove the error message
    setMessages((prev) => prev.filter(m => m.id !== errorMessageId))
    // Resend
    handleSend(originalPrompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopied(messageId)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt)
  }

  const handleReset = () => {
    if (messages.length > 3) {
      setShowResetConfirm(true)
    } else {
      setMessages([])
    }
  }

  const confirmReset = () => {
    setMessages([])
    setShowResetConfirm(false)
  }

  if (!isOpen) return null

  return (
    <TooltipProvider>
      {/* Responsive: full screen on mobile, sidebar on desktop */}
      <div className={cn(
        "h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden",
        "w-full sm:w-[400px] sm:min-w-[400px] sm:max-w-[400px]",
        "fixed sm:relative inset-0 sm:inset-auto z-50 sm:z-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#FDF3EC]">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 rounded-xl bg-[#C2703E] flex items-center justify-center shadow-lg cursor-help">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by Claude</span>
                </div>
              </TooltipContent>
            </Tooltip>
            <div>
              <h2 className="font-semibold text-gray-900">Freddy</h2>
              <p className="text-xs text-gray-500">Your implementation expert</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Help button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelp(!showHelp)}
                  aria-label="Show help"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>What can Freddy do?</TooltipContent>
            </Tooltip>
            {/* Reset button - always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  disabled={messages.length === 0}
                  aria-label="New conversation"
                  className={messages.length === 0 ? 'opacity-40' : ''}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close assistant"
                >
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <span>Close</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">Esc</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Help panel */}
        {showHelp && (
          <div className="p-4 bg-[#FDF3EC] border-b border-[#F5E6DA]">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#6B3A1F]">What can Freddy do?</h3>
              <button onClick={() => setShowHelp(false)} className="text-[#D4956A] hover:text-[#C2703E]">
                <X className="w-4 h-4" />
              </button>
            </div>
            {isPortfolio ? (
              <ul className="text-xs text-[#7D4526] space-y-1">
                <li>• Give you a portfolio health overview</li>
                <li>• Highlight blockers and projects needing attention</li>
                <li>• Suggest weekly priorities</li>
                <li>• Update project status with natural language</li>
                <li>• Flag resource conflicts and timeline issues</li>
              </ul>
            ) : (
              <ul className="text-xs text-[#7D4526] space-y-1">
                <li>• Analyze implementation progress and gaps</li>
                <li>• Draft client-ready status updates</li>
                <li>• Suggest next steps based on current phase</li>
                <li>• Answer questions about scope and requirements</li>
                <li>• Navigate you to relevant sections</li>
              </ul>
            )}
            <div className="mt-3 pt-2 border-t border-[#E8D5C4] flex items-center gap-2 text-xs text-[#C2703E]">
              <Keyboard className="w-3 h-3" />
              <span><kbd className="px-1 bg-[#F5E6DA] rounded">⌘</kbd>+<kbd className="px-1 bg-[#F5E6DA] rounded">J</kbd> to toggle</span>
            </div>
          </div>
        )}

        {/* Context badge */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {isPortfolio ? (
              <>
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                  Portfolio Mode
                </Badge>
                <span className="text-xs text-gray-500">All active implementations</span>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="text-xs">
                  {(context as DEContext).deName}
                </Badge>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">Phase {(context as DEContext).currentPhase}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{(context as DEContext).companyName}</span>
              </>
            )}
          </div>
        </div>

        {/* Proactive hints */}
        {hints.length > 0 && messages.length === 0 && !showHelp && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-700">Suggestions</span>
            </div>
            <div className="space-y-2">
              {hints.slice(0, 2).map((hint, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-600 p-2 bg-amber-50 rounded-lg border border-amber-100"
                >
                  {hint}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {messages.length === 0 && !showHelp && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Quick actions</p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    action.color
                  )}
                >
                  {action.icon}
                  <span className="font-medium text-sm">{action.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {messages.length === 0 && !showHelp && (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {isPortfolio
                    ? 'Ask me about your portfolio or update project status'
                    : 'Ask me anything about this implementation'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Or use a quick action above to get started
                </p>
                {/* Example questions */}
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs text-gray-400">Try asking:</p>
                  {(isPortfolio
                    ? [
                        'Which projects need my attention this week?',
                        'Mark Ben as blocked by API documentation',
                        'Shift Hisense timeline 2 weeks forward',
                      ]
                    : exampleQuestions
                  ).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="block mx-auto text-xs text-[#C2703E] hover:text-[#A05A32] hover:underline"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'rounded-2xl px-3 py-2',
                        message.role === 'user'
                          ? 'max-w-[80%] bg-[#C2703E] text-white rounded-br-sm'
                          : message.isError
                            ? 'max-w-[95%] bg-red-50 text-red-900 rounded-bl-sm border border-red-200'
                            : 'max-w-[95%] bg-gray-100 text-gray-900 rounded-bl-sm'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-gray-900 prose-strong:text-gray-900 break-words">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                      )}
                      {message.role === 'assistant' && (
                        <div className="mt-2 space-y-2">
                          {/* Retry button for errors */}
                          {message.isError && message.originalPrompt && (
                            <button
                              onClick={() => handleRetry(message.originalPrompt!, message.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retry
                            </button>
                          )}
                          {/* Action buttons */}
                          {message.actions && message.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {message.actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => executeAction(action)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#FDF3EC] text-[#A05A32] hover:bg-[#F5E6DA] border border-[#E8D5C4] transition-colors"
                                >
                                  {action.type === 'navigate' && tabIcons[action.tab]}
                                  {action.type === 'upload' && <Upload className="w-3 h-3" />}
                                  {action.type === 'refresh' && <RefreshCw className="w-3 h-3" />}
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Proposed Changes (Portfolio Mode) */}
                          {message.proposedChanges && message.proposedChanges.length > 0 && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium text-amber-800">
                                  Proposed Changes ({message.proposedChanges.length})
                                </span>
                              </div>
                              <div className="space-y-2 mb-3">
                                {message.proposedChanges.map((change, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-white p-2 rounded border border-amber-100"
                                  >
                                    <div className="font-medium text-gray-900">
                                      {change.deName} ({change.companyName})
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-gray-600">
                                      <span>{change.fieldLabel}:</span>
                                      <span className="text-red-600 line-through">
                                        {change.oldValue ?? 'empty'}
                                      </span>
                                      <ArrowRight className="w-3 h-3" />
                                      <span className="text-green-600 font-medium">
                                        {change.newValue ?? 'empty'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApplyChanges(message.proposedChanges!, message.id)}
                                  disabled={isApplyingChanges}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  {isApplyingChanges ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                      Applying...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Apply Changes
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === message.id
                                          ? { ...m, proposedChanges: undefined }
                                          : m
                                      )
                                    )
                                  }}
                                  disabled={isApplyingChanges}
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          )}
                          {/* Copy button */}
                          {!message.isError && !message.proposedChanges && (
                            <button
                              onClick={() => handleCopy(message.content, message.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                              aria-label="Copy message"
                            >
                              {copied === message.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {formatRelativeTime(message.timestamp)}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md p-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C2703E]" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                    <button
                      onClick={handleStop}
                      className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                      aria-label="Stop generating"
                    >
                      <Square className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <label htmlFor="freddy-input" className="sr-only">
              Ask Freddy about this implementation
            </label>
            <Textarea
              id="freddy-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this implementation..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              aria-label="Message input"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-[#C2703E] hover:bg-[#A05A32]"
              aria-label={isLoading ? "Sending..." : "Send message"}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-xs text-gray-400">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> to send
            </span>
            <span className="text-xs text-gray-400">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Shift</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> for new line
            </span>
          </div>
        </div>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start new conversation?</DialogTitle>
            <DialogDescription>
              This will clear the current conversation with Freddy. You have {messages.length} messages that will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReset}>Clear & Start New</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
