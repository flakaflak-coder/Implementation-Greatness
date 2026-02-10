'use client'

import { cn } from '@/lib/utils'
import {
  Bot,
  Target,
  TrendingUp,
  MessageSquare,
  Sparkles,
  GitBranch,
  Shield,
  MessageCircle,
  Plug,
  Database,
  Globe,
  ShieldCheck,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import type { BusinessProfile, TechnicalProfile } from './profile-types'

const iconMap: Record<string, LucideIcon> = {
  Bot,
  Target,
  TrendingUp,
  MessageSquare,
  Sparkles,
  GitBranch,
  Shield,
  MessageCircle,
  Plug,
  Database,
  Globe,
  ShieldCheck,
  Users,
  BarChart3,
}

const colorConfig: Record<string, { ring: string; bg: string; text: string; track: string; fill: string }> = {
  indigo: { ring: 'stroke-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600', track: 'stroke-indigo-100', fill: 'stroke-indigo-500' },
  blue: { ring: 'stroke-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', track: 'stroke-blue-100', fill: 'stroke-blue-500' },
  emerald: { ring: 'stroke-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', track: 'stroke-emerald-100', fill: 'stroke-emerald-500' },
  cyan: { ring: 'stroke-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-600', track: 'stroke-cyan-100', fill: 'stroke-cyan-500' },
  violet: { ring: 'stroke-violet-500', bg: 'bg-violet-50', text: 'text-violet-600', track: 'stroke-violet-100', fill: 'stroke-violet-500' },
  amber: { ring: 'stroke-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', track: 'stroke-amber-100', fill: 'stroke-amber-500' },
  rose: { ring: 'stroke-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', track: 'stroke-rose-100', fill: 'stroke-rose-500' },
  pink: { ring: 'stroke-pink-500', bg: 'bg-pink-50', text: 'text-pink-600', track: 'stroke-pink-100', fill: 'stroke-pink-500' },
  orange: { ring: 'stroke-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', track: 'stroke-orange-100', fill: 'stroke-orange-500' },
}

function CircularProgress({ percentage, size = 36, strokeWidth = 3, color }: {
  percentage: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const colors = colorConfig[color] || colorConfig.indigo

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colors.track}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(colors.fill, 'transition-all duration-700 ease-out')}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center text-[10px] font-bold',
        percentage === 100 ? 'text-emerald-600' : 'text-gray-500'
      )}>
        {percentage}
      </span>
    </div>
  )
}

// ============================================
// Business Profile Completeness
// ============================================

function calculateBusinessCompleteness(profile: BusinessProfile) {
  const sections: { key: string; title: string; icon: string; color: string; filled: number; total: number }[] = [
    {
      key: 'identity',
      title: 'Identity',
      icon: 'Bot',
      color: 'indigo',
      filled: [
        profile.identity.name,
        profile.identity.description,
        profile.identity.stakeholders.length > 0,
      ].filter(Boolean).length,
      total: 3,
    },
    {
      key: 'businessContext',
      title: 'Business Context',
      icon: 'Target',
      color: 'blue',
      filled: [
        profile.businessContext.problemStatement,
        profile.businessContext.volumePerMonth !== null,
        profile.businessContext.costPerCase !== null,
        profile.businessContext.peakPeriods.length > 0,
        profile.businessContext.painPoints.length > 0,
      ].filter(Boolean).length,
      total: 5,
    },
    {
      key: 'kpis',
      title: 'KPIs',
      icon: 'TrendingUp',
      color: 'emerald',
      filled: Math.min(profile.kpis.length, 3),
      total: 3,
    },
    {
      key: 'channels',
      title: 'Channels',
      icon: 'MessageSquare',
      color: 'cyan',
      filled: Math.min(profile.channels.length, 2),
      total: 2,
    },
    {
      key: 'skills',
      title: 'Skills',
      icon: 'Sparkles',
      color: 'violet',
      filled: [
        profile.skills.skills.length > 0,
        profile.skills.communicationStyle.tone.length > 0,
        profile.skills.communicationStyle.languages.length > 0,
      ].filter(Boolean).length,
      total: 3,
    },
    {
      key: 'process',
      title: 'Process',
      icon: 'GitBranch',
      color: 'amber',
      filled: [
        profile.process.happyPathSteps.length > 0,
        profile.process.exceptions.length > 0,
        profile.process.escalationRules.length > 0,
      ].filter(Boolean).length,
      total: 3,
    },
    {
      key: 'guardrails',
      title: 'Guardrails',
      icon: 'Shield',
      color: 'rose',
      filled: [
        profile.guardrails.never.length > 0,
        profile.guardrails.always.length > 0,
      ].filter(Boolean).length,
      total: 2,
    },
    {
      key: 'persona',
      title: 'Persona',
      icon: 'MessageCircle',
      color: 'pink',
      filled: [
        profile.persona?.traits && profile.persona.traits.length > 0,
        profile.persona?.toneRules && profile.persona.toneRules.length > 0,
        profile.persona?.openingMessage,
      ].filter(Boolean).length,
      total: 3,
    },
  ]

  return sections
}

function calculateTechnicalCompleteness(profile: TechnicalProfile) {
  const sections: { key: string; title: string; icon: string; color: string; filled: number; total: number }[] = [
    {
      key: 'integrations',
      title: 'Integrations',
      icon: 'Plug',
      color: 'violet',
      filled: Math.min(profile.integrations.length, 2),
      total: 2,
    },
    {
      key: 'dataFields',
      title: 'Data Fields',
      icon: 'Database',
      color: 'blue',
      filled: Math.min(profile.dataFields.length, 3),
      total: 3,
    },
    {
      key: 'apiEndpoints',
      title: 'API Endpoints',
      icon: 'Globe',
      color: 'cyan',
      filled: Math.min(profile.apiEndpoints.length, 2),
      total: 2,
    },
    {
      key: 'securityRequirements',
      title: 'Security',
      icon: 'ShieldCheck',
      color: 'rose',
      filled: Math.min(profile.securityRequirements.length, 2),
      total: 2,
    },
    {
      key: 'technicalContacts',
      title: 'Contacts',
      icon: 'Users',
      color: 'emerald',
      filled: Math.min(profile.technicalContacts.length, 2),
      total: 2,
    },
    {
      key: 'monitoringMetrics',
      title: 'Monitoring',
      icon: 'BarChart3',
      color: 'orange',
      filled: Math.min(profile.monitoringMetrics.length, 2),
      total: 2,
    },
  ]

  return sections
}

// ============================================
// Completeness Component
// ============================================

interface ProfileCompletenessProps {
  profile: BusinessProfile | TechnicalProfile
  type: 'business' | 'technical'
  onSectionClick?: (sectionKey: string) => void
  className?: string
}

export function ProfileCompleteness({ profile, type, onSectionClick, className }: ProfileCompletenessProps) {
  const sections = type === 'business'
    ? calculateBusinessCompleteness(profile as BusinessProfile)
    : calculateTechnicalCompleteness(profile as TechnicalProfile)

  const totalFilled = sections.reduce((sum, s) => sum + s.filled, 0)
  const totalFields = sections.reduce((sum, s) => sum + s.total, 0)
  const overallPercentage = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              overallPercentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500'
            )}
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
        <span className={cn(
          'text-sm font-semibold tabular-nums min-w-[3ch] text-right',
          overallPercentage === 100 ? 'text-emerald-600' : 'text-gray-600'
        )}>
          {overallPercentage}%
        </span>
      </div>

      {/* Section cards */}
      <div className={cn(
        'grid gap-2',
        type === 'business' ? 'grid-cols-4' : 'grid-cols-3',
      )}>
        {sections.map((section, index) => {
          const Icon = iconMap[section.icon]
          const colors = colorConfig[section.color] || colorConfig.indigo
          const percentage = section.total > 0 ? Math.round((section.filled / section.total) * 100) : 0

          return (
            <button
              key={section.key}
              onClick={() => onSectionClick?.(section.key)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100',
                'bg-white hover:bg-gray-50/80 hover:border-gray-200',
                'transition-all duration-200 text-left group',
                'animate-fade-in-up',
                index < 8 && `stagger-${index + 1}`,
              )}
            >
              <CircularProgress percentage={percentage} color={section.color} />
              <div className="min-w-0 flex-1">
                <p className={cn(
                  'text-xs font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors',
                )}>
                  {section.title}
                </p>
                <p className="text-[10px] text-gray-400 tabular-nums">
                  {section.filled}/{section.total}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
