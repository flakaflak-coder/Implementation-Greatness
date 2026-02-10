// Shared types for the Support Dashboard

export interface SupportDE {
  id: string
  name: string
  description: string | null
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  channels: string[]
  companyId: string
  companyName: string
  currentJourneyPhase: string
  trackerStatus: 'ON_TRACK' | 'ATTENTION' | 'BLOCKED' | 'TO_PLAN'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  blocker: string | null
  goLiveDate: string | null
  updatedAt: string
  healthScore: number
  escalationRuleCount: number
  scopeItemCount: number
  integrationCount: number
  scenarioCount: number
}

export type HealthStatus = 'healthy' | 'attention' | 'critical'

export type SortField = 'healthScore' | 'updatedAt' | 'companyName' | 'name'
export type SortDirection = 'asc' | 'desc'

export interface HealthSummary {
  total: number
  healthy: number
  attention: number
  critical: number
  averageScore: number
}

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 80) return 'healthy'
  if (score >= 60) return 'attention'
  return 'critical'
}

export function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-emerald-600'
    case 'attention':
      return 'text-amber-500'
    case 'critical':
      return 'text-red-600'
  }
}

export function getHealthBg(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-50 border-emerald-200'
    case 'attention':
      return 'bg-amber-50 border-amber-200'
    case 'critical':
      return 'bg-red-50 border-red-200'
  }
}

export function getHealthLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'attention':
      return 'Attention'
    case 'critical':
      return 'Critical'
  }
}

export function computeHealthScore(de: {
  trackerStatus: string
  riskLevel: string
  status: string
  blocker: string | null
}): number {
  let score = 85

  // Tracker status impact
  switch (de.trackerStatus) {
    case 'ON_TRACK':
      score += 10
      break
    case 'ATTENTION':
      score -= 15
      break
    case 'BLOCKED':
      score -= 35
      break
    case 'TO_PLAN':
      score -= 5
      break
  }

  // Risk level impact
  switch (de.riskLevel) {
    case 'LOW':
      score += 5
      break
    case 'MEDIUM':
      score -= 10
      break
    case 'HIGH':
      score -= 25
      break
  }

  // Blocker impact
  if (de.blocker) {
    score -= 10
  }

  // Live DEs get a baseline bonus (they made it to live)
  if (de.status === 'LIVE') {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

export function formatJourneyPhase(phase: string): string {
  const mapping: Record<string, string> = {
    SALES_HANDOVER: 'Sales Handover',
    KICKOFF: 'Kickoff',
    DESIGN_WEEK: 'Design Week',
    ONBOARDING: 'Onboarding',
    UAT: 'UAT',
    GO_LIVE: 'Go-Live',
    HYPERCARE: 'Hypercare',
    HANDOVER_TO_SUPPORT: 'Handover to Support',
  }
  return mapping[phase] || phase
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
