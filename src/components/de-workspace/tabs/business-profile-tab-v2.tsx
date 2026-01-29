'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Bot,
  Target,
  TrendingUp,
  MessageSquare,
  Sparkles,
  GitBranch,
  Shield,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  X,
  User,
} from 'lucide-react'
import { EditableField, TagList, GuardrailsList } from '../profile-fields'
import {
  BusinessProfile,
  Stakeholder,
  KPI,
  Channel,
  Skill,
  ProcessStep,
  ExceptionCase,
  createEmptyProfile,
  PROFILE_SECTION_CONFIG,
} from '../profile-types'

interface BusinessProfileTabV2Props {
  designWeekId: string
  className?: string
}

// Section colors mapping
const sectionColors: Record<string, string> = {
  indigo: 'border-indigo-200 bg-indigo-50/50',
  blue: 'border-blue-200 bg-blue-50/50',
  emerald: 'border-emerald-200 bg-emerald-50/50',
  cyan: 'border-cyan-200 bg-cyan-50/50',
  violet: 'border-violet-200 bg-violet-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  rose: 'border-rose-200 bg-rose-50/50',
}

const iconColors: Record<string, string> = {
  indigo: 'text-indigo-600',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  cyan: 'text-cyan-600',
  violet: 'text-violet-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
}

// Section icons
const SectionIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    Bot: <Bot className={className} />,
    Target: <Target className={className} />,
    TrendingUp: <TrendingUp className={className} />,
    MessageSquare: <MessageSquare className={className} />,
    Sparkles: <Sparkles className={className} />,
    GitBranch: <GitBranch className={className} />,
    Shield: <Shield className={className} />,
  }
  return icons[name] || null
}

export function BusinessProfileTabV2({ designWeekId, className }: BusinessProfileTabV2Props) {
  const [profile, setProfile] = useState<BusinessProfile>(createEmptyProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['identity', 'businessContext', 'kpis', 'channels', 'skills', 'process', 'guardrails'])
  )

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/profile`)
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }
        const data = await response.json()
        if (data.profile) {
          setProfile(data.profile)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [designWeekId])

  // Save profile changes (debounced)
  const saveProfile = useCallback(
    async (updatedProfile: BusinessProfile) => {
      try {
        setSaving(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/profile`, {
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
    (updater: (prev: BusinessProfile) => BusinessProfile) => {
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
        <span className="ml-2 text-gray-500">Loading profile...</span>
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

      {/* Identity Section */}
      <ProfileSection
        sectionKey="identity"
        config={PROFILE_SECTION_CONFIG.identity}
        expanded={expandedSections.has('identity')}
        onToggle={() => toggleSection('identity')}
      >
        <div className="space-y-4">
          <EditableField
            label="DE Name"
            value={profile.identity.name}
            onChange={(value) =>
              updateProfile((p) => ({
                ...p,
                identity: { ...p.identity, name: String(value) },
              }))
            }
            placeholder="e.g., Claims Intake Assistant"
          />
          <EditableField
            label="Description"
            value={profile.identity.description}
            onChange={(value) =>
              updateProfile((p) => ({
                ...p,
                identity: { ...p.identity, description: String(value) },
              }))
            }
            placeholder="What does this Digital Employee do?"
            multiline
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stakeholders</label>
            <StakeholdersList
              stakeholders={profile.identity.stakeholders}
              onUpdate={(stakeholders) =>
                updateProfile((p) => ({
                  ...p,
                  identity: { ...p.identity, stakeholders },
                }))
              }
            />
          </div>
        </div>
      </ProfileSection>

      {/* Business Context Section */}
      <ProfileSection
        sectionKey="businessContext"
        config={PROFILE_SECTION_CONFIG.businessContext}
        expanded={expandedSections.has('businessContext')}
        onToggle={() => toggleSection('businessContext')}
      >
        <div className="space-y-4">
          <EditableField
            label="Problem Statement"
            value={profile.businessContext.problemStatement}
            onChange={(value) =>
              updateProfile((p) => ({
                ...p,
                businessContext: { ...p.businessContext, problemStatement: String(value) },
              }))
            }
            placeholder="What problem is being solved?"
            multiline
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <EditableField
                label="Monthly Volume"
                value={String(profile.businessContext.volumePerMonth ?? '')}
                onChange={(value) =>
                  updateProfile((p) => ({
                    ...p,
                    businessContext: {
                      ...p.businessContext,
                      volumePerMonth: value ? Number(value) : null,
                    },
                  }))
                }
                type="number"
                unit="cases/month"
                placeholder="11000"
              />
              {profile.businessContext.volumeCalculationNote && (
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  {profile.businessContext.volumeCalculationNote}
                </p>
              )}
            </div>
            <div>
              <EditableField
                label="Cost per Case"
                value={String(profile.businessContext.costPerCase ?? '')}
                onChange={(value) =>
                  updateProfile((p) => ({
                    ...p,
                    businessContext: {
                      ...p.businessContext,
                      costPerCase: value ? Number(value) : null,
                    },
                  }))
                }
                type="currency"
                currency={profile.businessContext.currency}
                placeholder="12.50"
              />
              {profile.businessContext.totalMonthlyCost && (
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Total: {profile.businessContext.currency || '€'}{profile.businessContext.totalMonthlyCost.toLocaleString()}/month
                </p>
              )}
            </div>
          </div>
          <TagList
            label="Peak Periods"
            tags={profile.businessContext.peakPeriods}
            onChange={(tags) =>
              updateProfile((p) => ({
                ...p,
                businessContext: { ...p.businessContext, peakPeriods: tags },
              }))
            }
            placeholder="Add peak period..."
          />
          <TagList
            label="Pain Points"
            tags={profile.businessContext.painPoints}
            onChange={(tags) =>
              updateProfile((p) => ({
                ...p,
                businessContext: { ...p.businessContext, painPoints: tags },
              }))
            }
            placeholder="Add pain point..."
          />
        </div>
      </ProfileSection>

      {/* KPIs Section */}
      <ProfileSection
        sectionKey="kpis"
        config={PROFILE_SECTION_CONFIG.kpis}
        expanded={expandedSections.has('kpis')}
        onToggle={() => toggleSection('kpis')}
      >
        <KPIsList
          kpis={profile.kpis}
          onUpdate={(kpis) => updateProfile((p) => ({ ...p, kpis }))}
        />
      </ProfileSection>

      {/* Channels Section */}
      <ProfileSection
        sectionKey="channels"
        config={PROFILE_SECTION_CONFIG.channels}
        expanded={expandedSections.has('channels')}
        onToggle={() => toggleSection('channels')}
      >
        <ChannelsList
          channels={profile.channels}
          onUpdate={(channels) => updateProfile((p) => ({ ...p, channels }))}
        />
      </ProfileSection>

      {/* Skills Section */}
      <ProfileSection
        sectionKey="skills"
        config={PROFILE_SECTION_CONFIG.skills}
        expanded={expandedSections.has('skills')}
        onToggle={() => toggleSection('skills')}
      >
        <div className="space-y-6">
          <SkillsList
            skills={profile.skills.skills}
            onUpdate={(skills) =>
              updateProfile((p) => ({
                ...p,
                skills: { ...p.skills, skills },
              }))
            }
          />

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Communication Style</h4>
            <div className="space-y-3">
              <TagList
                label="Tone"
                tags={profile.skills.communicationStyle.tone}
                onChange={(tags) =>
                  updateProfile((p) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      communicationStyle: { ...p.skills.communicationStyle, tone: tags },
                    },
                  }))
                }
                placeholder="e.g., Professional, Empathetic..."
              />
              <TagList
                label="Languages"
                tags={profile.skills.communicationStyle.languages}
                onChange={(tags) =>
                  updateProfile((p) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      communicationStyle: { ...p.skills.communicationStyle, languages: tags },
                    },
                  }))
                }
                placeholder="e.g., Dutch, English..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formality</label>
                <select
                  value={profile.skills.communicationStyle.formality}
                  onChange={(e) =>
                    updateProfile((p) => ({
                      ...p,
                      skills: {
                        ...p.skills,
                        communicationStyle: {
                          ...p.skills.communicationStyle,
                          formality: e.target.value as 'formal' | 'casual' | 'mixed',
                        },
                      },
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Process Section */}
      <ProfileSection
        sectionKey="process"
        config={PROFILE_SECTION_CONFIG.process}
        expanded={expandedSections.has('process')}
        onToggle={() => toggleSection('process')}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Happy Path</h4>
            <ProcessStepsList
              steps={profile.process.happyPathSteps}
              onUpdate={(steps) =>
                updateProfile((p) => ({
                  ...p,
                  process: { ...p.process, happyPathSteps: steps },
                }))
              }
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Exceptions</h4>
            <ExceptionsList
              exceptions={profile.process.exceptions}
              onUpdate={(exceptions) =>
                updateProfile((p) => ({
                  ...p,
                  process: { ...p.process, exceptions },
                }))
              }
            />
          </div>

          <div className="border-t pt-4">
            <TagList
              label="Escalation Rules"
              tags={profile.process.escalationRules}
              onChange={(tags) =>
                updateProfile((p) => ({
                  ...p,
                  process: { ...p.process, escalationRules: tags },
                }))
              }
              placeholder="Add escalation rule..."
            />
          </div>
        </div>
      </ProfileSection>

      {/* Guardrails Section */}
      <ProfileSection
        sectionKey="guardrails"
        config={PROFILE_SECTION_CONFIG.guardrails}
        expanded={expandedSections.has('guardrails')}
        onToggle={() => toggleSection('guardrails')}
      >
        <div className="space-y-6">
          <GuardrailsList
            neverRules={profile.guardrails.never}
            alwaysRules={profile.guardrails.always}
            financialLimits={profile.guardrails.financialLimits}
            onUpdateNever={(rules) =>
              updateProfile((p) => ({
                ...p,
                guardrails: { ...p.guardrails, never: rules },
              }))
            }
            onUpdateAlways={(rules) =>
              updateProfile((p) => ({
                ...p,
                guardrails: { ...p.guardrails, always: rules },
              }))
            }
            onUpdateFinancial={(limits) =>
              updateProfile((p) => ({
                ...p,
                guardrails: { ...p.guardrails, financialLimits: limits },
              }))
            }
          />

          <div className="border-t pt-4">
            <TagList
              label="Legal Restrictions"
              tags={profile.guardrails.legalRestrictions}
              onChange={(tags) =>
                updateProfile((p) => ({
                  ...p,
                  guardrails: { ...p.guardrails, legalRestrictions: tags },
                }))
              }
              placeholder="Add legal restriction..."
            />
          </div>
        </div>
      </ProfileSection>
    </div>
  )
}

// ============================================
// Profile Section wrapper component
// ============================================
interface ProfileSectionProps {
  sectionKey: string
  config: (typeof PROFILE_SECTION_CONFIG)[keyof typeof PROFILE_SECTION_CONFIG]
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ProfileSection({ sectionKey, config, expanded, onToggle, children }: ProfileSectionProps) {
  const colorClass = sectionColors[config.color] || sectionColors.indigo
  const iconColor = iconColors[config.color] || iconColors.indigo

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
// Stakeholders List
// ============================================
interface StakeholdersListProps {
  stakeholders: Stakeholder[]
  onUpdate: (stakeholders: Stakeholder[]) => void
}

function StakeholdersList({ stakeholders, onUpdate }: StakeholdersListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...stakeholders,
        {
          id: `stakeholder-${Date.now()}`,
          name: newName.trim(),
          role: newRole.trim(),
        },
      ])
      setNewName('')
      setNewRole('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(stakeholders.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-2">
      {stakeholders.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No stakeholders defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stakeholders.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{s.name}</p>
              {s.role && <p className="text-sm text-gray-500 truncate">{s.role}</p>}
            </div>
            <button
              onClick={() => handleRemove(s.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Role"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewName('')
              setNewRole('')
            }}
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
          Add stakeholder
        </button>
      )}
    </div>
  )
}

// ============================================
// KPIs List
// ============================================
interface KPIsListProps {
  kpis: KPI[]
  onUpdate: (kpis: KPI[]) => void
}

function KPIsList({ kpis, onUpdate }: KPIsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newUnit, setNewUnit] = useState('%')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...kpis,
        {
          id: `kpi-${Date.now()}`,
          name: newName.trim(),
          targetValue: newTarget.trim(),
          unit: newUnit,
        },
      ])
      setNewName('')
      setNewTarget('')
      setNewUnit('%')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(kpis.filter((k) => k.id !== id))
  }

  return (
    <div className="space-y-2">
      {kpis.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No KPIs defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Target className="h-4 w-4" />
                </div>
                <h4 className="font-medium text-gray-900">{kpi.name}</h4>
              </div>
              <button
                onClick={() => handleRemove(kpi.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-lg font-semibold text-emerald-600">
              {kpi.targetValue}
              {kpi.unit}
            </div>
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="KPI name"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Target"
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="%">%</option>
            <option value="min">min</option>
            <option value="hrs">hrs</option>
            <option value="">none</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewName('')
              setNewTarget('')
            }}
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
          Add KPI
        </button>
      )}
    </div>
  )
}

// ============================================
// Channels List
// ============================================
interface ChannelsListProps {
  channels: Channel[]
  onUpdate: (channels: Channel[]) => void
}

function ChannelsList({ channels, onUpdate }: ChannelsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<Channel['type']>('email')
  const [newSla, setNewSla] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...channels,
        {
          id: `channel-${Date.now()}`,
          name: newName.trim(),
          type: newType,
          volumePercentage: 0,
          sla: newSla.trim(),
        },
      ])
      setNewName('')
      setNewType('email')
      setNewSla('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(channels.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-2">
      {channels.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No channels defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{channel.name}</h4>
                  <span className="text-xs text-gray-500">{channel.type}</span>
                </div>
              </div>
              <button
                onClick={() => handleRemove(channel.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {channel.sla && (
              <p className="mt-2 text-sm text-gray-600">SLA: {channel.sla}</p>
            )}
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Channel name"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as Channel['type'])}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="email">Email</option>
            <option value="chat">Chat</option>
            <option value="phone">Phone</option>
            <option value="portal">Portal</option>
            <option value="api">API</option>
            <option value="other">Other</option>
          </select>
          <input
            type="text"
            value={newSla}
            onChange={(e) => setNewSla(e.target.value)}
            placeholder="SLA"
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
          Add channel
        </button>
      )}
    </div>
  )
}

// ============================================
// Skills List
// ============================================
interface SkillsListProps {
  skills: Skill[]
  onUpdate: (skills: Skill[]) => void
}

const skillTypeLabels: Record<string, string> = {
  answer: 'Answer Questions',
  route: 'Route Cases',
  approve_reject: 'Approve/Reject',
  request_info: 'Request Info',
  notify: 'Notify',
  other: 'Other',
}

function SkillsList({ skills, onUpdate }: SkillsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<Skill['type']>('answer')
  const [newDesc, setNewDesc] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...skills,
        {
          id: `skill-${Date.now()}`,
          name: newName.trim(),
          type: newType,
          description: newDesc.trim(),
        },
      ])
      setNewName('')
      setNewType('answer')
      setNewDesc('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(skills.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-2">
      {skills.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No skills defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-600 rounded font-medium">
                    {skillTypeLabels[skill.type] || skill.type}
                  </span>
                  <h4 className="font-medium text-gray-900 mt-1">{skill.name}</h4>
                </div>
              </div>
              <button
                onClick={() => handleRemove(skill.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {skill.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{skill.description}</p>
            )}
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex flex-col gap-2 mt-2 p-3 bg-white rounded-lg border border-violet-300">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Skill name"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as Skill['type'])}
              className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="answer">Answer Questions</option>
              <option value="route">Route Cases</option>
              <option value="approve_reject">Approve/Reject</option>
              <option value="request_info">Request Info</option>
              <option value="notify">Notify</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
          Add skill
        </button>
      )}
    </div>
  )
}

// ============================================
// Process Steps List
// ============================================
interface ProcessStepsListProps {
  steps: ProcessStep[]
  onUpdate: (steps: ProcessStep[]) => void
}

function ProcessStepsList({ steps, onUpdate }: ProcessStepsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const handleAdd = () => {
    if (newTitle.trim()) {
      onUpdate([
        ...steps,
        {
          id: `step-${Date.now()}`,
          order: steps.length + 1,
          title: newTitle.trim(),
          description: '',
        },
      ])
      setNewTitle('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }))
    onUpdate(updated)
  }

  return (
    <div className="space-y-2">
      {steps.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No process steps defined</p>
      )}
      {steps.length > 0 && (
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center min-w-[120px] group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    {step.order}
                  </div>
                  <button
                    onClick={() => handleRemove(step.id)}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-center font-medium text-gray-900 mt-2 max-w-[100px]">
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-amber-200 -mt-4" />
              )}
            </div>
          ))}
        </div>
      )}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Step title"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
          Add step
        </button>
      )}
    </div>
  )
}

// ============================================
// Exceptions List
// ============================================
interface ExceptionsListProps {
  exceptions: ExceptionCase[]
  onUpdate: (exceptions: ExceptionCase[]) => void
}

function ExceptionsList({ exceptions, onUpdate }: ExceptionsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTrigger, setNewTrigger] = useState('')
  const [newAction, setNewAction] = useState('')

  const handleAdd = () => {
    if (newTrigger.trim()) {
      onUpdate([
        ...exceptions,
        {
          id: `exception-${Date.now()}`,
          trigger: newTrigger.trim(),
          action: newAction.trim(),
        },
      ])
      setNewTrigger('')
      setNewAction('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(exceptions.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-2">
      {exceptions.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No exceptions defined</p>
      )}
      {exceptions.map((exception) => (
        <div
          key={exception.id}
          className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 group"
        >
          <span className="text-amber-600 font-medium">!</span>
          <div className="flex-1">
            <p className="text-gray-700">
              <strong>If:</strong> {exception.trigger}
            </p>
            {exception.action && (
              <p className="text-gray-600 text-sm">
                <strong>Then:</strong> {exception.action}
              </p>
            )}
          </div>
          <button
            onClick={() => handleRemove(exception.id)}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {isAdding ? (
        <div className="flex flex-col gap-2 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-300">
          <input
            type="text"
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            placeholder="If (trigger condition)..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            placeholder="Then (action to take)..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-white rounded-lg"
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
          Add exception
        </button>
      )}
    </div>
  )
}
