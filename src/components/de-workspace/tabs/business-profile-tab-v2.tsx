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
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
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
  PersonaTrait,
  ToneRule,
  DosAndDonts,
  EscalationScript,
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
  pink: 'border-pink-200 bg-pink-50/50',
}

const iconColors: Record<string, string> = {
  indigo: 'text-indigo-600',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  cyan: 'text-cyan-600',
  violet: 'text-violet-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  pink: 'text-pink-600',
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
    MessageCircle: <MessageCircle className={className} />,
  }
  return icons[name] || null
}

export function BusinessProfileTabV2({ designWeekId, className }: BusinessProfileTabV2Props) {
  const [profile, setProfile] = useState<BusinessProfile>(createEmptyProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['identity', 'businessContext', 'kpis', 'channels', 'skills', 'process', 'guardrails', 'persona'])
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
                <p className="text-xs text-gray-500 mt-1 ml-1" suppressHydrationWarning>
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

      {/* Persona & Conversational Design Section */}
      <ProfileSection
        sectionKey="persona"
        config={PROFILE_SECTION_CONFIG.persona}
        expanded={expandedSections.has('persona')}
        onToggle={() => toggleSection('persona')}
      >
        <div className="space-y-6">
          {/* Persona Traits */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Personality Traits</h4>
            <PersonaTraitsList
              traits={profile.persona?.traits || []}
              onUpdate={(traits) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), traits },
                }))
              }
            />
          </div>

          {/* Tone Rules */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Tone of Voice Rules</h4>
            <ToneRulesList
              rules={profile.persona?.toneRules || []}
              onUpdate={(toneRules) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), toneRules },
                }))
              }
            />
          </div>

          {/* Do's & Don'ts */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Do&apos;s & Don&apos;ts</h4>
            <DosAndDontsList
              items={profile.persona?.dosAndDonts || []}
              onUpdate={(dosAndDonts) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), dosAndDonts },
                }))
              }
            />
          </div>

          {/* Opening Message */}
          <div className="border-t pt-4">
            <EditableField
              label="Opening Message"
              value={profile.persona?.openingMessage || ''}
              onChange={(value) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), openingMessage: String(value) },
                }))
              }
              placeholder="Hi! I'm [DE name], your digital assistant. How can I help you today?"
              multiline
            />
          </div>

          {/* AI Disclaimer */}
          <div className="border-t pt-4">
            <EditableField
              label="AI Transparency Disclaimer"
              value={profile.persona?.aiDisclaimer || ''}
              onChange={(value) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), aiDisclaimer: String(value) },
                }))
              }
              placeholder="I'm an AI assistant. For complex or sensitive questions, I'll connect you with a human colleague."
              multiline
            />
          </div>

          {/* Escalation Scripts */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Escalation Scripts</h4>
            <EscalationScriptsList
              scripts={profile.persona?.escalationScripts || []}
              onUpdate={(escalationScripts) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), escalationScripts },
                }))
              }
            />
          </div>

          {/* Conversation Structure */}
          <div className="border-t pt-4">
            <TagList
              label="Conversation Structure (ordered steps)"
              tags={profile.persona?.conversationStructure || []}
              onChange={(tags) =>
                updateProfile((p) => ({
                  ...p,
                  persona: { ...(p.persona || createEmptyProfile().persona!), conversationStructure: tags },
                }))
              }
              placeholder="e.g., Acknowledge, Understand, Clarify..."
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
            {(kpi.owner || kpi.alertThreshold) && (
              <div className="mt-1 space-y-0.5">
                {kpi.owner && (
                  <p className="text-xs text-gray-500">Owner: {kpi.owner}</p>
                )}
                {kpi.alertThreshold && (
                  <p className="text-xs text-amber-600">Alert: {kpi.alertThreshold}</p>
                )}
              </div>
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
  const [newDescription, setNewDescription] = useState('')

  const handleAdd = () => {
    if (newTitle.trim()) {
      onUpdate([
        ...steps,
        {
          id: `step-${Date.now()}`,
          order: steps.length + 1,
          title: newTitle.trim(),
          description: newDescription.trim(),
        },
      ])
      setNewTitle('')
      setNewDescription('')
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
              <div className="flex flex-col items-center min-w-[160px] max-w-[180px] group">
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
                <p className="text-xs text-center font-medium text-gray-900 mt-2">
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-center text-gray-500 mt-1 line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-amber-200 -mt-4" />
              )}
            </div>
          ))}
        </div>
      )}
      {isAdding ? (
        <div className="space-y-2 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Step title (e.g., Receive Request)"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (e.g., User submits request via email or portal)"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false)
                setNewTitle('')
                setNewDescription('')
              }}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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

// ============================================
// Persona Traits List
// ============================================
interface PersonaTraitsListProps {
  traits: PersonaTrait[]
  onUpdate: (traits: PersonaTrait[]) => void
}

function PersonaTraitsList({ traits, onUpdate }: PersonaTraitsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newExample, setNewExample] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onUpdate([
        ...traits,
        {
          id: `trait-${Date.now()}`,
          name: newName.trim(),
          description: newDescription.trim(),
          examplePhrase: newExample.trim(),
        },
      ])
      setNewName('')
      setNewDescription('')
      setNewExample('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(traits.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-2">
      {traits.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No persona traits defined</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {traits.map((trait) => (
          <div
            key={trait.id}
            className="p-3 bg-white rounded-lg border border-gray-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <h4 className="font-medium text-gray-900">{trait.name}</h4>
              </div>
              <button
                onClick={() => handleRemove(trait.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {trait.description && (
              <p className="mt-2 text-sm text-gray-600">{trait.description}</p>
            )}
            {trait.examplePhrase && (
              <p className="mt-1 text-xs text-pink-600 italic">&ldquo;{trait.examplePhrase}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex flex-col gap-2 mt-2 p-3 bg-white rounded-lg border border-pink-300">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Trait name (e.g., Helpful, Clear, Patient)"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (e.g., Always offers proactive next steps)"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="text"
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            placeholder='Example phrase (e.g., "Let me see what I can find for you")'
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewName('')
                setNewDescription('')
                setNewExample('')
              }}
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
          Add persona trait
        </button>
      )}
    </div>
  )
}

// ============================================
// Tone Rules List
// ============================================
interface ToneRulesListProps {
  rules: ToneRule[]
  onUpdate: (rules: ToneRule[]) => void
}

const toneRuleCategoryLabels: Record<ToneRule['category'], string> = {
  reading_level: 'Reading Level',
  formality: 'Formality',
  sentence_structure: 'Sentence Structure',
  vocabulary: 'Vocabulary',
  other: 'Other',
}

function ToneRulesList({ rules, onUpdate }: ToneRulesListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [newCategory, setNewCategory] = useState<ToneRule['category']>('other')

  const handleAdd = () => {
    if (newRule.trim()) {
      onUpdate([
        ...rules,
        {
          id: `tone-${Date.now()}`,
          rule: newRule.trim(),
          category: newCategory,
        },
      ])
      setNewRule('')
      setNewCategory('other')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(rules.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-2">
      {rules.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No tone rules defined</p>
      )}
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 group"
        >
          <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded whitespace-nowrap">
            {toneRuleCategoryLabels[rule.category]}
          </span>
          <p className="flex-1 text-sm text-gray-700">{rule.rule}</p>
          <button
            onClick={() => handleRemove(rule.id)}
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
            onChange={(e) => setNewCategory(e.target.value as ToneRule['category'])}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {Object.entries(toneRuleCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder="e.g., Max 15-20 words per sentence"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
          Add tone rule
        </button>
      )}
    </div>
  )
}

// ============================================
// Do's & Don'ts List
// ============================================
interface DosAndDontsListProps {
  items: DosAndDonts[]
  onUpdate: (items: DosAndDonts[]) => void
}

function DosAndDontsList({ items, onUpdate }: DosAndDontsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newWrong, setNewWrong] = useState('')
  const [newRight, setNewRight] = useState('')

  const handleAdd = () => {
    if (newWrong.trim() && newRight.trim()) {
      onUpdate([
        ...items,
        {
          id: `dosdont-${Date.now()}`,
          wrong: newWrong.trim(),
          right: newRight.trim(),
        },
      ])
      setNewWrong('')
      setNewRight('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(items.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No do&apos;s & don&apos;ts defined</p>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-red-600 w-1/2">
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3.5 w-3.5" /> Don&apos;t say
                  </span>
                </th>
                <th className="text-left py-2 px-3 font-medium text-emerald-600 w-1/2">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> Say instead
                  </span>
                </th>
                <th className="py-2 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 group">
                  <td className="py-2 px-3 text-red-700 bg-red-50/50">{item.wrong}</td>
                  <td className="py-2 px-3 text-emerald-700 bg-emerald-50/50">{item.right}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleRemove(item.id)}
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
        <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-white rounded-lg border border-pink-300">
          <input
            type="text"
            value={newWrong}
            onChange={(e) => setNewWrong(e.target.value)}
            placeholder="Don't say (e.g., That's not possible)"
            className="px-3 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-50/50"
          />
          <input
            type="text"
            value={newRight}
            onChange={(e) => setNewRight(e.target.value)}
            placeholder="Say instead (e.g., Let me find another way)"
            className="px-3 py-1.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/50"
          />
          <div className="col-span-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewWrong('')
                setNewRight('')
              }}
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
          Add do/don&apos;t pair
        </button>
      )}
    </div>
  )
}

// ============================================
// Escalation Scripts List
// ============================================
interface EscalationScriptsListProps {
  scripts: EscalationScript[]
  onUpdate: (scripts: EscalationScript[]) => void
}

const escalationContextLabels: Record<EscalationScript['context'], string> = {
  office_hours: 'Office Hours',
  after_hours: 'After Hours',
  unknown_topic: 'Unknown Topic',
  emotional: 'Emotional Customer',
  other: 'Other',
}

const escalationContextColors: Record<EscalationScript['context'], string> = {
  office_hours: 'bg-emerald-100 text-emerald-700',
  after_hours: 'bg-blue-100 text-blue-700',
  unknown_topic: 'bg-amber-100 text-amber-700',
  emotional: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
}

function EscalationScriptsList({ scripts, onUpdate }: EscalationScriptsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newContext, setNewContext] = useState<EscalationScript['context']>('office_hours')
  const [newLabel, setNewLabel] = useState('')
  const [newScript, setNewScript] = useState('')

  const handleAdd = () => {
    if (newScript.trim()) {
      onUpdate([
        ...scripts,
        {
          id: `escalation-${Date.now()}`,
          context: newContext,
          label: newLabel.trim() || escalationContextLabels[newContext],
          script: newScript.trim(),
          includesContext: true,
        },
      ])
      setNewContext('office_hours')
      setNewLabel('')
      setNewScript('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onUpdate(scripts.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-3">
      {scripts.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No escalation scripts defined</p>
      )}
      {scripts.map((script) => (
        <div
          key={script.id}
          className="p-3 bg-white rounded-lg border border-gray-200 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded', escalationContextColors[script.context])}>
                {script.label || escalationContextLabels[script.context]}
              </span>
            </div>
            <button
              onClick={() => handleRemove(script.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
            &ldquo;{script.script}&rdquo;
          </p>
        </div>
      ))}
      {isAdding ? (
        <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-pink-300">
          <div className="flex items-center gap-2">
            <select
              value={newContext}
              onChange={(e) => setNewContext(e.target.value as EscalationScript['context'])}
              className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {Object.entries(escalationContextLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Custom label (optional)"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <textarea
            value={newScript}
            onChange={(e) => setNewScript(e.target.value)}
            placeholder='Exact script, e.g., "I understand this is important to you. Let me connect you with a colleague who can help further."'
            rows={3}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewScript('')
                setNewLabel('')
              }}
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
          Add escalation script
        </button>
      )}
    </div>
  )
}
