// Central feature registry for the Onboarding Command Center
// This tracks all features, their status, and health

export type FeatureStatus = 'built' | 'in_progress' | 'planned' | 'deprecated'
export type HealthStatus = 'healthy' | 'degraded' | 'broken' | 'unknown'

export interface Feature {
  id: string
  name: string
  description: string
  status: FeatureStatus
  category: 'core' | 'design-week' | 'extraction' | 'support' | 'admin'
  owner?: string
  dateAdded: string
  dateCompleted?: string
  healthStatus: HealthStatus
  dependencies?: string[]
  notes?: string
}

// Feature registry - update this as features are added/completed
export const FEATURES: Feature[] = [
  // Core Features
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard showing active Design Weeks and companies',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-27',
    healthStatus: 'degraded',
    notes: 'UI complete but uses mock data - needs database connection to show real data',
  },
  {
    id: 'companies-list',
    name: 'Companies List',
    description: 'View and manage all companies',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-27',
    healthStatus: 'degraded',
    notes: 'UI complete but uses mock data - needs database connection to show real data',
  },
  {
    id: 'companies-crud',
    name: 'Companies CRUD API',
    description: 'Create, read, update, delete companies via API',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
  },
  {
    id: 'digital-employees-crud',
    name: 'Digital Employees CRUD API',
    description: 'Create, read, update, delete digital employees via API',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
  },
  {
    id: 'health-check',
    name: 'Health Check',
    description: 'API endpoint for monitoring database connectivity',
    status: 'built',
    category: 'admin',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
  },

  // Design Week Features
  {
    id: 'session-upload',
    name: 'Session Upload',
    description: 'Upload recordings and documents from Design Week sessions',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
    notes: 'File storage working. Triggers extraction pipeline. Supports PDF, audio, video, transcripts.',
  },
  {
    id: 'design-week-progress',
    name: 'Design Week Progress',
    description: 'Visual progress indicator for Design Week phases',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
  },
  {
    id: 'scope-guardian',
    name: 'Scope Guardian',
    description: 'Manage and resolve scope items with evidence',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-27',
    healthStatus: 'degraded',
    notes: 'UI complete but API wiring incomplete - scope changes not persisted',
  },
  {
    id: 'design-week-detail',
    name: 'Design Week Detail Page',
    description: 'Full view of a Design Week with all extracted items',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-27',
    dateCompleted: '2026-01-30',
    healthStatus: 'healthy',
    notes: 'DE Workspace with tabs: Progress, Sessions, Scope, Technical Profile, Test Plan',
  },

  // Extraction Features
  {
    id: 'extraction-pipeline',
    name: 'Extraction Pipeline',
    description: '4-stage pipeline: Classification → General Extraction → Specialized Extraction → Tab Population',
    status: 'built',
    category: 'extraction',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'unknown',
    notes: 'Full orchestrator built with 6 extraction modes. Needs production testing with real uploads.',
  },
  {
    id: 'gemini-extraction',
    name: 'Gemini AI Extraction',
    description: 'Extract scope, scenarios, KPIs from recordings using Gemini',
    status: 'built',
    category: 'extraction',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
    notes: 'Code complete. Supports audio/video processing. Needs testing with real session recordings.',
  },
  {
    id: 'claude-extraction',
    name: 'Claude AI Extraction',
    description: 'Extract entities from transcripts and documents using Claude',
    status: 'built',
    category: 'extraction',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
    notes: 'Code complete. Primary extraction for text content. Needs production testing.',
  },
  {
    id: 'evidence-viewer',
    name: 'Evidence Viewer',
    description: 'View evidence with timestamps linked to recordings',
    status: 'in_progress',
    category: 'extraction',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
    notes: 'Partially built. Needs timestamp linking and playback integration.',
  },

  // Support Features
  {
    id: 'support-dashboard',
    name: 'Support Dashboard',
    description: 'Quick access to scope and runbooks for support agents',
    status: 'built',
    category: 'support',
    dateAdded: '2026-01-27',
    healthStatus: 'degraded',
    notes: 'UI complete but uses mock data - needs database connection for real DE data',
  },
  {
    id: 'scope-search',
    name: 'Scope Search',
    description: 'Search scope items across all Digital Employees',
    status: 'built',
    category: 'support',
    dateAdded: '2026-01-27',
    healthStatus: 'degraded',
    notes: 'UI complete but uses mock data - needs database connection for real search',
  },
  {
    id: 'runbook-viewer',
    name: 'Runbook Viewer',
    description: 'View generated runbooks for live Digital Employees',
    status: 'planned',
    category: 'support',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
  },

  // Admin Features
  {
    id: 'observatory',
    name: 'Observatory',
    description: 'Application monitoring and feature tracking dashboard',
    status: 'built',
    category: 'admin',
    dateAdded: '2026-01-27',
    dateCompleted: '2026-01-28',
    healthStatus: 'healthy',
    notes: 'Feature inventory, health status, progress tracking',
  },

  // Document Generation Features
  {
    id: 'pdf-export-llm',
    name: 'LLM-Enhanced PDF Export',
    description: 'Generate polished DE Design Documents using Claude with professional formatting',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    notes: 'Multi-language support (en, nl, de, fr, es), includes Executive One-Pager, Training Plan, Quick Reference',
  },
  {
    id: 'meet-your-de',
    name: 'Meet Your Digital Employee Document',
    description: 'Personable one-page introduction where the DE introduces itself as a colleague',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    notes: 'First-person tone, includes AI-generated avatar via Gemini Imagen 4',
  },
  {
    id: 'avatar-generation',
    name: 'DE Avatar Generation',
    description: 'Generate professional avatars for Digital Employees using Gemini Imagen 4',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    dependencies: ['meet-your-de'],
  },

  // Prerequisites & Lifecycle Features
  {
    id: 'prerequisites-tracking',
    name: 'Prerequisites Tracking',
    description: 'Track prerequisites needed before Configuration phase (API keys, access, approvals)',
    status: 'built',
    category: 'design-week',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    notes: 'Database model, API, UI in Technical tab, and summary on Progress tab',
  },
  {
    id: 'prerequisites-gate',
    name: 'Prerequisites Gate',
    description: 'Block Configuration phase until all prerequisites are received',
    status: 'planned',
    category: 'design-week',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    dependencies: ['prerequisites-tracking'],
  },

  // Portfolio & Timeline Features (Priya)
  {
    id: 'portfolio-gantt',
    name: 'Portfolio Gantt Chart',
    description: 'Timeline view of all DE implementations with progress and deadline tracking',
    status: 'built',
    category: 'admin',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    owner: 'Priya',
    notes: 'Company hierarchy, filter by lead/status/company, prerequisites status, lifecycle stages',
  },
  {
    id: 'configuration-phase-tracking',
    name: 'Configuration Phase Tracking',
    description: 'Separate entity for Configuration phase with sprints and milestones',
    status: 'planned',
    category: 'core',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    notes: 'Separate from Design Week - tracks configuration, deployments, integration status',
  },
  {
    id: 'uat-phase-tracking',
    name: 'UAT Phase Tracking',
    description: 'Track UAT test cycles, results, and sign-off',
    status: 'planned',
    category: 'core',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    dependencies: ['configuration-phase-tracking'],
  },
  {
    id: 'deadline-prediction',
    name: 'Deadline Prediction',
    description: 'Predict if DE will hit go-live date based on velocity and blockers',
    status: 'planned',
    category: 'admin',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    dependencies: ['portfolio-gantt', 'prerequisites-tracking'],
  },

  // View Templates (Priya)
  {
    id: 'at-risk-view',
    name: 'At Risk Overview',
    description: 'Filtered view showing only DEs at risk or blocked',
    status: 'planned',
    category: 'admin',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    owner: 'Priya',
    dependencies: ['portfolio-gantt'],
  },
  {
    id: 'capacity-planning',
    name: 'Capacity Planning View',
    description: 'Resource load per week across implementation leads',
    status: 'planned',
    category: 'admin',
    dateAdded: '2026-01-31',
    healthStatus: 'unknown',
    owner: 'Priya',
    dependencies: ['portfolio-gantt'],
  },

  // Navigation & Search Features
  {
    id: 'command-palette',
    name: 'Command Palette',
    description: 'Global search and quick navigation via ⌘K',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    notes: 'Search companies, DEs, sessions, scope items. Quick actions.',
  },
  {
    id: 'global-search-api',
    name: 'Global Search API',
    description: 'API endpoint for searching across all entities',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-31',
    dateCompleted: '2026-01-31',
    healthStatus: 'healthy',
    dependencies: ['command-palette'],
  },

  // Prompt Management Features
  {
    id: 'prompt-management',
    name: 'Prompt Management',
    description: 'Edit and version AI prompts via Settings page',
    status: 'built',
    category: 'admin',
    dateAdded: '2026-01-28',
    dateCompleted: '2026-01-28',
    healthStatus: 'healthy',
    notes: 'Only Claude prompts editable. Gemini and PDF generation prompts are hardcoded.',
  },
]

// Helper functions
export function getFeatureById(id: string): Feature | undefined {
  return FEATURES.find(f => f.id === id)
}

export function getFeaturesByStatus(status: FeatureStatus): Feature[] {
  return FEATURES.filter(f => f.status === status)
}

export function getFeaturesByCategory(category: Feature['category']): Feature[] {
  return FEATURES.filter(f => f.category === category)
}

export function getFeatureSummary() {
  return {
    total: FEATURES.length,
    built: FEATURES.filter(f => f.status === 'built').length,
    inProgress: FEATURES.filter(f => f.status === 'in_progress').length,
    planned: FEATURES.filter(f => f.status === 'planned').length,
    deprecated: FEATURES.filter(f => f.status === 'deprecated').length,
    healthy: FEATURES.filter(f => f.healthStatus === 'healthy').length,
    degraded: FEATURES.filter(f => f.healthStatus === 'degraded').length,
    broken: FEATURES.filter(f => f.healthStatus === 'broken').length,
  }
}
