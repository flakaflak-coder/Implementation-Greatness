import { describe, it, expect } from 'vitest'
import {
  JOURNEY_PHASES,
  PHASE_COLORS,
  getPhaseConfig,
  getPhaseByOrder,
  getPhaseLabel,
  getPhaseOrder,
  getNextPhase,
  getPreviousPhase,
  calculateJourneyProgress,
} from './journey-phases'
import type { JourneyPhaseType } from './journey-phases'

describe('JOURNEY_PHASES', () => {
  it('defines exactly 8 phases', () => {
    expect(JOURNEY_PHASES).toHaveLength(8)
  })

  it('has phases in sequential order', () => {
    for (let i = 0; i < JOURNEY_PHASES.length; i++) {
      expect(JOURNEY_PHASES[i].order).toBe(i + 1)
    }
  })

  it('starts with SALES_HANDOVER', () => {
    expect(JOURNEY_PHASES[0].type).toBe('SALES_HANDOVER')
  })

  it('ends with HANDOVER_TO_SUPPORT', () => {
    expect(JOURNEY_PHASES[JOURNEY_PHASES.length - 1].type).toBe('HANDOVER_TO_SUPPORT')
  })

  it('each phase has required fields', () => {
    for (const phase of JOURNEY_PHASES) {
      expect(phase.type).toBeDefined()
      expect(phase.order).toBeGreaterThan(0)
      expect(phase.label).toBeDefined()
      expect(phase.shortLabel).toBeDefined()
      expect(phase.description).toBeDefined()
      expect(phase.icon).toBeDefined()
      expect(phase.color).toBeDefined()
      expect(phase.defaultChecklist).toBeDefined()
      expect(phase.defaultChecklist.length).toBeGreaterThan(0)
    }
  })

  it('DESIGN_WEEK has sub-phases', () => {
    const designWeek = JOURNEY_PHASES.find((p) => p.type === 'DESIGN_WEEK')
    expect(designWeek).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((designWeek as any).hasSubPhases).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((designWeek as any).subPhases).toHaveLength(4)
  })

  it('all phase types are unique', () => {
    const types = JOURNEY_PHASES.map((p) => p.type)
    const unique = new Set(types)
    expect(unique.size).toBe(types.length)
  })
})

describe('PHASE_COLORS', () => {
  it('has color mappings for all phase colors used', () => {
    const usedColors = new Set(JOURNEY_PHASES.map((p) => p.color))
    for (const color of usedColors) {
      expect(PHASE_COLORS[color]).toBeDefined()
      expect(PHASE_COLORS[color].bg).toBeDefined()
      expect(PHASE_COLORS[color].text).toBeDefined()
      expect(PHASE_COLORS[color].border).toBeDefined()
    }
  })
})

describe('getPhaseConfig', () => {
  it('returns config for valid phase type', () => {
    const config = getPhaseConfig('SALES_HANDOVER')
    expect(config).toBeDefined()
    expect(config?.type).toBe('SALES_HANDOVER')
    expect(config?.order).toBe(1)
    expect(config?.label).toBe('Sales Handover')
  })

  it('returns config for each phase type', () => {
    const phaseTypes: JourneyPhaseType[] = [
      'SALES_HANDOVER', 'KICKOFF', 'DESIGN_WEEK', 'ONBOARDING',
      'UAT', 'GO_LIVE', 'HYPERCARE', 'HANDOVER_TO_SUPPORT',
    ]
    for (const type of phaseTypes) {
      const config = getPhaseConfig(type)
      expect(config).toBeDefined()
      expect(config?.type).toBe(type)
    }
  })

  it('returns undefined for invalid phase type', () => {
    const config = getPhaseConfig('INVALID' as JourneyPhaseType)
    expect(config).toBeUndefined()
  })
})

describe('getPhaseByOrder', () => {
  it('returns correct phase for order 1', () => {
    const phase = getPhaseByOrder(1)
    expect(phase?.type).toBe('SALES_HANDOVER')
  })

  it('returns correct phase for order 8', () => {
    const phase = getPhaseByOrder(8)
    expect(phase?.type).toBe('HANDOVER_TO_SUPPORT')
  })

  it('returns undefined for order 0', () => {
    expect(getPhaseByOrder(0)).toBeUndefined()
  })

  it('returns undefined for order 9', () => {
    expect(getPhaseByOrder(9)).toBeUndefined()
  })

  it('returns undefined for negative order', () => {
    expect(getPhaseByOrder(-1)).toBeUndefined()
  })
})

describe('getPhaseLabel', () => {
  it('returns human-readable label for each phase', () => {
    expect(getPhaseLabel('SALES_HANDOVER')).toBe('Sales Handover')
    expect(getPhaseLabel('KICKOFF')).toBe('Kickoff')
    expect(getPhaseLabel('DESIGN_WEEK')).toBe('Design Week')
    expect(getPhaseLabel('ONBOARDING')).toBe('Onboarding')
    expect(getPhaseLabel('UAT')).toBe('UAT')
    expect(getPhaseLabel('GO_LIVE')).toBe('Go Live')
    expect(getPhaseLabel('HYPERCARE')).toBe('Hypercare')
    expect(getPhaseLabel('HANDOVER_TO_SUPPORT')).toBe('Handover to Support')
  })

  it('returns the type string itself for unknown phase', () => {
    expect(getPhaseLabel('UNKNOWN_PHASE' as JourneyPhaseType)).toBe('UNKNOWN_PHASE')
  })
})

describe('getPhaseOrder', () => {
  it('returns correct order for each phase', () => {
    expect(getPhaseOrder('SALES_HANDOVER')).toBe(1)
    expect(getPhaseOrder('KICKOFF')).toBe(2)
    expect(getPhaseOrder('DESIGN_WEEK')).toBe(3)
    expect(getPhaseOrder('ONBOARDING')).toBe(4)
    expect(getPhaseOrder('UAT')).toBe(5)
    expect(getPhaseOrder('GO_LIVE')).toBe(6)
    expect(getPhaseOrder('HYPERCARE')).toBe(7)
    expect(getPhaseOrder('HANDOVER_TO_SUPPORT')).toBe(8)
  })

  it('returns 0 for unknown phase type', () => {
    expect(getPhaseOrder('INVALID' as JourneyPhaseType)).toBe(0)
  })
})

describe('getNextPhase', () => {
  it('returns KICKOFF after SALES_HANDOVER', () => {
    expect(getNextPhase('SALES_HANDOVER')).toBe('KICKOFF')
  })

  it('returns DESIGN_WEEK after KICKOFF', () => {
    expect(getNextPhase('KICKOFF')).toBe('DESIGN_WEEK')
  })

  it('returns ONBOARDING after DESIGN_WEEK', () => {
    expect(getNextPhase('DESIGN_WEEK')).toBe('ONBOARDING')
  })

  it('returns UAT after ONBOARDING', () => {
    expect(getNextPhase('ONBOARDING')).toBe('UAT')
  })

  it('returns GO_LIVE after UAT', () => {
    expect(getNextPhase('UAT')).toBe('GO_LIVE')
  })

  it('returns HYPERCARE after GO_LIVE', () => {
    expect(getNextPhase('GO_LIVE')).toBe('HYPERCARE')
  })

  it('returns HANDOVER_TO_SUPPORT after HYPERCARE', () => {
    expect(getNextPhase('HYPERCARE')).toBe('HANDOVER_TO_SUPPORT')
  })

  it('returns null after HANDOVER_TO_SUPPORT (last phase)', () => {
    expect(getNextPhase('HANDOVER_TO_SUPPORT')).toBeNull()
  })
})

describe('getPreviousPhase', () => {
  it('returns null for SALES_HANDOVER (first phase)', () => {
    expect(getPreviousPhase('SALES_HANDOVER')).toBeNull()
  })

  it('returns SALES_HANDOVER before KICKOFF', () => {
    expect(getPreviousPhase('KICKOFF')).toBe('SALES_HANDOVER')
  })

  it('returns KICKOFF before DESIGN_WEEK', () => {
    expect(getPreviousPhase('DESIGN_WEEK')).toBe('KICKOFF')
  })

  it('returns HYPERCARE before HANDOVER_TO_SUPPORT', () => {
    expect(getPreviousPhase('HANDOVER_TO_SUPPORT')).toBe('HYPERCARE')
  })
})

describe('calculateJourneyProgress', () => {
  it('returns 0 when no phases are complete', () => {
    const statuses = {} as Record<JourneyPhaseType, string>
    const progress = calculateJourneyProgress('SALES_HANDOVER', statuses)
    expect(progress).toBe(0)
  })

  it('returns 100 when all phases are complete', () => {
    const statuses = {
      SALES_HANDOVER: 'COMPLETE',
      KICKOFF: 'COMPLETE',
      DESIGN_WEEK: 'COMPLETE',
      ONBOARDING: 'COMPLETE',
      UAT: 'COMPLETE',
      GO_LIVE: 'COMPLETE',
      HYPERCARE: 'COMPLETE',
      HANDOVER_TO_SUPPORT: 'COMPLETE',
    } as Record<JourneyPhaseType, string>
    const progress = calculateJourneyProgress('HANDOVER_TO_SUPPORT', statuses)
    expect(progress).toBe(100)
  })

  it('returns 50 when 4 of 8 phases are complete', () => {
    const statuses = {
      SALES_HANDOVER: 'COMPLETE',
      KICKOFF: 'COMPLETE',
      DESIGN_WEEK: 'COMPLETE',
      ONBOARDING: 'COMPLETE',
      UAT: 'IN_PROGRESS',
      GO_LIVE: 'NOT_STARTED',
      HYPERCARE: 'NOT_STARTED',
      HANDOVER_TO_SUPPORT: 'NOT_STARTED',
    } as Record<JourneyPhaseType, string>
    const progress = calculateJourneyProgress('UAT', statuses)
    expect(progress).toBe(50)
  })

  it('returns 13 (rounded) when 1 of 8 phases are complete', () => {
    const statuses = {
      SALES_HANDOVER: 'COMPLETE',
      KICKOFF: 'IN_PROGRESS',
    } as Record<JourneyPhaseType, string>
    const progress = calculateJourneyProgress('KICKOFF', statuses)
    expect(progress).toBe(13) // 1/8 = 12.5 -> rounded to 13
  })

  it('only counts COMPLETE status, not IN_PROGRESS', () => {
    const statuses = {
      SALES_HANDOVER: 'IN_PROGRESS',
      KICKOFF: 'IN_PROGRESS',
    } as Record<JourneyPhaseType, string>
    const progress = calculateJourneyProgress('SALES_HANDOVER', statuses)
    expect(progress).toBe(0)
  })
})
