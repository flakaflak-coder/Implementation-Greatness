import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DEDetailPanel } from './de-detail-panel'
import type { SupportDE } from './types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock the Sheet UI components to render in-place without portals
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="sheet-description">{children}</p>
  ),
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

describe('DEDetailPanel', () => {
  const defaultOnClose = vi.fn()

  // Null / closed states
  it('returns null when de is null', () => {
    const { container } = render(
      <DEDetailPanel de={null} open={true} onClose={defaultOnClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('does not render sheet content when open is false', () => {
    render(<DEDetailPanel de={createMockDE()} open={false} onClose={defaultOnClose} />)
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
  })

  // Basic rendering
  it('renders the DE name in the sheet title', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  it('renders the company name in the sheet description', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
  })

  // Health score display
  it('displays the health score value', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 85 })} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('displays "Health Score" label', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Health Score')).toBeInTheDocument()
  })

  // Health status messages
  it('shows healthy message for score >= 80', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 92 })} open={true} onClose={defaultOnClose} />)
    expect(
      screen.getByText('This Digital Employee is performing well. No immediate concerns.')
    ).toBeInTheDocument()
  })

  it('shows attention message for score 60-79', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 65 })} open={true} onClose={defaultOnClose} />)
    expect(
      screen.getByText('Some metrics need attention. Monitor closely.')
    ).toBeInTheDocument()
  })

  it('shows critical message for score < 60', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 45 })} open={true} onClose={defaultOnClose} />)
    expect(
      screen.getByText('Immediate action required. Multiple issues detected.')
    ).toBeInTheDocument()
  })

  // Health score ring label
  it('shows "Healthy" label inside score ring for healthy scores', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 92 })} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('shows "Attention" label inside score ring for attention scores', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 70 })} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Attention')).toBeInTheDocument()
  })

  it('shows "Critical" label inside score ring for critical scores', () => {
    render(<DEDetailPanel de={createMockDE({ healthScore: 30 })} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  // Tracker status indicators
  it('shows "Currently blocked" when tracker status is BLOCKED', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ trackerStatus: 'BLOCKED' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Currently blocked')).toBeInTheDocument()
  })

  it('shows "Flagged for attention" when tracker status is ATTENTION', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ trackerStatus: 'ATTENTION' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Flagged for attention')).toBeInTheDocument()
  })

  it('does not show tracker messages when tracker status is ON_TRACK', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ trackerStatus: 'ON_TRACK' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.queryByText('Currently blocked')).not.toBeInTheDocument()
    expect(screen.queryByText('Flagged for attention')).not.toBeInTheDocument()
  })

  // Blocker section
  it('displays blocker text when blocker is present', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ blocker: 'Waiting for API credentials' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Active Blocker')).toBeInTheDocument()
    expect(screen.getByText('Waiting for API credentials')).toBeInTheDocument()
  })

  it('does not display blocker section when blocker is null', () => {
    render(
      <DEDetailPanel de={createMockDE({ blocker: null })} open={true} onClose={defaultOnClose} />
    )
    expect(screen.queryByText('Active Blocker')).not.toBeInTheDocument()
  })

  // Detail rows
  it('displays the current phase formatted', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ currentJourneyPhase: 'DESIGN_WEEK' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Design Week')).toBeInTheDocument()
  })

  it('displays the status', () => {
    render(
      <DEDetailPanel de={createMockDE({ status: 'LIVE' })} open={true} onClose={defaultOnClose} />
    )
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('displays "Current Phase" label', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Current Phase')).toBeInTheDocument()
  })

  it('displays "Status" label', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('displays "Last Updated" label', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })

  // Channels
  it('displays channels joined by comma', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ channels: ['EMAIL', 'WEBCHAT'] })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('EMAIL, WEBCHAT')).toBeInTheDocument()
  })

  it('displays "None configured" when channels is empty', () => {
    render(
      <DEDetailPanel de={createMockDE({ channels: [] })} open={true} onClose={defaultOnClose} />
    )
    expect(screen.getByText('None configured')).toBeInTheDocument()
  })

  // Go-live date
  it('displays formatted go-live date when provided', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ goLiveDate: '2024-06-15' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Go-Live Date')).toBeInTheDocument()
    expect(screen.getByText('15 June 2024')).toBeInTheDocument()
  })

  it('does not display go-live date section when goLiveDate is null', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ goLiveDate: null })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.queryByText('Go-Live Date')).not.toBeInTheDocument()
  })

  // Configuration stats
  it('displays scope item count', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ scopeItemCount: 15 })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Scope Items')).toBeInTheDocument()
  })

  it('displays integration count', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ integrationCount: 4 })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('displays scenario count', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ scenarioCount: 10 })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Scenarios')).toBeInTheDocument()
  })

  it('displays escalation rule count', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ escalationRuleCount: 7 })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Escalation Rules')).toBeInTheDocument()
  })

  // Risk assessment
  it('displays risk level', () => {
    render(
      <DEDetailPanel de={createMockDE({ riskLevel: 'LOW' })} open={true} onClose={defaultOnClose} />
    )
    expect(screen.getByText('LOW')).toBeInTheDocument()
    expect(screen.getByText('Risk Level')).toBeInTheDocument()
  })

  it('displays MEDIUM risk level', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ riskLevel: 'MEDIUM' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('displays HIGH risk level', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ riskLevel: 'HIGH' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('displays tracker status with underscore replaced by space', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ trackerStatus: 'ON_TRACK' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('ON TRACK')).toBeInTheDocument()
    expect(screen.getByText('Tracker Status')).toBeInTheDocument()
  })

  // Description
  it('displays description when provided', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ description: 'Handles insurance claims intake' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Handles insurance claims intake')).toBeInTheDocument()
  })

  it('does not display description section when description is null', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ description: null })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  // Action links
  it('renders "Open Full Workspace" link with correct href', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ id: 'de-1', companyId: 'company-1' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('Open Full Workspace')).toBeInTheDocument()
    const workspaceLink = screen.getByText('Open Full Workspace').closest('a')
    expect(workspaceLink).toHaveAttribute(
      'href',
      '/companies/company-1/digital-employees/de-1'
    )
  })

  it('renders "View Company" link with correct href', () => {
    render(
      <DEDetailPanel
        de={createMockDE({ companyId: 'company-1' })}
        open={true}
        onClose={defaultOnClose}
      />
    )
    expect(screen.getByText('View Company')).toBeInTheDocument()
    const companyLink = screen.getByText('View Company').closest('a')
    expect(companyLink).toHaveAttribute('href', '/companies/company-1')
  })

  // Section headers
  it('renders "Details" section header', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  it('renders "Configuration Stats" section header', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Configuration Stats')).toBeInTheDocument()
  })

  it('renders "Risk Assessment" section header', () => {
    render(<DEDetailPanel de={createMockDE()} open={true} onClose={defaultOnClose} />)
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
  })
})
