/**
 * Profile Mapper
 *
 * Maps ExtractedItems from the database to the BusinessProfile structure.
 * This allows auto-population of profile fields from AI extractions.
 */

import type { ExtractedItem } from '@prisma/client'
import type {
  BusinessProfile,
  Stakeholder,
  KPI,
  Channel,
  Skill,
  ProcessStep,
  ExceptionCase,
  CaseType,
  ScopeItem,
  FinancialLimit,
  SkillType,
} from '@/components/de-workspace/profile-types'
import { createEmptyProfile } from '@/components/de-workspace/profile-types'

/**
 * Maps extracted items to a BusinessProfile structure
 */
export function mapExtractedItemsToProfile(items: ExtractedItem[]): BusinessProfile {
  const profile = createEmptyProfile()

  for (const item of items) {
    try {
      mapItemToProfile(item, profile)
    } catch (error) {
      console.warn(`Failed to map item ${item.id} (${item.type}):`, error)
    }
  }

  return profile
}

/**
 * Map a single extracted item to the appropriate profile field
 */
function mapItemToProfile(item: ExtractedItem, profile: BusinessProfile): void {
  const structured = item.structuredData as Record<string, unknown> | null

  switch (item.type) {
    // ========================================
    // Identity Section
    // ========================================
    case 'STAKEHOLDER':
      const stakeholder: Stakeholder = {
        id: item.id,
        name: (structured?.name as string) || item.content,
        role: (structured?.role as string) || '',
        email: structured?.email as string | undefined,
        isDecisionMaker: structured?.isDecisionMaker as boolean | undefined,
      }
      profile.identity.stakeholders.push(stakeholder)
      break

    // ========================================
    // Business Context Section
    // ========================================
    case 'GOAL':
      // Goals go to a dedicated goals array or problem statement
      if (!profile.businessContext.problemStatement) {
        profile.businessContext.problemStatement = item.content
      }
      break

    case 'BUSINESS_CASE':
      // Business case has structured pain points
      if (structured?.problemStatement) {
        profile.businessContext.problemStatement = structured.problemStatement as string
      } else if (!profile.businessContext.problemStatement) {
        profile.businessContext.problemStatement = item.content
      }

      // Handle structured painPoints array
      if (structured?.painPoints && Array.isArray(structured.painPoints)) {
        for (const painPoint of structured.painPoints) {
          const cleanPainPoint = (painPoint as string).replace(/^[•\-\*]\s*/, '').trim()
          if (cleanPainPoint && !profile.businessContext.painPoints.includes(cleanPainPoint)) {
            profile.businessContext.painPoints.push(cleanPainPoint)
          }
        }
      } else if (item.content.includes('•')) {
        // Parse bullet points from content
        const bulletPoints = item.content.split('•').filter(p => p.trim())
        for (const point of bulletPoints) {
          const cleanPoint = point.trim()
          if (cleanPoint && !profile.businessContext.painPoints.includes(cleanPoint)) {
            profile.businessContext.painPoints.push(cleanPoint)
          }
        }
      }
      break

    case 'VOLUME_EXPECTATION':
      // LLM provides normalized monthlyVolume directly
      if (structured?.monthlyVolume !== undefined) {
        profile.businessContext.volumePerMonth = structured.monthlyVolume as number
      }
      if (structured?.originalValue !== undefined) {
        profile.businessContext.volumeOriginalValue = structured.originalValue as number
      }
      if (structured?.originalUnit) {
        profile.businessContext.volumeOriginalUnit = structured.originalUnit as string
      }
      if (structured?.calculationNote) {
        profile.businessContext.volumeCalculationNote = structured.calculationNote as string
      }
      break

    case 'COST_PER_CASE':
      // LLM provides costPerCase and totalMonthlyCost directly
      if (structured?.costPerCase !== undefined) {
        profile.businessContext.costPerCase = structured.costPerCase as number
      }
      if (structured?.currency) {
        profile.businessContext.currency = structured.currency as string
      }
      if (structured?.totalMonthlyCost !== undefined) {
        profile.businessContext.totalMonthlyCost = structured.totalMonthlyCost as number
      }
      if (structured?.calculationNote) {
        profile.businessContext.costCalculationNote = structured.calculationNote as string
      }
      break

    case 'PEAK_PERIODS':
      profile.businessContext.peakPeriods.push(item.content)
      break

    case 'TIMELINE_CONSTRAINT':
      // Add to pain points as timeline constraints are often business-critical
      profile.businessContext.painPoints.push(`Timeline: ${item.content}`)
      break

    // ========================================
    // KPIs Section
    // ========================================
    case 'KPI_TARGET':
      const kpi: KPI = {
        id: item.id,
        name: (structured?.name as string) || item.content.split(':')[0] || item.content,
        description: structured?.description as string | undefined,
        targetValue: (structured?.targetValue as string) || extractTargetFromContent(item.content),
        currentValue: structured?.currentValue as string | undefined,
        unit: (structured?.unit as string) || '%',
        frequency: structured?.frequency as string | undefined,
      }
      profile.kpis.push(kpi)
      break

    // ========================================
    // Channels Section
    // ========================================
    case 'CHANNEL':
      const channel: Channel = {
        id: item.id,
        name: (structured?.name as string) || item.content,
        type: (structured?.type as Channel['type']) || inferChannelType(item.content),
        volumePercentage: (structured?.volumePercentage as number) || 0,
        sla: (structured?.sla as string) || '',
        rules: structured?.rules as string[] | undefined,
      }
      profile.channels.push(channel)
      break

    case 'CHANNEL_SLA':
      // Try to find matching channel and update SLA
      const channelName = (structured?.channel as string) || ''
      const existingChannel = profile.channels.find(
        (c) => c.name.toLowerCase() === channelName.toLowerCase()
      )
      if (existingChannel) {
        existingChannel.sla = item.content
      }
      break

    case 'CHANNEL_VOLUME':
      // Try to find matching channel and update volume
      const volChannelName = (structured?.channel as string) || ''
      const volChannel = profile.channels.find(
        (c) => c.name.toLowerCase() === volChannelName.toLowerCase()
      )
      if (volChannel && structured?.percentage) {
        volChannel.volumePercentage = structured.percentage as number
      }
      break

    case 'CHANNEL_RULE':
      // Try to find matching channel and add rule, or add to last channel
      const ruleChannelName = (structured?.channel as string) || ''
      const ruleChannel = profile.channels.find(
        (c) => c.name.toLowerCase() === ruleChannelName.toLowerCase()
      ) || profile.channels[profile.channels.length - 1]
      if (ruleChannel) {
        ruleChannel.rules = ruleChannel.rules || []
        ruleChannel.rules.push(item.content)
      }
      break

    // ========================================
    // Skills Section
    // ========================================
    case 'SKILL_ANSWER':
    case 'SKILL_ROUTE':
    case 'SKILL_APPROVE_REJECT':
    case 'SKILL_REQUEST_INFO':
    case 'SKILL_NOTIFY':
    case 'SKILL_OTHER':
      const skillType = mapSkillType(item.type)
      const skill: Skill = {
        id: item.id,
        type: skillType,
        name: (structured?.name as string) || item.content.split(':')[0] || item.content,
        description: (structured?.description as string) || item.content,
        knowledgeSources: structured?.knowledgeSources as string[] | undefined,
        rules: structured?.rules as string[] | undefined,
      }
      profile.skills.skills.push(skill)
      break

    case 'KNOWLEDGE_SOURCE':
      // Add to the most recent skill if exists
      const lastSkill = profile.skills.skills[profile.skills.skills.length - 1]
      if (lastSkill) {
        lastSkill.knowledgeSources = lastSkill.knowledgeSources || []
        lastSkill.knowledgeSources.push(item.content)
      }
      break

    case 'BRAND_TONE':
      profile.skills.communicationStyle.tone.push(item.content)
      break

    case 'COMMUNICATION_STYLE':
      if (structured?.formality) {
        profile.skills.communicationStyle.formality = structured.formality as
          | 'formal'
          | 'casual'
          | 'mixed'
      }
      if (structured?.languages) {
        profile.skills.communicationStyle.languages = structured.languages as string[]
      }
      break

    case 'RESPONSE_TEMPLATE':
      // Add as a skill with type 'other' - templates are skills the DE uses
      const templateSkill: Skill = {
        id: item.id,
        type: 'other',
        name: (structured?.name as string) || 'Response Template',
        description: item.content,
        rules: structured?.rules as string[] | undefined,
      }
      profile.skills.skills.push(templateSkill)
      break

    // ========================================
    // Process Section
    // ========================================
    case 'HAPPY_PATH_STEP':
      const step: ProcessStep = {
        id: item.id,
        order: (structured?.order as number) || profile.process.happyPathSteps.length + 1,
        title: (structured?.title as string) || item.content.split(':')[0] || `Step ${profile.process.happyPathSteps.length + 1}`,
        description: (structured?.description as string) || item.content,
        isDecisionPoint: structured?.isDecisionPoint as boolean | undefined,
      }
      profile.process.happyPathSteps.push(step)
      // Sort by order
      profile.process.happyPathSteps.sort((a, b) => a.order - b.order)
      break

    case 'EXCEPTION_CASE':
      const exception: ExceptionCase = {
        id: item.id,
        trigger: (structured?.trigger as string) || item.content,
        action: (structured?.action as string) || '',
        escalateTo: structured?.escalateTo as string | undefined,
      }
      profile.process.exceptions.push(exception)
      break

    case 'ESCALATION_TRIGGER':
      profile.process.escalationRules.push(item.content)
      break

    case 'BUSINESS_RULE':
      // Business rules are similar to escalation rules - add to process section
      profile.process.escalationRules.push(`Rule: ${item.content}`)
      break

    case 'DOCUMENT_TYPE':
      // Document types inform the process - add as a case type variant
      const docType: CaseType = {
        id: item.id,
        name: `Document: ${(structured?.name as string) || item.content}`,
        volumePercent: (structured?.volumePercent as number) || 0,
        complexity: 'LOW',
        automatable: true,
        description: item.content,
      }
      profile.process.caseTypes.push(docType)
      break

    case 'CASE_TYPE':
      const caseType: CaseType = {
        id: item.id,
        name: (structured?.name as string) || item.content,
        volumePercent: (structured?.volumePercent as number) || 0,
        complexity: (structured?.complexity as CaseType['complexity']) || 'MEDIUM',
        automatable: (structured?.automatable as boolean) ?? true,
        description: structured?.description as string | undefined,
      }
      profile.process.caseTypes.push(caseType)
      break

    // ========================================
    // Scope Section
    // ========================================
    case 'SCOPE_IN':
      const inScopeItem: ScopeItem = {
        id: item.id,
        statement: item.content,
        conditions: structured?.conditions as string | undefined,
      }
      profile.scope.inScope.push(inScopeItem)
      break

    case 'SCOPE_OUT':
      const outScopeItem: ScopeItem = {
        id: item.id,
        statement: item.content,
        conditions: structured?.conditions as string | undefined,
      }
      profile.scope.outOfScope.push(outScopeItem)
      break

    // ========================================
    // Guardrails Section
    // ========================================
    case 'GUARDRAIL_NEVER':
      profile.guardrails.never.push(item.content)
      break

    case 'GUARDRAIL_ALWAYS':
      profile.guardrails.always.push(item.content)
      break

    case 'FINANCIAL_LIMIT':
      const limit: FinancialLimit = {
        id: item.id,
        type: (structured?.type as string) || item.content.split(':')[0] || 'Limit',
        amount: (structured?.amount as number) || extractAmountFromContent(item.content),
        currency: (structured?.currency as string) || 'EUR',
      }
      profile.guardrails.financialLimits.push(limit)
      break

    case 'LEGAL_RESTRICTION':
    case 'COMPLIANCE_REQUIREMENT':
      profile.guardrails.legalRestrictions.push(item.content)
      break

    // Persona & conversational design types
    case 'PERSONA_TRAIT':
    case 'TONE_RULE':
    case 'DOS_AND_DONTS':
    case 'EXAMPLE_DIALOGUE':
    case 'ESCALATION_SCRIPT':
    case 'DECISION_TREE':
      // These map to the persona section of the business profile
      // Stored in structuredData, not the flat profile fields
      break

    // Monitoring & launch types (handled in technical profile)
    case 'MONITORING_METRIC':
    case 'LAUNCH_CRITERION':
      break

    default:
      // Unknown type - log but don't fail
      console.log(`Unmapped item type: ${item.type}`)
  }
}

/**
 * Extract target value from KPI content string
 */
function extractTargetFromContent(content: string): string {
  // Try to find patterns like "85%", "3 minutes", "€5000"
  const percentMatch = content.match(/(\d+%)/)?.[1]
  if (percentMatch) return percentMatch

  const numberMatch = content.match(/(\d+[\d,]*\s*\w+)/)?.[1]
  if (numberMatch) return numberMatch

  return ''
}

/**
 * Infer channel type from content
 */
function inferChannelType(content: string): Channel['type'] {
  const lower = content.toLowerCase()
  if (lower.includes('email') || lower.includes('mail')) return 'email'
  if (lower.includes('chat') || lower.includes('live')) return 'chat'
  if (lower.includes('phone') || lower.includes('call') || lower.includes('telefoon')) return 'phone'
  if (lower.includes('portal') || lower.includes('web')) return 'portal'
  if (lower.includes('api')) return 'api'
  return 'other'
}

/**
 * Map skill type from ExtractedItemType
 */
function mapSkillType(itemType: string): SkillType {
  const mapping: Record<string, SkillType> = {
    SKILL_ANSWER: 'answer',
    SKILL_ROUTE: 'route',
    SKILL_APPROVE_REJECT: 'approve_reject',
    SKILL_REQUEST_INFO: 'request_info',
    SKILL_NOTIFY: 'notify',
    SKILL_OTHER: 'other',
  }
  return mapping[itemType] || 'other'
}

/**
 * Extract amount from content string
 */
function extractAmountFromContent(content: string): number {
  const match = content.match(/[\d.,]+/)?.[0]
  if (match) {
    return parseFloat(match.replace(',', '.'))
  }
  return 0
}

/**
 * Merge a partial profile update with existing profile
 */
export function mergeProfiles(
  existing: BusinessProfile,
  updates: Partial<BusinessProfile>
): BusinessProfile {
  return {
    identity: {
      ...existing.identity,
      ...updates.identity,
      stakeholders: updates.identity?.stakeholders ?? existing.identity.stakeholders,
    },
    businessContext: {
      ...existing.businessContext,
      ...updates.businessContext,
      peakPeriods: updates.businessContext?.peakPeriods ?? existing.businessContext.peakPeriods,
      painPoints: updates.businessContext?.painPoints ?? existing.businessContext.painPoints,
    },
    kpis: updates.kpis ?? existing.kpis,
    channels: updates.channels ?? existing.channels,
    skills: {
      skills: updates.skills?.skills ?? existing.skills.skills,
      communicationStyle: {
        ...existing.skills.communicationStyle,
        ...updates.skills?.communicationStyle,
        tone:
          updates.skills?.communicationStyle?.tone ?? existing.skills.communicationStyle.tone,
        languages:
          updates.skills?.communicationStyle?.languages ??
          existing.skills.communicationStyle.languages,
      },
    },
    process: {
      happyPathSteps: updates.process?.happyPathSteps ?? existing.process.happyPathSteps,
      exceptions: updates.process?.exceptions ?? existing.process.exceptions,
      escalationRules: updates.process?.escalationRules ?? existing.process.escalationRules,
      caseTypes: updates.process?.caseTypes ?? existing.process.caseTypes,
    },
    scope: {
      inScope: updates.scope?.inScope ?? existing.scope.inScope,
      outOfScope: updates.scope?.outOfScope ?? existing.scope.outOfScope,
    },
    guardrails: {
      never: updates.guardrails?.never ?? existing.guardrails.never,
      always: updates.guardrails?.always ?? existing.guardrails.always,
      financialLimits: updates.guardrails?.financialLimits ?? existing.guardrails.financialLimits,
      legalRestrictions:
        updates.guardrails?.legalRestrictions ?? existing.guardrails.legalRestrictions,
    },
  }
}
