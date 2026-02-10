'use client'

import { cn } from '@/lib/utils'
import { Plus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const bgColors: Record<string, string> = {
  indigo: 'bg-[#FDF3EC]/60',
  blue: 'bg-blue-50/60',
  emerald: 'bg-emerald-50/60',
  cyan: 'bg-cyan-50/60',
  violet: 'bg-[#FDF3EC]/60',
  amber: 'bg-amber-50/60',
  rose: 'bg-rose-50/60',
  pink: 'bg-pink-50/60',
  orange: 'bg-orange-50/60',
}

const borderColors: Record<string, string> = {
  indigo: 'border-[#E8D5C4]/60',
  blue: 'border-blue-200/60',
  emerald: 'border-emerald-200/60',
  cyan: 'border-cyan-200/60',
  violet: 'border-[#E8D5C4]/60',
  amber: 'border-amber-200/60',
  rose: 'border-rose-200/60',
  pink: 'border-pink-200/60',
  orange: 'border-orange-200/60',
}

const iconBgColors: Record<string, string> = {
  indigo: 'bg-[#F5E6DA]',
  blue: 'bg-blue-100',
  emerald: 'bg-emerald-100',
  cyan: 'bg-cyan-100',
  violet: 'bg-[#F5E6DA]',
  amber: 'bg-amber-100',
  rose: 'bg-rose-100',
  pink: 'bg-pink-100',
  orange: 'bg-orange-100',
}

const iconTextColors: Record<string, string> = {
  indigo: 'text-[#C2703E]',
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  cyan: 'text-cyan-500',
  violet: 'text-[#C2703E]',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  pink: 'text-pink-500',
  orange: 'text-orange-500',
}

const hoverBorderColors: Record<string, string> = {
  indigo: 'hover:border-[#D4956A]',
  blue: 'hover:border-blue-300',
  emerald: 'hover:border-emerald-300',
  cyan: 'hover:border-cyan-300',
  violet: 'hover:border-[#D4956A]',
  amber: 'hover:border-amber-300',
  rose: 'hover:border-rose-300',
  pink: 'hover:border-pink-300',
  orange: 'hover:border-orange-300',
}

const hoverBgColors: Record<string, string> = {
  indigo: 'hover:bg-[#FDF3EC]/80',
  blue: 'hover:bg-blue-50/80',
  emerald: 'hover:bg-emerald-50/80',
  cyan: 'hover:bg-cyan-50/80',
  violet: 'hover:bg-[#FDF3EC]/80',
  amber: 'hover:bg-amber-50/80',
  rose: 'hover:bg-rose-50/80',
  pink: 'hover:bg-pink-50/80',
  orange: 'hover:bg-orange-50/80',
}

interface ProfileEmptyStateProps {
  icon: LucideIcon
  color: string
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  className?: string
}

export function ProfileEmptyState({
  icon: Icon,
  color,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: ProfileEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-8 px-6 rounded-xl',
      'border-2 border-dashed transition-all duration-200',
      bgColors[color] || bgColors.indigo,
      borderColors[color] || borderColors.indigo,
      hoverBorderColors[color] || hoverBorderColors.indigo,
      hoverBgColors[color] || hoverBgColors.indigo,
      'animate-fade-in',
      className,
    )}>
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center mb-3',
        iconBgColors[color] || iconBgColors.indigo,
      )}>
        <Icon className={cn('w-6 h-6', iconTextColors[color] || iconTextColors.indigo)} />
      </div>
      <h4 className="font-medium text-gray-800 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 text-center mb-4 max-w-xs">{description}</p>
      <Button
        onClick={onAction}
        variant="outline"
        size="sm"
        className={cn(
          'border-dashed',
          borderColors[color] || borderColors.indigo,
          hoverBorderColors[color] || hoverBorderColors.indigo,
        )}
      >
        <Plus className="w-4 h-4 mr-1.5" />
        {actionLabel}
      </Button>
    </div>
  )
}
