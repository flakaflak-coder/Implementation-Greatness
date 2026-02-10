// Journey Phase Configuration
// Defines the 8-phase onboarding journey for Digital Employees

export const JOURNEY_PHASES = [
  {
    type: 'SALES_HANDOVER' as const,
    order: 1,
    label: 'Sales Handover',
    shortLabel: 'Handover',
    description: 'Internal handover from sales to implementation team',
    icon: 'FileSignature',
    color: 'blue',
    defaultChecklist: [
      'CRM data transferred',
      'Contract reviewed',
      'Stakeholder map created',
      'Initial requirements documented',
      'Implementation team assigned',
    ],
  },
  {
    type: 'KICKOFF' as const,
    order: 2,
    label: 'Kickoff',
    shortLabel: 'Kickoff',
    description: 'Initial customer meeting to align on goals and timeline',
    icon: 'Rocket',
    color: 'terracotta',
    defaultChecklist: [
      'Kickoff meeting scheduled',
      'Agenda sent to customer',
      'Kickoff meeting completed',
      'Goals and success criteria documented',
      'Timeline agreed',
    ],
  },
  {
    type: 'DESIGN_WEEK' as const,
    order: 3,
    label: 'Design Week',
    shortLabel: 'Design',
    description: 'The 4-phase design process to define scope and requirements',
    icon: 'Palette',
    color: 'terracotta',
    hasSubPhases: true,
    subPhases: [
      { order: 1, label: 'Kickoff', description: 'Initial alignment and goal setting' },
      { order: 2, label: 'Process Design', description: 'Detailed workflow mapping' },
      { order: 3, label: 'Technical Deep-dive', description: 'Integration and system requirements' },
      { order: 4, label: 'Sign-off', description: 'Final validation and approval' },
    ],
    defaultChecklist: [
      'Design Week scheduled',
      'All sessions completed',
      'Scope items finalized',
      'Scenarios documented',
      'Sign-off received',
    ],
  },
  {
    type: 'ONBOARDING' as const,
    order: 4,
    label: 'Onboarding',
    shortLabel: 'Onboard',
    description: 'Build and deployment phase',
    icon: 'Wrench',
    color: 'orange',
    defaultChecklist: [
      'Environment provisioned',
      'Integrations configured',
      'Agent trained with scenarios',
      'Initial testing completed',
      'Customer sandbox access provided',
    ],
  },
  {
    type: 'UAT' as const,
    order: 5,
    label: 'UAT',
    shortLabel: 'UAT',
    description: 'User Acceptance Testing',
    icon: 'ClipboardCheck',
    color: 'yellow',
    defaultChecklist: [
      'UAT test cases prepared',
      'UAT session scheduled',
      'Customer feedback collected',
      'Issues resolved',
      'UAT sign-off received',
    ],
  },
  {
    type: 'GO_LIVE' as const,
    order: 6,
    label: 'Go Live',
    shortLabel: 'Go Live',
    description: 'First day of the digital employee',
    icon: 'Zap',
    color: 'green',
    defaultChecklist: [
      'Production deployment completed',
      'Monitoring configured',
      'Customer notified',
      'First interactions verified',
      'Rollback plan ready',
    ],
  },
  {
    type: 'HYPERCARE' as const,
    order: 7,
    label: 'Hypercare',
    shortLabel: 'Hypercare',
    description: 'Intensive support period (typically 2-4 weeks)',
    icon: 'HeartPulse',
    color: 'pink',
    defaultChecklist: [
      'Daily monitoring active',
      'Issue triage process established',
      'Performance review scheduled',
      'Optimization opportunities identified',
      'Customer satisfaction check',
    ],
  },
  {
    type: 'HANDOVER_TO_SUPPORT' as const,
    order: 8,
    label: 'Handover to Support',
    shortLabel: 'Support',
    description: 'Transition to BAU support',
    icon: 'Headphones',
    color: 'teal',
    defaultChecklist: [
      'Runbook completed',
      'Support team briefed',
      'Escalation paths defined',
      'Documentation finalized',
      'Implementation team sign-off',
    ],
  },
] as const

export type JourneyPhaseType = (typeof JOURNEY_PHASES)[number]['type']

export type JourneyPhaseConfig = (typeof JOURNEY_PHASES)[number]

// Helper functions
export function getPhaseConfig(type: JourneyPhaseType): JourneyPhaseConfig | undefined {
  return JOURNEY_PHASES.find((p) => p.type === type)
}

export function getPhaseByOrder(order: number): JourneyPhaseConfig | undefined {
  return JOURNEY_PHASES.find((p) => p.order === order)
}

export function getPhaseLabel(type: JourneyPhaseType): string {
  return getPhaseConfig(type)?.label ?? type
}

export function getPhaseOrder(type: JourneyPhaseType): number {
  return getPhaseConfig(type)?.order ?? 0
}

export function getNextPhase(type: JourneyPhaseType): JourneyPhaseType | null {
  const currentOrder = getPhaseOrder(type)
  const nextPhase = getPhaseByOrder(currentOrder + 1)
  return nextPhase?.type ?? null
}

export function getPreviousPhase(type: JourneyPhaseType): JourneyPhaseType | null {
  const currentOrder = getPhaseOrder(type)
  const prevPhase = getPhaseByOrder(currentOrder - 1)
  return prevPhase?.type ?? null
}

export function calculateJourneyProgress(
  currentPhase: JourneyPhaseType,
  phaseStatuses: Record<JourneyPhaseType, string>
): number {
  const completedPhases = JOURNEY_PHASES.filter(
    (p) => phaseStatuses[p.type] === 'COMPLETE'
  ).length
  return Math.round((completedPhases / JOURNEY_PHASES.length) * 100)
}

// Color mappings for Tailwind classes
export const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  terracotta: { bg: 'bg-[#F5E6DA]', text: 'text-[#C2703E]', border: 'border-[#E8D5C4]' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
}
