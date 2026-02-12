'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Plug,
  Database,
  Globe,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  X,
  FileCode,
  Server,
  BarChart3,
  Activity,
} from 'lucide-react'
import { TagList } from '../profile-fields'
import { ProfileCompleteness } from '../profile-completeness'
import { ProfileEmptyState } from '../profile-empty-state'
import { SkeletonSection } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  TechnicalProfile,
  Integration,
  DataField,
  APIEndpoint,
  SecurityRequirement,
  TechnicalContact,
  MonitoringMetric,
  createEmptyTechnicalProfile,
  TECHNICAL_SECTION_CONFIG,
  IntegrationType,
  AuthMethod,
  IntegrationStatus,
} from '../profile-types'
import { PrerequisitesSection } from '../prerequisites/prerequisites-section'

interface TechnicalProfileTabV2Props {
  designWeekId: string
  className?: string
}

// Section colors - left accent border style
const sectionColors: Record<string, string> = {
  violet: 'border-l-2 border-[#C2703E] pl-4',
  blue: 'border-l-2 border-blue-400 pl-4',
  cyan: 'border-l-2 border-cyan-400 pl-4',
  rose: 'border-l-2 border-rose-400 pl-4',
  emerald: 'border-l-2 border-emerald-400 pl-4',
  orange: 'border-l-2 border-orange-400 pl-4',
}

const iconColors: Record<string, string> = {
  violet: 'text-stone-500',
  blue: 'text-stone-500',
  cyan: 'text-stone-500',
  rose: 'text-stone-500',
  emerald: 'text-stone-500',
  orange: 'text-stone-500',
}

// Section icons
const SectionIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    Plug: <Plug className={className} />,
    Database: <Database className={className} />,
    Globe: <Globe className={className} />,
    ShieldCheck: <ShieldCheck className={className} />,
    Users: <Users className={className} />,
    BarChart3: <BarChart3 className={className} />,
  }
  return icons[name] || null
}

export function TechnicalProfileTabV2({ designWeekId, className }: TechnicalProfileTabV2Props) {
  const [profile, setProfile] = useState<TechnicalProfile>(createEmptyTechnicalProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['integrations', 'dataFields', 'apiEndpoints', 'securityRequirements', 'technicalContacts', 'monitoringMetrics'])
  )

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/technical-profile`)
        if (!response.ok) {
          throw new Error('Failed to load technical profile')
        }
        const data = await response.json()
        if (data.profile) {
          setProfile(data.profile)
        }
      } catch (err) {
        console.error('Error loading technical profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [designWeekId])

  // Save profile changes
  const saveProfile = useCallback(
    async (updatedProfile: TechnicalProfile) => {
      try {
        setSaving(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/technical-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: updatedProfile }),
        })
        if (!response.ok) {
          throw new Error('Failed to save profile')
        }
      } catch (err) {
        console.error('Error saving profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      } finally {
        setSaving(false)
      }
    },
    [designWeekId]
  )

  // Update helpers with auto-save
  const updateProfile = useCallback(
    (updater: (prev: TechnicalProfile) => TechnicalProfile) => {
      setProfile((prev) => {
        const updated = updater(prev)
        saveProfile(updated)
        return updated
      })
    },
    [saveProfile]
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonSection key={i} className={cn('animate-fade-in-up', `stagger-${i + 1}`)} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    )
  }

  const handleSectionClick = (sectionKey: string) => {
    const el = document.getElementById(`section-${sectionKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (!expandedSections.has(sectionKey)) {
        toggleSection(sectionKey)
      }
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-lg z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {/* Profile completeness overview */}
      <ProfileCompleteness
        profile={profile}
        type="technical"
        onSectionClick={handleSectionClick}
      />

      {/* Info banner */}
      <div className="p-4 bg-[#FDF3EC] border border-[#E8D5C4] rounded-lg">
        <p className="text-sm text-[#A05A32]">
          <strong>Technical Profile</strong> captures all system integrations, data requirements, and security specifications needed for the Digital Employee implementation.
        </p>
      </div>

      {/* Prerequisites Section - Gate to Configuration Phase */}
      <PrerequisitesSection designWeekId={designWeekId} />

      {/* Integrations Section */}
      <TechnicalSection
        sectionKey="integrations"
        config={TECHNICAL_SECTION_CONFIG.integrations}
        expanded={expandedSections.has('integrations')}
        onToggle={() => toggleSection('integrations')}
      >
        <IntegrationsList
          integrations={profile.integrations}
          onUpdate={(integrations) => updateProfile((p) => ({ ...p, integrations }))}
        />
      </TechnicalSection>

      {/* Data Fields Section */}
      <TechnicalSection
        sectionKey="dataFields"
        config={TECHNICAL_SECTION_CONFIG.dataFields}
        expanded={expandedSections.has('dataFields')}
        onToggle={() => toggleSection('dataFields')}
      >
        <DataFieldsList
          dataFields={profile.dataFields}
          onUpdate={(dataFields) => updateProfile((p) => ({ ...p, dataFields }))}
        />
      </TechnicalSection>

      {/* API Endpoints Section */}
      <TechnicalSection
        sectionKey="apiEndpoints"
        config={TECHNICAL_SECTION_CONFIG.apiEndpoints}
        expanded={expandedSections.has('apiEndpoints')}
        onToggle={() => toggleSection('apiEndpoints')}
      >
        <APIEndpointsList
          endpoints={profile.apiEndpoints}
          onUpdate={(apiEndpoints) => updateProfile((p) => ({ ...p, apiEndpoints }))}
        />
      </TechnicalSection>

      {/* Security Requirements Section */}
      <TechnicalSection
        sectionKey="securityRequirements"
        config={TECHNICAL_SECTION_CONFIG.securityRequirements}
        expanded={expandedSections.has('securityRequirements')}
        onToggle={() => toggleSection('securityRequirements')}
      >
        <SecurityRequirementsList
          requirements={profile.securityRequirements}
          onUpdate={(securityRequirements) => updateProfile((p) => ({ ...p, securityRequirements }))}
        />
      </TechnicalSection>

      {/* Technical Contacts Section */}
      <TechnicalSection
        sectionKey="technicalContacts"
        config={TECHNICAL_SECTION_CONFIG.technicalContacts}
        expanded={expandedSections.has('technicalContacts')}
        onToggle={() => toggleSection('technicalContacts')}
      >
        <TechnicalContactsList
          contacts={profile.technicalContacts}
          onUpdate={(technicalContacts) => updateProfile((p) => ({ ...p, technicalContacts }))}
        />
      </TechnicalSection>

      {/* Monitoring Metrics Section */}
      <TechnicalSection
        sectionKey="monitoringMetrics"
        config={TECHNICAL_SECTION_CONFIG.monitoringMetrics}
        expanded={expandedSections.has('monitoringMetrics')}
        onToggle={() => toggleSection('monitoringMetrics')}
      >
        <MonitoringMetricsList
          metrics={profile.monitoringMetrics || []}
          onUpdate={(monitoringMetrics) => updateProfile((p) => ({ ...p, monitoringMetrics }))}
        />
      </TechnicalSection>

      {/* Notes Section */}
      <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
        <h4 className="text-base font-semibold tracking-tight text-stone-900 mb-3">Technical Notes</h4>
        <TagList
          tags={profile.notes}
          onChange={(notes) => updateProfile((p) => ({ ...p, notes }))}
          placeholder="Add technical note..."
        />
      </div>
    </div>
  )
}

// ============================================
// Technical Section wrapper
// ============================================
interface TechnicalSectionProps {
  sectionKey: string
  config: (typeof TECHNICAL_SECTION_CONFIG)[keyof typeof TECHNICAL_SECTION_CONFIG]
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function TechnicalSection({ sectionKey, config, expanded, onToggle, children }: TechnicalSectionProps) {
  const colorClass = sectionColors[config.color] || sectionColors.violet
  const iconColor = iconColors[config.color] || iconColors.violet

  return (
    <div
      id={`section-${sectionKey}`}
      className={cn(
        'rounded-lg overflow-hidden transition-all duration-200',
        colorClass,
        expanded ? 'shadow-sm' : 'hover:shadow-sm',
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3 pr-4 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className={iconColor}>
          <SectionIcon name={config.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold tracking-tight text-stone-900">{config.title}</h3>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">{config.description}</p>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-stone-400 transition-transform duration-200',
          !expanded && '-rotate-90'
        )} />
      </button>
      {expanded && (
        <div className="pb-4 pt-2 pr-4 border-t border-stone-100 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// Integrations List
// ============================================
interface IntegrationsListProps {
  integrations: Integration[]
  onUpdate: (integrations: Integration[]) => void
}

const integrationTypeLabels: Record<IntegrationType, string> = {
  api: 'API',
  database: 'Database',
  webhook: 'Webhook',
  file: 'File',
  other: 'Other',
}

const authMethodLabels: Record<AuthMethod, string> = {
  oauth: 'OAuth 2.0',
  api_key: 'API Key',
  basic: 'Basic Auth',
  certificate: 'Certificate',
  none: 'None',
}

const statusLabels: Record<IntegrationStatus, { label: string; color: string }> = {
  identified: { label: 'Identified', color: 'bg-stone-100 text-stone-700' },
  spec_complete: { label: 'Spec Complete', color: 'bg-blue-100 text-blue-700' },
  credentials_received: { label: 'Credentials Received', color: 'bg-amber-100 text-amber-700' },
  tested: { label: 'Tested', color: 'bg-cyan-100 text-cyan-700' },
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700' },
}

function IntegrationsList({ integrations, onUpdate }: IntegrationsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState('')
  const [newType, setNewType] = useState<IntegrationType>('api')
  const [newAuth, setNewAuth] = useState<AuthMethod>('api_key')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...integrations,
        {
          id: `integration-${Date.now()}`,
          systemName: newName.trim(),
          purpose: newPurpose.trim(),
          type: newType,
          authMethod: newAuth,
          fieldsRead: [],
          fieldsWrite: [],
          status: 'identified',
        },
      ])
      setNewName('')
      setNewPurpose('')
      setNewType('api')
      setNewAuth('api_key')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(integrations.filter((i) => i.id !== id))
  }

  const handleStatusChange = (id: string, status: IntegrationStatus) => {
    onUpdate(integrations.map((i) => (i.id === id ? { ...i, status } : i)))
  }

  return (
    <div className="space-y-3">
      {integrations.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={Plug}
          color="sienna"
          title="No integrations yet"
          description="Add systems this Digital Employee connects to"
          actionLabel="Add integration"
          onAction={() => setIsAdding(true)}
        />
      )}
      {integrations.map((integration, index) => (
        <div
          key={integration.id}
          className={cn(
            "p-4 bg-white rounded-lg border border-stone-200 group",
            "animate-fade-in-up",
            index < 6 && `stagger-${index + 1}`
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 text-stone-500 rounded-lg">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-stone-900">{integration.systemName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                    {integrationTypeLabels[integration.type]}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                    {authMethodLabels[integration.authMethod]}
                  </span>
                  <select
                    value={integration.status}
                    onChange={(e) => handleStatusChange(integration.id, e.target.value as IntegrationStatus)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border-0 cursor-pointer',
                      statusLabels[integration.status].color
                    )}
                  >
                    {Object.entries(statusLabels).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRemove(integration.id)}
              className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {integration.purpose && (
            <p className="mt-2 text-sm text-stone-600">{integration.purpose}</p>
          )}
          {(integration.fieldsRead.length > 0 || integration.fieldsWrite.length > 0) && (
            <div className="mt-2 flex gap-4 text-xs">
              {integration.fieldsRead.length > 0 && (
                <span className="text-stone-500">
                  Read: {integration.fieldsRead.join(', ')}
                </span>
              )}
              {integration.fieldsWrite.length > 0 && (
                <span className="text-stone-500">
                  Write: {integration.fieldsWrite.join(', ')}
                </span>
              )}
            </div>
          )}
          {(integration.fallbackBehavior || integration.retryStrategy || integration.dataFreshness) && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {integration.fallbackBehavior && (
                <div className="p-2 bg-amber-50 rounded border border-amber-100">
                  <span className="font-medium text-amber-700">Fallback:</span>{' '}
                  <span className="text-amber-600">{integration.fallbackBehavior}</span>
                </div>
              )}
              {integration.retryStrategy && (
                <div className="p-2 bg-blue-50 rounded border border-blue-100">
                  <span className="font-medium text-blue-700">Retry:</span>{' '}
                  <span className="text-blue-600">{integration.retryStrategy}</span>
                </div>
              )}
              {integration.dataFreshness && (
                <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                  <span className="font-medium text-emerald-700">Freshness:</span>{' '}
                  <span className="text-emerald-600">{integration.dataFreshness}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {isAdding ? (
        <div className="p-4 bg-white rounded-lg border-2 border-stone-300 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="System name"
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as IntegrationType)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {Object.entries(integrationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
            placeholder="Purpose (what data/functionality does it provide?)"
            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex items-center gap-3">
            <select
              value={newAuth}
              onChange={(e) => setNewAuth(e.target.value as AuthMethod)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {Object.entries(authMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : integrations.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-[#E8D5C4]/60 hover:border-[#D4956A] hover:bg-[#FDF3EC]/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add integration
        </Button>
      ) : null}
    </div>
  )
}

// ============================================
// Data Fields List
// ============================================
interface DataFieldsListProps {
  dataFields: DataField[]
  onUpdate: (dataFields: DataField[]) => void
}

function DataFieldsList({ dataFields, onUpdate }: DataFieldsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newType, setNewType] = useState('string')
  const [newRequired, setNewRequired] = useState(false)

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...dataFields,
        {
          id: `field-${Date.now()}`,
          name: newName.trim(),
          source: newSource.trim(),
          type: newType,
          required: newRequired,
        },
      ])
      setNewName('')
      setNewSource('')
      setNewType('string')
      setNewRequired(false)
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(dataFields.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-2">
      {dataFields.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={Database}
          color="blue"
          title="No data fields yet"
          description="Define the data elements this DE needs to process"
          actionLabel="Add field"
          onAction={() => setIsAdding(true)}
        />
      )}
      {dataFields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2 px-3 font-medium text-stone-700">Field</th>
                <th className="text-left py-2 px-3 font-medium text-stone-700">Source</th>
                <th className="text-left py-2 px-3 font-medium text-stone-700">Type</th>
                <th className="text-left py-2 px-3 font-medium text-stone-700">Required</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {dataFields.map((field, index) => (
                <tr
                  key={field.id}
                  className={cn(
                    "border-b border-stone-100 group",
                    "animate-fade-in-up",
                    index < 6 && `stagger-${index + 1}`
                  )}
                >
                  <td className="py-2 px-3 font-medium text-stone-900">{field.name}</td>
                  <td className="py-2 px-3 text-stone-600">{field.source || '-'}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {field.type}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {field.required ? (
                      <span className="text-emerald-600">Yes</span>
                    ) : (
                      <span className="text-stone-400">No</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleRemove(field.id)}
                      className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Field name"
            className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Source"
            className="w-32 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-2 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="date">date</option>
            <option value="object">object</option>
            <option value="array">array</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="rounded border-stone-300"
            />
            Required
          </label>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : dataFields.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-blue-200/60 hover:border-blue-300 hover:bg-blue-50/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add data field
        </Button>
      ) : null}
    </div>
  )
}

// ============================================
// API Endpoints List
// ============================================
interface APIEndpointsListProps {
  endpoints: APIEndpoint[]
  onUpdate: (endpoints: APIEndpoint[]) => void
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-[#F5E6DA] text-[#A05A32]',
}

function APIEndpointsList({ endpoints, onUpdate }: APIEndpointsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMethod, setNewMethod] = useState<APIEndpoint['method']>('GET')
  const [newPath, setNewPath] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const handleAdd = () => {
    if (newName.trim() && newPath.trim()) {
      onUpdate([
        ...endpoints,
        {
          id: `endpoint-${Date.now()}`,
          name: newName.trim(),
          method: newMethod,
          path: newPath.trim(),
          description: newDesc.trim(),
        },
      ])
      setNewName('')
      setNewMethod('GET')
      setNewPath('')
      setNewDesc('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(endpoints.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-2">
      {endpoints.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={Globe}
          color="cyan"
          title="No API endpoints yet"
          description="Specify API endpoints for system integrations"
          actionLabel="Add endpoint"
          onAction={() => setIsAdding(true)}
        />
      )}
      {endpoints.map((endpoint, index) => (
        <div
          key={endpoint.id}
          className={cn(
            "flex items-start gap-3 p-3 bg-white rounded-lg border border-stone-200 group",
            "animate-fade-in-up",
            index < 6 && `stagger-${index + 1}`
          )}
        >
          <div className="p-2 bg-stone-100 text-stone-500 rounded-lg">
            <FileCode className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded font-mono', methodColors[endpoint.method])}>
                {endpoint.method}
              </span>
              <code className="text-sm text-stone-700 font-mono">{endpoint.path}</code>
            </div>
            <p className="font-medium text-stone-900 mt-1">{endpoint.name}</p>
            {endpoint.description && (
              <p className="text-sm text-stone-500 mt-0.5">{endpoint.description}</p>
            )}
          </div>
          <button
            onClick={() => handleRemove(endpoint.id)}
            className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {isAdding ? (
        <div className="p-4 bg-white rounded-lg border-2 border-stone-300 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value as APIEndpoint['method'])}
              className="px-2 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/api/v1/endpoint"
              className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
            />
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Endpoint name"
            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : endpoints.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-cyan-200/60 hover:border-cyan-300 hover:bg-cyan-50/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add endpoint
        </Button>
      ) : null}
    </div>
  )
}

// ============================================
// Security Requirements List
// ============================================
interface SecurityRequirementsListProps {
  requirements: SecurityRequirement[]
  onUpdate: (requirements: SecurityRequirement[]) => void
}

const categoryLabels: Record<SecurityRequirement['category'], string> = {
  authentication: 'Authentication',
  authorization: 'Authorization',
  encryption: 'Encryption',
  compliance: 'Compliance',
  data_handling: 'Data Handling',
  other: 'Other',
}

const categoryColors: Record<SecurityRequirement['category'], string> = {
  authentication: 'bg-[#F5E6DA] text-[#A05A32]',
  authorization: 'bg-blue-100 text-blue-700',
  encryption: 'bg-emerald-100 text-emerald-700',
  compliance: 'bg-amber-100 text-amber-700',
  data_handling: 'bg-cyan-100 text-cyan-700',
  other: 'bg-stone-100 text-stone-700',
}

function SecurityRequirementsList({ requirements, onUpdate }: SecurityRequirementsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newCategory, setNewCategory] = useState<SecurityRequirement['category']>('authentication')
  const [newRequirement, setNewRequirement] = useState('')

  const handleAdd = () => {
    if (newRequirement.trim()) {
      onUpdate([
        ...requirements,
        {
          id: `security-${Date.now()}`,
          category: newCategory,
          requirement: newRequirement.trim(),
          status: 'identified',
        },
      ])
      setNewCategory('authentication')
      setNewRequirement('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(requirements.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-2">
      {requirements.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={ShieldCheck}
          color="rose"
          title="No security requirements yet"
          description="Define security and compliance requirements"
          actionLabel="Add requirement"
          onAction={() => setIsAdding(true)}
        />
      )}
      {requirements.map((req, index) => (
        <div
          key={req.id}
          className={cn(
            "flex items-start gap-3 p-3 bg-white rounded-lg border border-stone-200 group",
            "animate-fade-in-up",
            index < 6 && `stagger-${index + 1}`
          )}
        >
          <span className={cn('text-xs px-2 py-0.5 rounded', categoryColors[req.category])}>
            {categoryLabels[req.category]}
          </span>
          <p className="flex-1 text-stone-700">{req.requirement}</p>
          <button
            onClick={() => handleRemove(req.id)}
            className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as SecurityRequirement['category'])}
            className="px-2 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            placeholder="Security requirement"
            className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : requirements.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-rose-200/60 hover:border-rose-300 hover:bg-rose-50/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add requirement
        </Button>
      ) : null}
    </div>
  )
}

// ============================================
// Technical Contacts List
// ============================================
interface TechnicalContactsListProps {
  contacts: TechnicalContact[]
  onUpdate: (contacts: TechnicalContact[]) => void
}

function TechnicalContactsList({ contacts, onUpdate }: TechnicalContactsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newSystem, setNewSystem] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...contacts,
        {
          id: `contact-${Date.now()}`,
          name: newName.trim(),
          role: newRole.trim(),
          system: newSystem.trim(),
          email: newEmail.trim() || undefined,
        },
      ])
      setNewName('')
      setNewRole('')
      setNewSystem('')
      setNewEmail('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(contacts.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-2">
      {contacts.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={Users}
          color="emerald"
          title="No technical contacts yet"
          description="Add system owners and technical contacts"
          actionLabel="Add contact"
          onAction={() => setIsAdding(true)}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map((contact, index) => (
          <div
            key={contact.id}
            className={cn(
              "flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200 group",
              "animate-fade-in-up",
              index < 6 && `stagger-${index + 1}`
            )}
          >
            <div className="p-2 bg-stone-100 text-stone-500 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-900 truncate">{contact.name}</p>
              <p className="text-sm text-stone-500 truncate">
                {contact.role} {contact.system && `• ${contact.system}`}
              </p>
              {contact.email && (
                <p className="text-xs text-stone-400 truncate">{contact.email}</p>
              )}
            </div>
            <button
              onClick={() => handleRemove(contact.id)}
              className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Role"
            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="text"
            value={newSystem}
            onChange={(e) => setNewSystem(e.target.value)}
            placeholder="System"
            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : contacts.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-emerald-200/60 hover:border-emerald-300 hover:bg-emerald-50/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add contact
        </Button>
      ) : null}
    </div>
  )
}

// ============================================
// Monitoring Metrics List
// ============================================
interface MonitoringMetricsListProps {
  metrics: MonitoringMetric[]
  onUpdate: (metrics: MonitoringMetric[]) => void
}

const perspectiveLabels: Record<MonitoringMetric['perspective'], { label: string; color: string }> = {
  user_experience: { label: 'User Experience', color: 'bg-blue-100 text-blue-700' },
  operational: { label: 'Operational', color: 'bg-emerald-100 text-emerald-700' },
  knowledge_quality: { label: 'Knowledge Quality', color: 'bg-[#F5E6DA] text-[#A05A32]' },
  financial: { label: 'Financial', color: 'bg-amber-100 text-amber-700' },
}

const frequencyLabels: Record<MonitoringMetric['frequency'], string> = {
  realtime: 'Realtime',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

function MonitoringMetricsList({ metrics, onUpdate }: MonitoringMetricsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newPerspective, setNewPerspective] = useState<MonitoringMetric['perspective']>('operational')
  const [newFrequency, setNewFrequency] = useState<MonitoringMetric['frequency']>('weekly')
  const [newAlertThreshold, setNewAlertThreshold] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...metrics,
        {
          id: `metric-${Date.now()}`,
          name: newName.trim(),
          target: newTarget.trim(),
          owner: newOwner.trim(),
          perspective: newPerspective,
          frequency: newFrequency,
          alertThreshold: newAlertThreshold.trim(),
          actionTrigger: '',
          dataSource: '',
        },
      ])
      setNewName('')
      setNewTarget('')
      setNewOwner('')
      setNewPerspective('operational')
      setNewFrequency('weekly')
      setNewAlertThreshold('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(metrics.filter((m) => m.id !== id))
  }

  // Group metrics by perspective
  const grouped = metrics.reduce(
    (acc, m) => {
      acc[m.perspective] = acc[m.perspective] || []
      acc[m.perspective].push(m)
      return acc
    },
    {} as Record<string, MonitoringMetric[]>
  )

  return (
    <div className="space-y-4">
      {metrics.length === 0 && !isAdding && (
        <ProfileEmptyState
          icon={BarChart3}
          color="orange"
          title="No monitoring metrics yet"
          description="Define KPIs with owners and alert thresholds"
          actionLabel="Add metric"
          onAction={() => setIsAdding(true)}
        />
      )}
      {metrics.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([perspective, perspectiveMetrics]) => {
            const config = perspectiveLabels[perspective as MonitoringMetric['perspective']]
            return (
              <div key={perspective}>
                <h5 className={cn('text-xs font-medium px-2 py-1 rounded-t inline-block', config?.color || 'bg-stone-100 text-stone-700')}>
                  {config?.label || perspective}
                </h5>
                <div className="overflow-x-auto border rounded-lg rounded-tl-none">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b">
                        <th className="text-left py-2 px-3 font-medium text-stone-700">Metric</th>
                        <th className="text-left py-2 px-3 font-medium text-stone-700">Target</th>
                        <th className="text-left py-2 px-3 font-medium text-stone-700">Owner</th>
                        <th className="text-left py-2 px-3 font-medium text-stone-700">Frequency</th>
                        <th className="text-left py-2 px-3 font-medium text-amber-600">Alert</th>
                        <th className="py-2 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {perspectiveMetrics.map((metric, index) => (
                        <tr
                          key={metric.id}
                          className={cn(
                            "border-b border-stone-100 group",
                            "animate-fade-in-up",
                            index < 6 && `stagger-${index + 1}`
                          )}
                        >
                          <td className="py-2 px-3 font-medium text-stone-900">{metric.name}</td>
                          <td className="py-2 px-3 text-emerald-600 font-medium">{metric.target || '-'}</td>
                          <td className="py-2 px-3 text-stone-600">{metric.owner || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                              {frequencyLabels[metric.frequency]}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-amber-600 text-xs">{metric.alertThreshold || '-'}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => handleRemove(metric.id)}
                              className="p-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {isAdding ? (
        <div className="p-4 bg-white rounded-lg border-2 border-stone-300 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Metric name (e.g., First Response Time)"
              className="col-span-2 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="Target (e.g., < 30 seconds)"
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <input
              type="text"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder="Owner (e.g., Operations Lead)"
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <select
              value={newPerspective}
              onChange={(e) => setNewPerspective(e.target.value as MonitoringMetric['perspective'])}
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {Object.entries(perspectiveLabels).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value as MonitoringMetric['frequency'])}
              className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newAlertThreshold}
              onChange={(e) => setNewAlertThreshold(e.target.value)}
              placeholder="Alert threshold (e.g., > 60 seconds)"
              className="col-span-2 px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewName('')
                setNewTarget('')
                setNewOwner('')
                setNewAlertThreshold('')
              }}
              className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : metrics.length > 0 ? (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          size="sm"
          className="w-full border-dashed border-orange-200/60 hover:border-orange-300 hover:bg-orange-50/50 mt-1"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add monitoring metric
        </Button>
      ) : null}
    </div>
  )
}
