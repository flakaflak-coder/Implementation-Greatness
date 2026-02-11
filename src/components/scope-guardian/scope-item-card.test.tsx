import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScopeItemCard } from './scope-item-card'

// Mock the Dialog components from Radix UI
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}))

const defaultEvidence = [
  {
    id: 'ev-1',
    sourceType: 'RECORDING' as const,
    timestampStart: 120,
    timestampEnd: 180,
    page: null,
    quote: 'The client wants simple claims handled automatically',
    sessionNumber: 2,
  },
]

const baseProps = {
  id: 'scope-1',
  statement: 'Handle simple insurance claims',
  classification: 'IN_SCOPE' as const,
  skill: 'Claims Processing',
  conditions: 'Under $1000 only',
  notes: 'Confirmed by client',
  evidence: defaultEvidence,
}

describe('ScopeItemCard', () => {
  it('renders the scope item statement', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText('Handle simple insurance claims')).toBeInTheDocument()
  })

  it('renders conditions when provided', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText(/Under \$1000 only/)).toBeInTheDocument()
  })

  it('does not render conditions when not provided', () => {
    render(<ScopeItemCard {...baseProps} conditions={null} />)
    expect(screen.queryByText(/Condition:/)).not.toBeInTheDocument()
  })

  it('renders skill badge when provided', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText('Claims Processing')).toBeInTheDocument()
  })

  it('does not render skill badge when not provided', () => {
    render(<ScopeItemCard {...baseProps} skill={null} />)
    expect(screen.queryByText('Claims Processing')).not.toBeInTheDocument()
  })

  it('renders notes when provided', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText('Confirmed by client')).toBeInTheDocument()
  })

  it('does not render notes when not provided', () => {
    render(<ScopeItemCard {...baseProps} notes={null} />)
    expect(screen.queryByText('Confirmed by client')).not.toBeInTheDocument()
  })

  // Classification badge rendering
  it('displays "In Scope" badge for IN_SCOPE classification', () => {
    render(<ScopeItemCard {...baseProps} classification="IN_SCOPE" />)
    expect(screen.getByText('In Scope')).toBeInTheDocument()
  })

  it('displays "Out of Scope" badge for OUT_OF_SCOPE classification', () => {
    render(<ScopeItemCard {...baseProps} classification="OUT_OF_SCOPE" />)
    expect(screen.getByText('Out of Scope')).toBeInTheDocument()
  })

  it('displays "Ambiguous" badge for AMBIGUOUS classification', () => {
    render(<ScopeItemCard {...baseProps} classification="AMBIGUOUS" />)
    expect(screen.getByText('Ambiguous')).toBeInTheDocument()
  })

  // Evidence rendering
  it('renders evidence items when evidence array is non-empty', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText(/The client wants simple claims handled automatically/)).toBeInTheDocument()
  })

  it('renders recording evidence with session number and timestamp', () => {
    render(<ScopeItemCard {...baseProps} />)
    expect(screen.getByText(/Session 2, 2:00/)).toBeInTheDocument()
  })

  it('renders document evidence with page number', () => {
    const docEvidence = [
      {
        id: 'ev-2',
        sourceType: 'DOCUMENT' as const,
        timestampStart: null,
        timestampEnd: null,
        page: 5,
        quote: 'Document excerpt about claims',
        sessionNumber: undefined,
      },
    ]
    render(<ScopeItemCard {...baseProps} evidence={docEvidence} />)
    expect(screen.getByText('Page 5')).toBeInTheDocument()
  })

  it('does not render evidence section when evidence is empty', () => {
    render(<ScopeItemCard {...baseProps} evidence={[]} />)
    expect(screen.queryByText(/The client wants/)).not.toBeInTheDocument()
  })

  it('truncates long quotes to 100 characters', () => {
    const longQuote = 'A'.repeat(150)
    const longEvidence = [
      {
        id: 'ev-long',
        sourceType: 'RECORDING' as const,
        timestampStart: 60,
        timestampEnd: 120,
        page: null,
        quote: longQuote,
        sessionNumber: 1,
      },
    ]
    render(<ScopeItemCard {...baseProps} evidence={longEvidence} />)
    // Should truncate to 100 chars + '...'
    expect(screen.getByText(new RegExp('A{100}\\.\\.\\.'))).toBeInTheDocument()
  })

  // Evidence click handlers
  it('calls onViewEvidence when evidence is clicked', async () => {
    const user = userEvent.setup()
    const onViewEvidence = vi.fn()
    render(<ScopeItemCard {...baseProps} onViewEvidence={onViewEvidence} />)

    const evidenceButton = screen.getByText(/The client wants simple claims handled automatically/).closest('button')!
    await user.click(evidenceButton)

    expect(onViewEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ev-1' })
    )
  })

  // Resolve buttons for ambiguous items
  it('shows resolve buttons for AMBIGUOUS items when onResolve is provided', () => {
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onResolve={onResolve}
      />
    )

    expect(screen.getByRole('button', { name: /In Scope/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Out of Scope/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Needs Discussion/ })).toBeInTheDocument()
  })

  it('does not show resolve buttons for non-AMBIGUOUS items', () => {
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="IN_SCOPE"
        onResolve={onResolve}
      />
    )

    // Should not have "Needs Discussion" which is unique to ambiguous resolve buttons
    expect(screen.queryByRole('button', { name: /Needs Discussion/ })).not.toBeInTheDocument()
  })

  it('does not show resolve buttons when onResolve is not provided', () => {
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
      />
    )

    expect(screen.queryByRole('button', { name: /Needs Discussion/ })).not.toBeInTheDocument()
  })

  it('calls onResolve with IN_SCOPE when "In Scope" button is clicked', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onResolve={onResolve}
      />
    )

    await user.click(screen.getByRole('button', { name: /In Scope/ }))
    expect(onResolve).toHaveBeenCalledWith('scope-1', 'IN_SCOPE', '')
  })

  it('calls onResolve with OUT_OF_SCOPE when "Out of Scope" button is clicked', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onResolve={onResolve}
      />
    )

    await user.click(screen.getByRole('button', { name: /Out of Scope/ }))
    expect(onResolve).toHaveBeenCalledWith('scope-1', 'OUT_OF_SCOPE', '')
  })

  // Unresolve button
  it('shows "Move back to Ambiguous" button for resolved items when onUnresolve is provided', () => {
    const onUnresolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="IN_SCOPE"
        onUnresolve={onUnresolve}
      />
    )

    expect(screen.getByRole('button', { name: /Move back to Ambiguous/ })).toBeInTheDocument()
  })

  it('does not show unresolve button for AMBIGUOUS items', () => {
    const onUnresolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onUnresolve={onUnresolve}
      />
    )

    expect(screen.queryByRole('button', { name: /Move back to Ambiguous/ })).not.toBeInTheDocument()
  })

  it('calls onUnresolve when "Move back to Ambiguous" is clicked', async () => {
    const user = userEvent.setup()
    const onUnresolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="OUT_OF_SCOPE"
        onUnresolve={onUnresolve}
      />
    )

    await user.click(screen.getByRole('button', { name: /Move back to Ambiguous/ }))
    expect(onUnresolve).toHaveBeenCalledWith('scope-1')
  })

  // Selection mode
  it('does not show selection checkbox by default', () => {
    render(<ScopeItemCard {...baseProps} />)
    // No checkbox icons should be present when selectable is false
    expect(screen.queryByRole('button', { name: /Move back/ })).not.toBeInTheDocument()
  })

  it('calls onToggleSelect when card is clicked in selection mode', async () => {
    const user = userEvent.setup()
    const onToggleSelect = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        selectable={true}
        selected={false}
        onToggleSelect={onToggleSelect}
      />
    )

    // Click the card itself
    const card = screen.getByText('Handle simple insurance claims').closest('[class*="transition-all"]')!
    await user.click(card)

    expect(onToggleSelect).toHaveBeenCalledWith('scope-1')
  })

  it('hides resolve buttons when in selection mode', () => {
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onResolve={onResolve}
        selectable={true}
        selected={false}
        onToggleSelect={vi.fn()}
      />
    )

    // Resolve buttons should be hidden in selection mode
    expect(screen.queryByRole('button', { name: /Needs Discussion/ })).not.toBeInTheDocument()
  })

  // Dialog for "Needs Discussion"
  it('opens resolve dialog when "Needs Discussion" is clicked', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    render(
      <ScopeItemCard
        {...baseProps}
        classification="AMBIGUOUS"
        onResolve={onResolve}
      />
    )

    await user.click(screen.getByRole('button', { name: /Needs Discussion/ }))

    // Dialog should now be visible
    expect(screen.getByText('Resolve Scope Item')).toBeInTheDocument()
  })
})
