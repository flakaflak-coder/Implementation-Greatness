import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptManager } from './prompt-manager'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Kickoff Extraction',
    type: 'EXTRACT_KICKOFF',
    description: 'Extracts kickoff session data',
    prompt: 'You are an AI assistant extracting kickoff data...',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.3,
    maxTokens: 4096,
    version: 2,
    isActive: true,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-10T00:00:00Z',
  },
  {
    id: 'tpl-2',
    name: 'Process Extraction',
    type: 'EXTRACT_PROCESS',
    description: 'Extracts process design data',
    prompt: 'You are an AI assistant extracting process data...',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.2,
    maxTokens: 8192,
    version: 1,
    isActive: true,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'tpl-3',
    name: 'DE Design Generation',
    type: 'GENERATE_DE_DESIGN',
    description: 'Generates DE Design document',
    prompt: 'Generate a comprehensive DE Design document...',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.5,
    maxTokens: 16384,
    version: 3,
    isActive: true,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-15T00:00:00Z',
  },
]

describe('PromptManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeletons while fetching templates', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<PromptManager />)
    // SkeletonCard renders rounded-xl border elements
    const skeletons = document.querySelectorAll('.animate-fade-in-up')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty template lists when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<PromptManager />)

    // When fetch fails, templates array stays empty, so empty state messages appear
    await waitFor(() => {
      expect(screen.getByText('No extraction prompts configured yet.')).toBeInTheDocument()
    })
  })

  it('renders tabs for Extraction, Generation, and System', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /extraction/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /generation/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument()
    })
  })

  it('shows extraction prompts on the Extraction tab', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Session Extraction Prompts')).toBeInTheDocument()
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
      expect(screen.getByText('Process Extraction')).toBeInTheDocument()
    })
  })

  it('shows version badge for templates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument()
      expect(screen.getByText('v1')).toBeInTheDocument()
    })
  })

  it('shows generation prompts on the Generation tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /generation/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /generation/i }))

    await waitFor(() => {
      expect(screen.getByText('Document Generation Prompts')).toBeInTheDocument()
      expect(screen.getByText('DE Design Generation')).toBeInTheDocument()
    })
  })

  it('shows empty state when no extraction prompts exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[2]] }), // Only generation
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('No extraction prompts configured yet.')).toBeInTheDocument()
    })
  })

  it('shows empty state when no generation prompts exist', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[0]] }), // Only extraction
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /generation/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /generation/i }))

    await waitFor(() => {
      expect(screen.getByText('No generation prompts configured yet.')).toBeInTheDocument()
    })
  })

  it('shows system prompts on the System tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /system/i }))

    await waitFor(() => {
      expect(screen.getByText('System Prompts (Hardcoded)')).toBeInTheDocument()
      expect(screen.getByText('Gemini Multimodal Extraction')).toBeInTheDocument()
      expect(screen.getByText('Kickoff Session Extraction')).toBeInTheDocument()
      expect(screen.getByText('Process Design Extraction')).toBeInTheDocument()
      expect(screen.getByText('Skills & Guardrails Extraction')).toBeInTheDocument()
      expect(screen.getByText('Technical Session Extraction')).toBeInTheDocument()
      expect(screen.getByText('Sign-off Session Extraction')).toBeInTheDocument()
    })
  })

  it('shows avatar generation prompt on System tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /system/i }))

    await waitFor(() => {
      expect(screen.getByText('Avatar Generation')).toBeInTheDocument()
      expect(screen.getByText('DE Avatar Generation')).toBeInTheDocument()
    })
  })

  it('shows PDF generation info on System tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /system/i }))

    await waitFor(() => {
      // "PDF Document Generation" appears as both a section heading and card title
      const pdfElements = screen.getAllByText('PDF Document Generation')
      expect(pdfElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows read-only explanation on System tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /system/i }))

    await waitFor(() => {
      expect(screen.getByText('Why are these read-only?')).toBeInTheDocument()
    })
  })

  it('shows prompt versioning info card', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Prompt Versioning')).toBeInTheDocument()
    })
  })

  it('shows model badge for templates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      const modelBadges = screen.getAllByText('claude-sonnet-4-5-20250929')
      expect(modelBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows the current prompt text and temperature for a template', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    // Click to expand the collapsible
    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByText('Current Prompt')).toBeInTheDocument()
      expect(screen.getByText('Temperature: 0.3')).toBeInTheDocument()
      expect(screen.getByText('Max Tokens: 4096')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })
  })

  it('enters edit mode when Edit Prompt is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    // Expand the collapsible
    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit prompt/i }))

    await waitFor(() => {
      // Edit mode should show textarea, Save New Version, and Cancel buttons
      expect(screen.getByLabelText('Prompt')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save new version/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('exits edit mode when Cancel is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit prompt/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save new version/i })).not.toBeInTheDocument()
    })
  })

  it('saves prompt and refreshes templates on success', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ templates: [{ ...mockTemplates[0], version: 3 }] }),
      })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit prompt/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Prompt')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save new version/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/prompts/tpl-1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  it('shows error message when save fails', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
      })
      .mockResolvedValueOnce({
        ok: false,
      })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit prompt/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save new version/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save new version/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to save prompt')).toBeInTheDocument()
    })
  })

  it('shows temperature and max tokens controls in edit mode', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: [mockTemplates[0]] }),
    })

    render(<PromptManager />)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Extraction')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Kickoff Extraction'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit prompt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit prompt/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument()
      expect(screen.getByText(/lower = more consistent/i)).toBeInTheDocument()
    })
  })
})
