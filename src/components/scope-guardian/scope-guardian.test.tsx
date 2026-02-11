import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScopeGuardian } from './scope-guardian'

// Mock the ScopeItemCard component
vi.mock('./scope-item-card', () => ({
  ScopeItemCard: ({ id, statement, classification, skill, onResolve, onViewEvidence, evidence }: any) => (
    <div data-testid={`scope-item-${id}`} data-classification={classification}>
      <span>{statement}</span>
      {skill && <span data-testid="skill">{skill}</span>}
      {onResolve && (
        <button onClick={() => onResolve(id, 'IN_SCOPE', 'resolved')} data-testid={`resolve-${id}`}>
          Resolve
        </button>
      )}
      {evidence?.length > 0 && onViewEvidence && (
        <button onClick={() => onViewEvidence(evidence[0])} data-testid={`evidence-${id}`}>
          View Evidence
        </button>
      )}
    </div>
  ),
}))

const mockScopeItems = [
  {
    id: 'item-1',
    statement: 'Handle simple claims',
    classification: 'IN_SCOPE' as const,
    skill: 'claims',
    conditions: 'under $1000',
    notes: null,
    evidence: [{ id: 'ev-1', sourceType: 'RECORDING' as const, quote: 'quote' }],
  },
  {
    id: 'item-2',
    statement: 'Complex litigation',
    classification: 'OUT_OF_SCOPE' as const,
    skill: 'legal',
    conditions: null,
    notes: 'requires review',
    evidence: [],
  },
  {
    id: 'item-3',
    statement: 'Edge cases',
    classification: 'AMBIGUOUS' as const,
    skill: null,
    conditions: null,
    notes: null,
    evidence: [{ id: 'ev-2', sourceType: 'DOCUMENT' as const, quote: 'doc quote' }],
  },
]

describe('ScopeGuardian', () => {
  it('renders with scope items', () => {
    render(<ScopeGuardian scopeItems={mockScopeItems} />)

    // Should render summary cards
    expect(screen.getByText('In Scope')).toBeInTheDocument()
    expect(screen.getByText('Out of Scope')).toBeInTheDocument()
    expect(screen.getByText('Ambiguous')).toBeInTheDocument()
  })

  it('shows search input', () => {
    render(<ScopeGuardian scopeItems={mockScopeItems} />)

    expect(screen.getByPlaceholderText('Search scope items...')).toBeInTheDocument()
  })

  it('shows skill filter when skills provided', () => {
    render(<ScopeGuardian scopeItems={mockScopeItems} skills={['claims', 'legal']} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('hides skill filter when no skills provided', () => {
    render(<ScopeGuardian scopeItems={mockScopeItems} />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('filters by search query', async () => {
    const user = userEvent.setup()
    render(<ScopeGuardian scopeItems={mockScopeItems} />)

    // Click In Scope tab
    await user.click(screen.getByRole('tab', { name: /In Scope/i }))

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search scope items...')
    await user.type(searchInput, 'claims')

    // Item should still be visible (matches search)
    expect(screen.getByTestId('scope-item-item-1')).toBeInTheDocument()
  })

  it('switches tabs correctly', async () => {
    const user = userEvent.setup()
    render(<ScopeGuardian scopeItems={mockScopeItems} />)

    // Default is Ambiguous tab
    expect(screen.getByTestId('scope-item-item-3')).toBeInTheDocument()

    // Switch to In Scope
    await user.click(screen.getByRole('tab', { name: /In Scope/i }))
    expect(screen.getByTestId('scope-item-item-1')).toBeInTheDocument()

    // Switch to Out of Scope
    await user.click(screen.getByRole('tab', { name: /Out of Scope/i }))
    expect(screen.getByTestId('scope-item-item-2')).toBeInTheDocument()
  })

  it('calls onResolve when resolving an item', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()

    render(<ScopeGuardian scopeItems={mockScopeItems} onResolve={onResolve} />)

    // Ambiguous tab is default, click resolve
    await user.click(screen.getByTestId('resolve-item-3'))

    expect(onResolve).toHaveBeenCalledWith('item-3', 'IN_SCOPE', 'resolved')
  })

  it('calls onViewEvidence when viewing evidence', async () => {
    const user = userEvent.setup()
    const onViewEvidence = vi.fn()

    render(<ScopeGuardian scopeItems={mockScopeItems} onViewEvidence={onViewEvidence} />)

    // Click on In Scope tab to see item with evidence
    await user.click(screen.getByRole('tab', { name: /In Scope/i }))

    await user.click(screen.getByTestId('evidence-item-1'))

    expect(onViewEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ev-1' })
    )
  })

  it('applies custom className', () => {
    const { container } = render(
      <ScopeGuardian scopeItems={mockScopeItems} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles empty scope items', () => {
    render(<ScopeGuardian scopeItems={[]} />)

    // Should render the empty state (no items at all)
    expect(screen.getByText('No scope items yet')).toBeInTheDocument()
  })

  it('shows empty message when all items are resolved', () => {
    const resolvedItems = mockScopeItems.filter(i => i.classification !== 'AMBIGUOUS')
    render(<ScopeGuardian scopeItems={resolvedItems} />)

    // Items exist but no ambiguous ones - shows the ambiguous tab empty state
    expect(screen.getByText('No ambiguous items!')).toBeInTheDocument()
  })
})
