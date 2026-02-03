// DE Workspace - Digital Employee Profile Builder
export { DEWorkspace } from './de-workspace'
export type { DEWorkspaceProps, WorkspaceTab } from './types'

// Types
export type {
  BusinessProfileSection,
  TechnicalProfileSection,
  ProfileSection,
  ExtractedItemWithSession,
  GroupedProfileItems,
  ProfileCompleteness,
  SectionCompleteness,
  TestCase,
  TestCaseType,
  TestPlanSummary,
} from './types'

// Utilities
export {
  groupItemsByProfile,
  calculateProfileCompleteness,
  calculateSectionCompleteness,
  generateTestCases,
  getProfileCoveredTypes,
  BUSINESS_PROFILE_MAPPING,
  TECHNICAL_PROFILE_MAPPING,
  BUSINESS_SECTION_METADATA,
  TECHNICAL_SECTION_METADATA,
} from './types'

// Shared components
export { CompletenessBadge, CircularProgress } from './shared/completeness-badge'
export { EvidenceLink, EvidenceIndicator } from './shared/evidence-link'
export { GenerateDocButton } from './shared/generate-doc-button'
export { InlineEntryForm } from './shared/inline-entry-form'

// Profile section components
export { ProfileSection as ProfileSectionCard, EmptySection } from './profile-sections/profile-section'
export { ProfileField, ProfileFieldCompact } from './profile-sections/profile-field'

// Tab components
export { ProgressTab } from './tabs/progress-tab'
export { BusinessProfileTabV2 as BusinessProfileTab } from './tabs/business-profile-tab-v2'
export { TechnicalProfileTabV2 as TechnicalProfileTab } from './tabs/technical-profile-tab-v2'
export { TestPlanTabV2 as TestPlanTab } from './tabs/test-plan-tab-v2'

// Test plan components
export { TestCaseCard } from './test-plan/test-case-card'
export { TestGroup } from './test-plan/test-group'
export { TestCaseEditDialog } from './test-plan/test-case-edit-dialog'
