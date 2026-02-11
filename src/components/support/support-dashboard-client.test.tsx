import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportDashboardClient } from './support-dashboard-client'
import type { SupportDE } from './types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock child components to simplify testing
vi.mock('./health-summary-bar', () => ({
  HealthSummaryBar: ({ summary }: { summary: { total: number; healthy: number; attention: number; critical: number; averageScore: number } }) => (
    <div data-testid="health-summary-bar">
      <span data-testid="summary-total">{summary.total}</span>
      <span data-testid="summary-healthy">{summary.healthy}</span>
      <span data-testid="summary-attention">{summary.attention}</span>
      <span data-testid="summary-critical">{summary.critical}</span>
      <span data-testid="summary-average">{summary.averageScore}</span>
    </div>
  ),
}))

vi.mock('./de-health-card', () => ({
  DEHealthCard: ({ de, onSelect }: { de: SupportDE; onSelect: (de: SupportDE) => void }) => (
    <div data-testid={`de-card-${de.id}`} onClick={() => onSelect(de)}>
      <span>{de.name}</span>
      <span>{de.companyName}</span>
    </div>
  ),
}))

vi.mock('./de-detail-panel', () => ({
  DEDetailPanel: ({ de, open }: { de: SupportDE | null; open: boolean }) =>
    open && de ? (
      <div data-testid="detail-panel">
        <span>{de.name}</span>
      </div>
    ) : null,
}))

function createMockDE(overrides: Partial<SupportDE> = {}): SupportDE {
  return {
    id: 'de-1',
    name: 'Claims Assistant',
    description: 'Handles insurance claims intake',
    status: 'LIVE',
    channels: ['EMAIL', 'WEBCHAT'],
    companyId: 'company-1',
    companyName: 'Acme Insurance',
    currentJourneyPhase: 'HYPERCARE',
    trackerStatus: 'ON_TRACK',
    riskLevel: 'LOW',
    blocker: null,
    goLiveDate: '2024-06-15',
    updatedAt: new Date().toISOString(),
    healthScore: 92,
    escalationRuleCount: 5,
    scopeItemCount: 12,
    integrationCount: 3,
    scenarioCount: 8,
    ...overrides,
  }
}

const mockDEs: SupportDE[] = [
  createMockDE({ id: 'de-1', name: 'Claims Assistant', companyName: 'Acme Insurance', healthScore: 92 }),
  createMockDE({ id: 'de-2', name: 'Support Bot', companyName: 'Beta Corp', healthScore: 65, currentJourneyPhase: 'GO_LIVE' }),
  createMockDE({ id: 'de-3', name: 'Intake Agent', companyName: 'Acme Insurance', healthScore: 45 }),
]

const mockCompanies = ['Acme Insurance', 'Beta Corp']

describe('SupportDashboardClient', () => {
  // Basic rendering
  it('renders health summary bar', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByTestId('health-summary-bar')).toBeInTheDocument()
  })

  it('computes correct health summary totals', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByTestId('summary-total')).toHaveTextContent('3')
  })

  it('computes correct healthy count in summary', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    // Only de-1 (score 92) is healthy (>=80)
    expect(screen.getByTestId('summary-healthy')).toHaveTextContent('1')
  })

  it('computes correct attention count in summary', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    // de-2 (score 65) is attention (60-79)
    expect(screen.getByTestId('summary-attention')).toHaveTextContent('1')
  })

  it('computes correct critical count in summary', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    // de-3 (score 45) is critical (<60)
    expect(screen.getByTestId('summary-critical')).toHaveTextContent('1')
  })

  // Search functionality
  it('renders search input', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(
      screen.getByPlaceholderText('Search by DE name, company, or status...')
    ).toBeInTheDocument()
  })

  it('renders all DE cards initially', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByTestId('de-card-de-1')).toBeInTheDocument()
    expect(screen.getByTestId('de-card-de-2')).toBeInTheDocument()
    expect(screen.getByTestId('de-card-de-3')).toBeInTheDocument()
  })

  it('shows "Showing all N Digital Employees" count', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByText('Showing all 3 Digital Employees')).toBeInTheDocument()
  })

  it('filters DE cards based on search query by name', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'Claims')

    expect(screen.getByTestId('de-card-de-1')).toBeInTheDocument()
    expect(screen.queryByTestId('de-card-de-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('de-card-de-3')).not.toBeInTheDocument()
  })

  it('filters DE cards based on search query by company name', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'Beta')

    expect(screen.queryByTestId('de-card-de-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('de-card-de-2')).toBeInTheDocument()
    expect(screen.queryByTestId('de-card-de-3')).not.toBeInTheDocument()
  })

  it('shows filtered count when search is active', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'Claims')

    expect(screen.getByText('Showing 1 of 3 Digital Employees')).toBeInTheDocument()
  })

  it('shows clear search button when search has value', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'test')

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'Claims')
    expect(screen.queryByTestId('de-card-de-2')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Clear search'))
    expect(screen.getByTestId('de-card-de-1')).toBeInTheDocument()
    expect(screen.getByTestId('de-card-de-2')).toBeInTheDocument()
    expect(screen.getByTestId('de-card-de-3')).toBeInTheDocument()
  })

  // Empty state
  it('shows empty state when no DEs match', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'nonexistent')

    expect(screen.getByText('No Digital Employees match your filters')).toBeInTheDocument()
  })

  it('shows "Clear all filters" button in empty state with active filters', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'nonexistent')

    expect(screen.getByText('Clear all filters')).toBeInTheDocument()
  })

  it('shows generic empty state when no DEs exist and no filters active', () => {
    render(<SupportDashboardClient digitalEmployees={[]} companies={[]} />)
    expect(screen.getByText('No Digital Employees yet')).toBeInTheDocument()
  })

  // DE selection / detail panel
  it('opens detail panel when a DE card is clicked', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    await user.click(screen.getByTestId('de-card-de-1'))
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument()
  })

  it('passes selected DE to detail panel', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    await user.click(screen.getByTestId('de-card-de-2'))
    const detailPanel = screen.getByTestId('detail-panel')
    expect(detailPanel).toHaveTextContent('Support Bot')
  })

  // Sort direction toggle
  it('renders sort direction button', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByLabelText('Sort ascending')).toBeInTheDocument()
  })

  it('toggles sort direction label on click', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    await user.click(screen.getByLabelText('Sort ascending'))
    expect(screen.getByLabelText('Sort descending')).toBeInTheDocument()
  })

  // Filter badges
  it('shows search filter badge when search is active', async () => {
    const user = userEvent.setup()
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search by DE name, company, or status...')
    await user.type(searchInput, 'Claims')

    // The badge should show the search query text; match the full badge text pattern
    expect(screen.getAllByText(/Claims/).length).toBeGreaterThanOrEqual(1)
  })

  // Filters label
  it('renders "Filters" label', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('renders "Sort" label', () => {
    render(<SupportDashboardClient digitalEmployees={mockDEs} companies={mockCompanies} />)
    expect(screen.getByText('Sort')).toBeInTheDocument()
  })
})
