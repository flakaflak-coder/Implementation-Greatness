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
} from 'lucide-react'
import { TagList } from '../profile-fields'
import {
  TechnicalProfile,
  Integration,
  DataField,
  APIEndpoint,
  SecurityRequirement,
  TechnicalContact,
  createEmptyTechnicalProfile,
  TECHNICAL_SECTION_CONFIG,
  IntegrationType,
  AuthMethod,
  IntegrationStatus,
} from '../profile-types'

interface TechnicalProfileTabV2Props {
  designWeekId: string
  className?: string
}

// Section colors
const sectionColors: Record<string, string> = {
  violet: 'border-violet-200 bg-violet-50/50',
  blue: 'border-blue-200 bg-blue-50/50',
  cyan: 'border-cyan-200 bg-cyan-50/50',
  rose: 'border-rose-200 bg-rose-50/50',
  emerald: 'border-emerald-200 bg-emerald-50/50',
}

const iconColors: Record<string, string> = {
  violet: 'text-violet-600',
  blue: 'text-blue-600',
  cyan: 'text-cyan-600',
  rose: 'text-rose-600',
  emerald: 'text-emerald-600',
}

// Section icons
const SectionIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    Plug: <Plug className={className} />,
    Database: <Database className={className} />,
    Globe: <Globe className={className} />,
    ShieldCheck: <ShieldCheck className={className} />,
    Users: <Users className={className} />,
  }
  return icons[name] || null
}

export function TechnicalProfileTabV2({ designWeekId, className }: TechnicalProfileTabV2Props) {
  const [profile, setProfile] = useState<TechnicalProfile>(createEmptyTechnicalProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['integrations', 'dataFields', 'apiEndpoints', 'securityRequirements', 'technicalContacts'])
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading technical profile...</span>
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-lg z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {/* Info banner */}
      <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
        <p className="text-sm text-violet-700">
          <strong>Technical Profile</strong> captures all system integrations, data requirements, and security specifications needed for the Digital Employee implementation.
        </p>
      </div>

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

      {/* Notes Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Technical Notes</h4>
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
    <div className={cn('rounded-lg border', colorClass)}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/30 transition-colors"
      >
        <div className={iconColor}>
          <SectionIcon name={config.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{config.title}</h3>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4 pt-2 border-t border-white/50">{children}</div>}
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
  identified: { label: 'Identified', color: 'bg-gray-100 text-gray-700' },
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
        <p className="text-gray-500 text-sm">No integrations defined</p>
      )}
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className="p-4 bg-white rounded-lg border border-gray-200 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{integration.systemName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {integrationTypeLabels[integration.type]}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
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
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {integration.purpose && (
            <p className="mt-2 text-sm text-gray-600">{integration.purpose}</p>
          )}
          {(integration.fieldsRead.length > 0 || integration.fieldsWrite.length > 0) && (
            <div className="mt-2 flex gap-4 text-xs">
              {integration.fieldsRead.length > 0 && (
                <span className="text-gray-500">
                  Read: {integration.fieldsRead.join(', ')}
                </span>
              )}
              {integration.fieldsWrite.length > 0 && (
                <span className="text-gray-500">
                  Write: {integration.fieldsWrite.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
      {isAdding ? (
        <div className="p-4 bg-white rounded-lg border-2 border-violet-300 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="System name"
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as IntegrationType)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex items-center gap-3">
            <select
              value={newAuth}
              onChange={(e) => setNewAuth(e.target.value as AuthMethod)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
          Add integration
        </button>
      )}
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
        <p className="text-gray-500 text-sm">No data fields defined</p>
      )}
      {dataFields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Field</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Source</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Required</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {dataFields.map((field) => (
                <tr key={field.id} className="border-b border-gray-100 group">
                  <td className="py-2 px-3 font-medium text-gray-900">{field.name}</td>
                  <td className="py-2 px-3 text-gray-600">{field.source || '-'}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {field.type}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {field.required ? (
                      <span className="text-emerald-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleRemove(field.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Source"
            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="rounded border-gray-300"
            />
            Required
          </label>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-2"
        >
          <Plus className="h-4 w-4" />
          Add data field
        </button>
      )}
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
  PATCH: 'bg-violet-100 text-violet-700',
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
        <p className="text-gray-500 text-sm">No API endpoints defined</p>
      )}
      {endpoints.map((endpoint) => (
        <div
          key={endpoint.id}
          className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 group"
        >
          <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
            <FileCode className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded font-mono', methodColors[endpoint.method])}>
                {endpoint.method}
              </span>
              <code className="text-sm text-gray-700 font-mono">{endpoint.path}</code>
            </div>
            <p className="font-medium text-gray-900 mt-1">{endpoint.name}</p>
            {endpoint.description && (
              <p className="text-sm text-gray-500 mt-0.5">{endpoint.description}</p>
            )}
          </div>
          <button
            onClick={() => handleRemove(endpoint.id)}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {isAdding ? (
        <div className="p-4 bg-white rounded-lg border-2 border-cyan-300 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value as APIEndpoint['method'])}
              className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
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
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Endpoint name"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-2"
        >
          <Plus className="h-4 w-4" />
          Add endpoint
        </button>
      )}
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
  authentication: 'bg-violet-100 text-violet-700',
  authorization: 'bg-blue-100 text-blue-700',
  encryption: 'bg-emerald-100 text-emerald-700',
  compliance: 'bg-amber-100 text-amber-700',
  data_handling: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
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
        <p className="text-gray-500 text-sm">No security requirements defined</p>
      )}
      {requirements.map((req) => (
        <div
          key={req.id}
          className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 group"
        >
          <span className={cn('text-xs px-2 py-0.5 rounded', categoryColors[req.category])}>
            {categoryLabels[req.category]}
          </span>
          <p className="flex-1 text-gray-700">{req.requirement}</p>
          <button
            onClick={() => handleRemove(req.id)}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-2"
        >
          <Plus className="h-4 w-4" />
          Add requirement
        </button>
      )}
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
        <p className="text-gray-500 text-sm">No technical contacts defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{contact.name}</p>
              <p className="text-sm text-gray-500 truncate">
                {contact.role} {contact.system && `• ${contact.system}`}
              </p>
              {contact.email && (
                <p className="text-xs text-gray-400 truncate">{contact.email}</p>
              )}
            </div>
            <button
              onClick={() => handleRemove(contact.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Role"
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={newSystem}
            onChange={(e) => setNewSystem(e.target.value)}
            placeholder="System"
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-2"
        >
          <Plus className="h-4 w-4" />
          Add contact
        </button>
      )}
    </div>
  )
}
