import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineProgress, createPipelineStages } from './pipeline-progress'
import type { PipelineStage } from './pipeline-progress'

describe('PipelineProgress', () => {
  const pendingStage: PipelineStage = {
    id: 'stage-1',
    name: 'Classifying Content',
    description: 'Analyzing content type...',
    status: 'pending',
  }

  const runningStage: PipelineStage = {
    id: 'stage-2',
    name: 'Extracting Entities',
    description: 'Finding all relevant information...',
    status: 'running',
    percent: 45,
    message: 'Processing section 3 of 7',
  }

  const completeStage: PipelineStage = {
    id: 'stage-3',
    name: 'Specialized Analysis',
    description: 'Type-specific extraction...',
    status: 'complete',
    message: 'Found 12 entities',
    details: { items: 12, integrations: 3 },
  }

  const errorStage: PipelineStage = {
    id: 'stage-4',
    name: 'Populating Profiles',
    description: 'Adding items to tabs...',
    status: 'error',
    message: 'Failed to populate: timeout',
  }

  it('renders all stage names', () => {
    render(<PipelineProgress stages={[pendingStage, runningStage, completeStage]} />)
    expect(screen.getByText('Classifying Content')).toBeInTheDocument()
    expect(screen.getByText('Extracting Entities')).toBeInTheDocument()
    expect(screen.getByText('Specialized Analysis')).toBeInTheDocument()
  })

  it('shows percentage for running stages', () => {
    render(<PipelineProgress stages={[runningStage]} />)
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows message for running stages', () => {
    render(<PipelineProgress stages={[runningStage]} />)
    expect(screen.getByText('Processing section 3 of 7')).toBeInTheDocument()
  })

  it('shows message for complete stages', () => {
    render(<PipelineProgress stages={[completeStage]} />)
    expect(screen.getByText('Found 12 entities')).toBeInTheDocument()
  })

  it('shows details for complete stages', () => {
    render(<PipelineProgress stages={[completeStage]} />)
    // formatDetailKey converts "items" -> "Items" and "integrations" -> "Integrations"
    expect(screen.getByText('Items: 12')).toBeInTheDocument()
    expect(screen.getByText('Integrations: 3')).toBeInTheDocument()
  })

  it('shows error message for error stages', () => {
    render(<PipelineProgress stages={[errorStage]} />)
    expect(screen.getByText('Failed to populate: timeout')).toBeInTheDocument()
  })

  it('renders a progress bar for running stage with percent', () => {
    const { container } = render(<PipelineProgress stages={[runningStage]} />)
    const progressBar = container.querySelector('[style*="width: 45%"]')
    expect(progressBar).not.toBeNull()
  })

  it('does not render progress bar for pending stage', () => {
    const { container } = render(<PipelineProgress stages={[pendingStage]} />)
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeNull()
  })

  it('renders with custom className', () => {
    const { container } = render(
      <PipelineProgress stages={[pendingStage]} className="custom-class" />
    )
    // PipelineProgress wraps in ErrorBoundary, so find the space-y-3 div
    const innerDiv = container.querySelector('.space-y-3')
    expect(innerDiv).toHaveClass('custom-class')
  })

  it('renders connection lines between stages except after the last one', () => {
    const { container } = render(
      <PipelineProgress stages={[completeStage, runningStage, pendingStage]} />
    )
    // Each stage except the last should have a connection line
    // There are 3 stages, so 2 connection lines
    const connectionLines = container.querySelectorAll('.absolute.left-\\[11px\\]')
    expect(connectionLines.length).toBe(2)
  })

  it('shows entity count badge for running stage with details', () => {
    const stageWithEntityCount: PipelineStage = {
      ...runningStage,
      details: { entityCount: 8 },
    }
    render(<PipelineProgress stages={[stageWithEntityCount]} />)
    expect(screen.getByText('8 entities')).toBeInTheDocument()
  })

  it('does not show entity count badge when entityCount is 0', () => {
    const stageWithZeroEntities: PipelineStage = {
      ...runningStage,
      details: { entityCount: 0 },
    }
    render(<PipelineProgress stages={[stageWithZeroEntities]} />)
    expect(screen.queryByText('0 entities')).not.toBeInTheDocument()
  })

  it('renders empty when no stages are provided', () => {
    const { container } = render(<PipelineProgress stages={[]} />)
    // The container should have the ErrorBoundary wrapper and an empty div
    expect(container.querySelector('.space-y-3')).toBeInTheDocument()
    expect(container.querySelector('.space-y-3')?.children.length).toBe(0)
  })
})

describe('createPipelineStages', () => {
  it('returns 4 stages (excluding COMPLETE terminal stage)', () => {
    const stages = createPipelineStages('CLASSIFICATION', 'PROCESSING')
    expect(stages).toHaveLength(4)
    expect(stages.map(s => s.id)).toEqual([
      'CLASSIFICATION',
      'GENERAL_EXTRACTION',
      'SPECIALIZED_EXTRACTION',
      'TAB_POPULATION',
    ])
  })

  it('marks stages before current as complete', () => {
    const stages = createPipelineStages('SPECIALIZED_EXTRACTION', 'PROCESSING')
    expect(stages[0].status).toBe('complete') // CLASSIFICATION
    expect(stages[1].status).toBe('complete') // GENERAL_EXTRACTION
    expect(stages[2].status).toBe('running') // SPECIALIZED_EXTRACTION
    expect(stages[3].status).toBe('pending') // TAB_POPULATION
  })

  it('marks all stages complete when status is COMPLETE', () => {
    const stages = createPipelineStages('COMPLETE', 'COMPLETE')
    expect(stages[0].status).toBe('complete')
    expect(stages[1].status).toBe('complete')
    expect(stages[2].status).toBe('complete')
    expect(stages[3].status).toBe('complete')
  })

  it('marks current stage as error when status is FAILED', () => {
    const stages = createPipelineStages('GENERAL_EXTRACTION', 'FAILED')
    expect(stages[0].status).toBe('complete') // CLASSIFICATION
    expect(stages[1].status).toBe('error')    // GENERAL_EXTRACTION (current failed)
    expect(stages[2].status).toBe('pending')  // SPECIALIZED_EXTRACTION
    expect(stages[3].status).toBe('pending')  // TAB_POPULATION
  })

  it('includes progress info for current running stage', () => {
    const progress = {
      stage: 'GENERAL_EXTRACTION',
      status: 'running',
      percent: 60,
      message: 'Extracting from document...',
      details: { entityCount: 5 },
    }
    const stages = createPipelineStages('GENERAL_EXTRACTION', 'PROCESSING', progress)
    expect(stages[1].percent).toBe(60)
    expect(stages[1].message).toBe('Extracting from document...')
    expect(stages[1].details).toEqual({ entityCount: 5 })
  })

  it('includes classification details for completed CLASSIFICATION stage', () => {
    const classification = { type: 'KICKOFF_SESSION', confidence: 0.95 }
    const stages = createPipelineStages('GENERAL_EXTRACTION', 'PROCESSING', undefined, classification)
    expect(stages[0].status).toBe('complete')
    expect(stages[0].message).toContain('Kickoff Session')
    expect(stages[0].details).toEqual({ confidence: '95%' })
  })

  it('includes population details for completed TAB_POPULATION stage', () => {
    const population = { extractedItems: 20, integrations: 5 }
    const stages = createPipelineStages('COMPLETE', 'COMPLETE', undefined, undefined, population)
    expect(stages[3].status).toBe('complete')
    expect(stages[3].message).toContain('20 items')
    expect(stages[3].details).toEqual({ items: 20, integrations: 5 })
  })

  it('assigns correct names to stages', () => {
    const stages = createPipelineStages('CLASSIFICATION', 'PROCESSING')
    expect(stages[0].name).toBe('Classifying Content')
    expect(stages[1].name).toBe('Extracting Entities')
    expect(stages[2].name).toBe('Specialized Analysis')
    expect(stages[3].name).toBe('Populating Profiles')
  })

  it('does not include progress info for non-matching stage', () => {
    const progress = {
      stage: 'GENERAL_EXTRACTION',
      status: 'running',
      percent: 50,
      message: 'Working...',
    }
    // Current stage is CLASSIFICATION but progress is for GENERAL_EXTRACTION
    const stages = createPipelineStages('CLASSIFICATION', 'PROCESSING', progress)
    expect(stages[0].percent).toBeUndefined()
    expect(stages[0].message).toBeUndefined()
  })
})
