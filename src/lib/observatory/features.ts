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
    healthStatus: 'healthy',
    notes: 'Currently uses mock data',
  },
  {
    id: 'companies-list',
    name: 'Companies List',
    description: 'View and manage all companies',
    status: 'built',
    category: 'core',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
    notes: 'Currently uses mock data',
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
    notes: 'File storage working, processing simulated',
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
    healthStatus: 'healthy',
    notes: 'UI complete, needs API wiring',
  },
  {
    id: 'design-week-detail',
    name: 'Design Week Detail Page',
    description: 'Full view of a Design Week with all extracted items',
    status: 'planned',
    category: 'design-week',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
  },

  // Extraction Features
  {
    id: 'gemini-extraction',
    name: 'Gemini AI Extraction',
    description: 'Extract scope, scenarios, KPIs from recordings using Gemini',
    status: 'built',
    category: 'extraction',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
    notes: 'Code complete, not tested with real recordings',
  },
  {
    id: 'evidence-viewer',
    name: 'Evidence Viewer',
    description: 'View evidence with timestamps linked to recordings',
    status: 'in_progress',
    category: 'extraction',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
  },

  // Support Features
  {
    id: 'support-dashboard',
    name: 'Support Dashboard',
    description: 'Quick access to scope and runbooks for support agents',
    status: 'built',
    category: 'support',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
    notes: 'Currently uses mock data',
  },
  {
    id: 'scope-search',
    name: 'Scope Search',
    description: 'Search scope items across all Digital Employees',
    status: 'built',
    category: 'support',
    dateAdded: '2026-01-27',
    healthStatus: 'healthy',
    notes: 'Currently uses mock data',
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
    status: 'in_progress',
    category: 'admin',
    dateAdded: '2026-01-27',
    healthStatus: 'unknown',
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
