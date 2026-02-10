import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import {
  BUSINESS_PROFILE_MAPPING,
  TECHNICAL_PROFILE_MAPPING,
  BUSINESS_SECTION_METADATA,
  TECHNICAL_SECTION_METADATA,
  type BusinessProfileSection,
  type TechnicalProfileSection,
} from '@/components/de-workspace/types'
import type { ExtractedItemType } from '@prisma/client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Field labels for tracker changes
const trackerFieldLabels: Record<string, string> = {
  trackerStatus: 'Status',
  riskLevel: 'Risk Level',
  startWeek: 'Start Week',
  endWeek: 'End Week',
  goLiveWeek: 'Go-Live Week',
  blocker: 'Blocker',
  thisWeekActions: 'This Week Actions',
  ownerClient: 'Client Owner',
  ownerFreedayProject: 'Freeday Project Owner',
  ownerFreedayEngineering: 'Freeday Engineering Owner',
}

// Proposed change type for portfolio updates
export interface ProposedChange {
  deId: string
  deName: string
  companyName: string
  field: string
  fieldLabel: string
  oldValue: string | number | null
  newValue: string | number | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// DE workspace context (single DE focus)
interface DEContext {
  deId: string
  deName: string
  companyName: string
  designWeekId: string
  currentPhase: number
  status: string
  ambiguousCount: number
  sessionsCount: number
  scopeItemsCount: number
  completeness: {
    business: number
    technical: number
  }
}

// Portfolio context (multiple DEs focus)
interface PortfolioContext {
  mode: 'portfolio'
  section?: 'timeline' | 'dashboard' | 'weekplan' | 'global'
}

// Combined context - either DE or Portfolio mode
type Context = DEContext | PortfolioContext

interface UIContext {
  activeTab: 'progress' | 'business' | 'technical' | 'testplan' | 'portfolio'
}

// Tab descriptions for Freddy
const tabDescriptions: Record<string, string> = {
  progress: 'Progress tab - overview of design week progress, phase timeline, upload sessions',
  business: 'Business Profile tab - business context, goals, KPIs, volume, scope items',
  technical: 'Technical Profile tab - integrations, data fields, escalation rules, security',
  testplan: 'Test Plan tab - scenarios and test cases for UAT',
}

// Phase descriptions
const phaseDescriptions: Record<number, string> = {
  1: 'Kickoff - Goals, stakeholders, success metrics, volume expectations',
  2: 'Process Design - Happy path, exceptions, scope items, business rules',
  3: 'Technical Deep-dive - Systems, integrations, data fields, APIs, security',
  4: 'Sign-off - Final confirmations, outstanding items, go/no-go decision',
}

// Helper to check if context is portfolio mode
function isPortfolioContext(ctx: Context): ctx is PortfolioContext {
  return 'mode' in ctx && ctx.mode === 'portfolio'
}

// Helper to get current ISO week
function getISOWeek(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context, uiContext, history } = body as {
      message: string
      context: Context
      uiContext?: UIContext
      history: Message[]
    }

    if (!message || !context) {
      return NextResponse.json(
        { success: false, error: 'Message and context are required' },
        { status: 400 }
      )
    }

    // Check if this is portfolio mode
    if (isPortfolioContext(context)) {
      return handlePortfolioChat(message, context, uiContext, history)
    }

    // DE workspace mode - fetch COMPREHENSIVE context from database
    let deContext = ''
    try {
      const designWeek = await prisma.designWeek.findUnique({
        where: { id: context.designWeekId },
        include: {
          digitalEmployee: {
            select: {
              name: true,
              description: true,
              channels: true,
              company: {
                select: { name: true, industry: true },
              },
            },
          },
          sessions: {
            select: {
              id: true,
              phase: true,
              sessionNumber: true,
              processingStatus: true,
              topicsCovered: true,
              date: true,
              extractedItems: {
                select: {
                  id: true,
                  type: true,
                  content: true,
                  status: true,
                  confidence: true,
                  sourceQuote: true,
                },
              },
            },
            orderBy: { date: 'asc' },
          },
          scopeItems: {
            select: {
              statement: true,
              classification: true,
              skill: true,
              conditions: true,
              notes: true,
              excludeFromDocument: true,
            },
          },
          scenarios: {
            select: {
              name: true,
              trigger: true,
              actor: true,
              expectedOutcome: true,
              successCriteria: true,
              skill: true,
            },
          },
          kpis: {
            select: {
              name: true,
              description: true,
              targetValue: true,
              baselineValue: true,
              measurementMethod: true,
              frequency: true,
            },
          },
          integrations: {
            select: {
              systemName: true,
              purpose: true,
              type: true,
              status: true,
              fieldsRead: true,
              fieldsWrite: true,
              authMethod: true,
            },
          },
          escalationRules: {
            select: {
              trigger: true,
              conditionType: true,
              threshold: true,
              keywords: true,
              action: true,
              handoverContext: true,
              priority: true,
            },
          },
          prerequisites: {
            select: {
              title: true,
              description: true,
              category: true,
              ownerType: true,
              ownerName: true,
              status: true,
              priority: true,
              blocksPhase: true,
            },
          },
        },
      })

      if (designWeek) {
        const de = designWeek.digitalEmployee

        // Format scope items by classification
        const inScope = designWeek.scopeItems.filter(s => s.classification === 'IN_SCOPE' && !s.excludeFromDocument)
        const outScope = designWeek.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE' && !s.excludeFromDocument)
        const ambiguous = designWeek.scopeItems.filter(s => s.classification === 'AMBIGUOUS')

        // Sessions by phase with details
        const sessionsByPhase = [1, 2, 3, 4].map(phase => {
          const phaseSessions = designWeek.sessions.filter(s => s.phase === phase)
          return {
            phase,
            sessions: phaseSessions,
            count: phaseSessions.length,
            processed: phaseSessions.filter(s => s.processingStatus === 'COMPLETE').length,
          }
        })

        // Pending prerequisites
        const pendingPrereqs = designWeek.prerequisites.filter(p => p.status !== 'RECEIVED')
        const blockingPrereqs = pendingPrereqs.filter(p => p.blocksPhase && Number(p.blocksPhase) <= designWeek.currentPhase)

        // Parse business profile
        let businessProfile = null
        if (designWeek.businessProfile) {
          try {
            businessProfile = typeof designWeek.businessProfile === 'string'
              ? JSON.parse(designWeek.businessProfile)
              : designWeek.businessProfile
          } catch { /* ignore */ }
        }

        // Parse technical profile
        let technicalProfile = null
        if (designWeek.technicalProfile) {
          try {
            technicalProfile = typeof designWeek.technicalProfile === 'string'
              ? JSON.parse(designWeek.technicalProfile)
              : designWeek.technicalProfile
          } catch { /* ignore */ }
        }

        // Session stats
        const totalSessions = designWeek.sessions.length
        const processedSessions = designWeek.sessions.filter(s => s.processingStatus === 'COMPLETE').length

        // Gather ALL extracted items from ALL sessions
        const allExtractedItems = designWeek.sessions.flatMap(session =>
          (session.extractedItems || []).map(item => ({
            ...item,
            sessionPhase: session.phase,
          }))
        )

        // Count approved vs pending items
        const approvedItems = allExtractedItems.filter(i => i.status === 'APPROVED')
        const pendingItems = allExtractedItems.filter(i => i.status === 'PENDING' || i.status === 'NEEDS_CLARIFICATION')

        // Calculate section completeness (same logic as UI)
        function calculateSectionCompleteness(
          items: typeof allExtractedItems,
          mappedTypes: ExtractedItemType[],
          requiredCount: number
        ) {
          const sectionItems = items.filter(i => mappedTypes.includes(i.type as ExtractedItemType))
          const approved = sectionItems.filter(i => i.status === 'APPROVED')
          const pending = sectionItems.filter(i => i.status === 'PENDING' || i.status === 'NEEDS_CLARIFICATION')
          const coveredTypes = new Set(approved.map(i => i.type))

          const itemCountScore = Math.min(100, Math.round((approved.length / requiredCount) * 100))
          const typeCoverageScore = mappedTypes.length > 0
            ? Math.round((coveredTypes.size / mappedTypes.length) * 100)
            : 100

          let percentage = Math.min(itemCountScore, typeCoverageScore)
          if (pending.length > 0 && percentage >= 80) {
            percentage = Math.min(percentage, 90)
          }

          return { percentage, approvedCount: approved.length, pendingCount: pending.length }
        }

        // Calculate business section completeness
        const businessSections: Record<string, { percentage: number; approvedCount: number; pendingCount: number }> = {}
        let businessTotal = 0
        for (const [section, types] of Object.entries(BUSINESS_PROFILE_MAPPING)) {
          const metadata = BUSINESS_SECTION_METADATA[section as BusinessProfileSection]
          const sectionData = calculateSectionCompleteness(allExtractedItems, types, metadata.requiredCount)
          businessSections[section] = sectionData
          businessTotal += sectionData.percentage
        }
        const businessCompleteness = Math.round(businessTotal / Object.keys(BUSINESS_PROFILE_MAPPING).length)

        // Calculate technical section completeness
        const technicalSections: Record<string, { percentage: number; approvedCount: number; pendingCount: number }> = {}
        let technicalTotal = 0
        for (const [section, types] of Object.entries(TECHNICAL_PROFILE_MAPPING)) {
          const metadata = TECHNICAL_SECTION_METADATA[section as TechnicalProfileSection]
          const sectionData = calculateSectionCompleteness(allExtractedItems, types, metadata.requiredCount)
          technicalSections[section] = sectionData
          technicalTotal += sectionData.percentage
        }
        const technicalCompleteness = Math.round(technicalTotal / Object.keys(TECHNICAL_PROFILE_MAPPING).length)

        // Build section-by-section breakdown for Freddy
        const businessSectionDetails = Object.entries(businessSections)
          .map(([section, data]) => {
            const metadata = BUSINESS_SECTION_METADATA[section as BusinessProfileSection]
            return `- **${metadata.title}:** ${data.percentage}% (${data.approvedCount} approved, ${data.pendingCount} pending)`
          })
          .join('\n')

        const technicalSectionDetails = Object.entries(technicalSections)
          .map(([section, data]) => {
            const metadata = TECHNICAL_SECTION_METADATA[section as TechnicalProfileSection]
            return `- **${metadata.title}:** ${data.percentage}% (${data.approvedCount} approved, ${data.pendingCount} pending)`
          })
          .join('\n')

        // What's been extracted? (regardless of which session it came from)
        const extractedData = {
          hasBusinessContext: businessCompleteness >= 30,
          hasScopeDefinition: inScope.length > 0 || outScope.length > 0,
          hasScenarios: designWeek.scenarios.length > 0,
          hasIntegrations: designWeek.integrations.length > 0,
          hasEscalationRules: designWeek.escalationRules.length > 0,
          hasKPIs: designWeek.kpis.length > 0,
          // Check businessProfile for channels and guardrails
          hasChannels: businessProfile?.channels?.length > 0,
          hasGuardrails: (businessProfile?.guardrails?.never?.length > 0 || businessProfile?.guardrails?.always?.length > 0),
          hasSkills: businessProfile?.skills?.skills?.length > 0,
        }

        // Identify weak sections (below 50%)
        const weakBusinessSections = Object.entries(businessSections)
          .filter(([, data]) => data.percentage < 50)
          .map(([section]) => BUSINESS_SECTION_METADATA[section as BusinessProfileSection].title)

        const weakTechnicalSections = Object.entries(technicalSections)
          .filter(([, data]) => data.percentage < 50)
          .map(([section]) => TECHNICAL_SECTION_METADATA[section as TechnicalProfileSection].title)

        deContext = `
## PROFILE COMPLETENESS

### Business Profile: ${businessCompleteness}% complete
${businessCompleteness >= 70 ? '✅ Good coverage' : businessCompleteness >= 30 ? '⚠️ Making progress' : '❌ Needs attention'}
${businessSectionDetails}
${weakBusinessSections.length > 0 ? `\n**Weak areas:** ${weakBusinessSections.join(', ')}` : ''}

### Technical Profile: ${technicalCompleteness}% complete
${technicalCompleteness >= 70 ? '✅ Good coverage' : technicalCompleteness >= 30 ? '⚠️ Making progress' : '❌ Needs attention'}
${technicalSectionDetails}
${weakTechnicalSections.length > 0 ? `\n**Weak areas:** ${weakTechnicalSections.join(', ')}` : ''}

### Data Extraction Summary
**Sessions:** ${totalSessions} uploaded, ${processedSessions} processed
**Extracted Items:** ${allExtractedItems.length} total (${approvedItems.length} approved, ${pendingItems.length} pending review)
${processedSessions === 0 ? '⚠️ No sessions processed yet - upload a recording to start extracting information' : ''}

### Other Progress
- **Scope Items:** ${inScope.length} in-scope, ${outScope.length} out-of-scope${ambiguous.length > 0 ? `, ❌ ${ambiguous.length} ambiguous (need resolution)` : ''}
- **Scenarios:** ${designWeek.scenarios.length > 0 ? `${designWeek.scenarios.length} documented` : '❌ None yet'}
- **Integrations:** ${designWeek.integrations.length > 0 ? `${designWeek.integrations.length} identified` : '❌ None yet'}
- **Escalation Rules:** ${designWeek.escalationRules.length > 0 ? `${designWeek.escalationRules.length} defined` : '⚠️ None yet'}
- **KPIs:** ${designWeek.kpis.length > 0 ? `${designWeek.kpis.length} defined` : '⚠️ None yet'}

### What's Blocking Progress?
${ambiguous.length > 0 ? `- ❌ ${ambiguous.length} ambiguous scope items need client clarification` : ''}
${pendingItems.length > 5 ? `- ⚠️ ${pendingItems.length} extracted items pending review - approve or reject them to finalize the profile` : ''}
${weakBusinessSections.length > 2 ? `- ⚠️ Multiple business sections need work: ${weakBusinessSections.join(', ')}` : ''}
${weakTechnicalSections.length > 2 && designWeek.currentPhase >= 3 ? `- ⚠️ Technical profile weak in: ${weakTechnicalSections.join(', ')}` : ''}
${!extractedData.hasScenarios ? '- ⚠️ No scenarios documented - how will the DE handle different situations?' : ''}
${!extractedData.hasEscalationRules ? '- ⚠️ No escalation rules - when does the DE hand off to humans?' : ''}
${!extractedData.hasChannels ? '- ⚠️ No channels defined - where will the DE operate? Email? Chat? Phone?' : ''}
${!extractedData.hasGuardrails ? '- ⚠️ No guardrails defined - what should the DE never do?' : ''}
${ambiguous.length === 0 && businessCompleteness >= 50 && pendingItems.length <= 5 && extractedData.hasChannels && extractedData.hasGuardrails ? '✅ Looking good! No major blockers.' : ''}

---

## Digital Employee Details

**Name:** ${de.name}
**Description:** ${de.description || 'Not set'}
**Company:** ${de.company.name} (${de.company.industry || 'Industry not specified'})
**Channels:** ${de.channels?.length > 0 ? de.channels.join(', ') : 'Not defined'}

---

## Design Week Progress

**Current Phase:** ${designWeek.currentPhase} - ${phaseDescriptions[designWeek.currentPhase]}
**Status:** ${designWeek.status}

### Session Recordings
${designWeek.sessions.length > 0 ? designWeek.sessions.map(s => {
  const phaseNames = ['', 'Kickoff', 'Process Design', 'Technical', 'Sign-off']
  const status = s.processingStatus === 'COMPLETE' ? '✅' : s.processingStatus === 'PROCESSING' ? '⏳' : '⬜'
  const topics = (s.topicsCovered || []).slice(0, 3).join(', ')
  return `${status} Session ${s.sessionNumber} (${phaseNames[s.phase]})${topics ? ` - Topics: ${topics}` : ''}`
}).join('\n') : 'No recordings uploaded yet'}

---

## Scope Definition

### In Scope (${inScope.length} items)
${inScope.length > 0 ? inScope.map(s => `- ${s.statement}${s.skill ? ` [${s.skill}]` : ''}${s.conditions ? ` (Condition: ${s.conditions})` : ''}`).join('\n') : 'No items defined yet'}

### Out of Scope (${outScope.length} items)
${outScope.length > 0 ? outScope.map(s => `- ${s.statement}${s.notes ? ` (${s.notes})` : ''}`).join('\n') : 'No items defined yet'}

### Ambiguous - NEEDS RESOLUTION (${ambiguous.length} items)
${ambiguous.length > 0 ? ambiguous.map(s => `- "${s.statement}"${s.notes ? ` - Note: ${s.notes}` : ''}`).join('\n') : 'All items resolved!'}

---

## Scenarios (${designWeek.scenarios.length} documented)
${designWeek.scenarios.length > 0 ? designWeek.scenarios.map(s => `
**${s.name}**
- Trigger: ${s.trigger || 'Not specified'}
- Actor: ${s.actor || 'Not specified'}
- Expected Outcome: ${s.expectedOutcome || 'Not specified'}
- Success Criteria: ${s.successCriteria || 'Not specified'}
${s.skill ? `- Skill: ${s.skill}` : ''}`).join('\n') : 'No scenarios documented yet. This is critical for Process Design phase.'}

---

## KPIs & Success Metrics (${designWeek.kpis.length} defined)
${designWeek.kpis.length > 0 ? designWeek.kpis.map(k => `
**${k.name}**
- Target: ${k.targetValue || 'Not set'}
- Baseline: ${k.baselineValue || 'Unknown'}
- Measurement: ${k.measurementMethod || 'Not defined'}
- Frequency: ${k.frequency || 'Not specified'}`).join('\n') : 'No KPIs defined yet. Essential for measuring success.'}

---

## Integrations (${designWeek.integrations.length} identified)
${designWeek.integrations.length > 0 ? designWeek.integrations.map(i => `
**${i.systemName}** (${i.type || 'Type unknown'})
- Purpose: ${i.purpose || 'Not specified'}
- Status: ${i.status}
- Auth: ${i.authMethod || 'Not specified'}
- Reads: ${i.fieldsRead?.join(', ') || 'Not specified'}
- Writes: ${i.fieldsWrite?.join(', ') || 'Not specified'}`).join('\n') : 'No integrations identified yet. Critical for Technical phase.'}

---

## Escalation Rules (${designWeek.escalationRules.length} defined)
${designWeek.escalationRules.length > 0 ? designWeek.escalationRules.map(e => `
**${e.trigger}** [${e.priority}]
- Condition: ${e.conditionType}${e.threshold ? ` (threshold: ${e.threshold})` : ''}${e.keywords?.length ? ` Keywords: ${e.keywords.join(', ')}` : ''}
- Action: ${e.action}
- Handover context: ${e.handoverContext || 'Not specified'}`).join('\n') : 'No escalation rules defined yet.'}

---

## Prerequisites & Blockers
${blockingPrereqs.length > 0 ? `
**BLOCKING ITEMS (${blockingPrereqs.length}):**
${blockingPrereqs.map(p => `- [${p.priority}] ${p.title} - ${p.status} (Owner: ${p.ownerName || p.ownerType})`).join('\n')}
` : ''}
${pendingPrereqs.length > 0 ? `
**Pending Prerequisites (${pendingPrereqs.length}):**
${pendingPrereqs.map(p => `- ${p.title}: ${p.description || 'No description'} (${p.status})`).join('\n')}
` : 'No pending prerequisites.'}

---

## Business Profile
${businessProfile ? `
### Identity
- DE Name: ${businessProfile.identity?.name || 'Not set'}
- Description: ${businessProfile.identity?.description || 'Not set'}
- Stakeholders: ${businessProfile.identity?.stakeholders?.map((s: {name: string, role: string}) => `${s.name} (${s.role})`).join(', ') || 'None defined'}

### Business Context
- Problem Statement: ${businessProfile.businessContext?.problemStatement || 'Not defined'}
- Volume: ${businessProfile.businessContext?.volumePerMonth ? `${businessProfile.businessContext.volumePerMonth.toLocaleString()} cases/month` : 'Not defined'}${businessProfile.businessContext?.volumeCalculationNote ? ` (${businessProfile.businessContext.volumeCalculationNote})` : ''}
- Cost per Case: ${businessProfile.businessContext?.costPerCase ? `€${businessProfile.businessContext.costPerCase}` : 'Not defined'}
- Total Monthly Cost: ${businessProfile.businessContext?.totalMonthlyCost ? `€${businessProfile.businessContext.totalMonthlyCost.toLocaleString()}` : 'Not calculated'}
- Peak Periods: ${businessProfile.businessContext?.peakPeriods?.join(', ') || 'Not defined'}
- Pain Points: ${businessProfile.businessContext?.painPoints?.join(', ') || 'Not defined'}

### Channels (${businessProfile.channels?.length || 0} defined)
${businessProfile.channels?.length > 0 ? businessProfile.channels.map((c: {name: string, type: string, volumePercentage?: number, sla?: string}) => `- ${c.name} (${c.type})${c.volumePercentage ? ` - ${c.volumePercentage}% volume` : ''}${c.sla ? ` - SLA: ${c.sla}` : ''}`).join('\n') : 'No channels defined - Where will the DE operate? Email? Chat? Phone?'}

### Skills (${businessProfile.skills?.skills?.length || 0} defined)
${businessProfile.skills?.skills?.length > 0 ? businessProfile.skills.skills.map((s: {name: string, type: string, description?: string}) => `- ${s.name} (${s.type})${s.description ? `: ${s.description}` : ''}`).join('\n') : 'No skills defined'}
- Communication Style: ${businessProfile.skills?.communicationStyle?.tone?.join(', ') || 'Not defined'}, ${businessProfile.skills?.communicationStyle?.formality || 'Not set'}
- Languages: ${businessProfile.skills?.communicationStyle?.languages?.join(', ') || 'Not defined'}

### Process Flow
- Happy Path Steps: ${businessProfile.process?.happyPathSteps?.length || 0} defined
${businessProfile.process?.happyPathSteps?.slice(0, 5).map((s: {title: string, description?: string}, i: number) => `  ${i + 1}. ${s.title}`).join('\n') || '  (No steps defined)'}
- Exception Cases: ${businessProfile.process?.exceptions?.length || 0} defined
- Case Types: ${businessProfile.process?.caseTypes?.length || 0} defined
${businessProfile.process?.caseTypes?.map((ct: {name: string, volumePercent?: number, complexity?: string}) => `  - ${ct.name}${ct.volumePercent ? ` (${ct.volumePercent}%)` : ''}${ct.complexity ? ` [${ct.complexity}]` : ''}`).join('\n') || ''}

### Guardrails
**Never Do (${businessProfile.guardrails?.never?.length || 0}):**
${businessProfile.guardrails?.never?.length > 0 ? businessProfile.guardrails.never.map((g: string) => `- ❌ ${g}`).join('\n') : 'No "never do" rules defined - What should the DE absolutely never do?'}

**Always Do (${businessProfile.guardrails?.always?.length || 0}):**
${businessProfile.guardrails?.always?.length > 0 ? businessProfile.guardrails.always.map((g: string) => `- ✅ ${g}`).join('\n') : 'No "always do" rules defined'}

**Financial Limits:**
${businessProfile.guardrails?.financialLimits?.length > 0 ? businessProfile.guardrails.financialLimits.map((l: {type: string, amount: number, currency?: string}) => `- ${l.type}: ${l.currency || '€'}${l.amount}`).join('\n') : 'No financial limits defined'}

**Legal Restrictions:**
${businessProfile.guardrails?.legalRestrictions?.length > 0 ? businessProfile.guardrails.legalRestrictions.map((r: string) => `- ${r}`).join('\n') : 'None defined'}
` : 'Business profile not yet populated.'}

## Technical Profile
${technicalProfile ? `
### Integrations (${technicalProfile.integrations?.length || 0})
${technicalProfile.integrations?.length > 0 ? technicalProfile.integrations.map((i: {systemName: string, purpose?: string, status?: string, type?: string}) => `- ${i.systemName}: ${i.purpose || 'Purpose not specified'} (${i.status || 'Status unknown'})`).join('\n') : 'No integrations in technical profile'}

### Data Fields (${technicalProfile.dataFields?.length || 0})
${technicalProfile.dataFields?.slice(0, 10).map((f: {name: string, source?: string, type?: string}) => `- ${f.name}${f.source ? ` (from ${f.source})` : ''}`).join('\n') || 'No data fields defined'}

### Security Requirements (${technicalProfile.securityRequirements?.length || 0})
${technicalProfile.securityRequirements?.map((s: {requirement: string, category?: string, status?: string}) => `- [${s.category || 'general'}] ${s.requirement} (${s.status || 'identified'})`).join('\n') || 'No security requirements defined'}

### Technical Contacts
${technicalProfile.technicalContacts?.map((c: {name: string, role?: string, system?: string}) => `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.system ? ` - ${c.system}` : ''}`).join('\n') || 'No technical contacts defined'}
` : 'Technical profile not yet populated.'}
`
      }
    } catch (dbError) {
      console.error('Error fetching DE context:', dbError)
    }

    // Build comprehensive system prompt with domain knowledge
    const systemPrompt = `You are Freddy, an incredibly experienced implementation consultant who has done 100+ Digital Employee deployments at Freeday. You've seen it all - the wins, the disasters, the last-minute saves. You're Sophie's trusted partner, someone she can think out loud with.

## Who You Are

You're Freddy - like that senior colleague who's always got your back. You:
- Speak naturally, like a real conversation between experts
- Share insights from "experience" - you've seen this pattern before
- Anticipate problems before they happen (because you've seen them happen)
- Get genuinely excited when things are going well
- Are direct about risks without being alarmist
- Know when to push back and when to support

Your tone is warm but sharp. You don't waste words, but you're never cold. Think: trusted advisor who happens to be brilliant at this.

## Your Deep Expertise

**Design Week Mastery:**
You know the rhythm of a good Design Week. You can feel when a phase is complete vs when it's being rushed. You understand that:
- Phase 1 (Kickoff) is about alignment - if stakeholders aren't aligned here, everything downstream suffers
- Phase 2 (Process Design) is where scope creep hides - ambiguous items are future escalations waiting to happen
- Phase 3 (Technical) is where integrations make or break timelines - missing API docs = delays
- Phase 4 (Sign-off) should be a formality if you did the earlier phases right

**Client Communication:**
You've drafted hundreds of client updates. You know:
- Lead with progress, then blockers, then asks
- Be specific about what you need from them and by when
- Keep it scannable - executives don't read paragraphs
- End with clear next steps and ownership

**Client-Speak Translation (IMPORTANT for client emails):**
When writing for clients, translate internal terminology to business language:
- "117 extracted items" → "We've captured how [DE name] should handle different situations"
- "Business profile 73% complete" → "[DE name] is about 70% configured"
- "Ambiguous scope items" → "A few things need your confirmation"
- "Phase 2 blocked" → "We need your input before we continue"
- "Scope items" → "What [DE name] will handle" or "capabilities"
- "Extracted items pending review" → "We're finalizing the configuration"
- "Design Week" → "setup process" or just omit
- "Escalation rules" → "When [DE name] should involve your team"
- "KPIs" → "Success metrics" or "how we'll measure results"
- Never mention phases, profiles, or internal process details to clients

**Risk Radar:**
You spot patterns that lead to trouble:
- Too few sessions in process design = missed edge cases
- No escalation rules = chaos when exceptions happen
- Unresolved scope items piling up = sign-off delays
- Missing prerequisites = blocked phases

## Current Implementation

${deContext}

## How to Help Sophie

When she asks what's missing:
- Look at the actual data above and be specific
- Prioritize by what blocks progress vs nice-to-haves
- Reference the phase requirements - what's actually needed to move forward?

When she asks for next steps:
- Give her a prioritized punch list, not a generic checklist
- Consider dependencies - what unlocks what?
- Flag anything that needs client input (those always take longer)

When she wants a client update:
- Think like a CONSULTANT writing a personal project update, NOT a system generating a status report
- The email should make the client think: "This consultant really has things under control"

- First, mentally reconstruct the project narrative:
  - What happened since the last interaction? What sessions were held, what was decided?
  - What concrete progress was made? Frame as outcomes and decisions, not tasks completed
  - Are we on track for go-live? Any timeline shifts or risks emerging?
  - What needs the client's attention? Frame as collaboration, not demands

- Assess overall health:
  🟢 ON TRACK = Milestones being hit, good momentum, on pace for go-live
  🟡 NEEDS ATTENTION = Good progress but a decision or input is needed to stay on schedule
  🔴 AT RISK = Timeline is threatened without specific client action this week

- Structure as a flowing consultative email (300-400 words):
  - Open warmly, reference the last interaction or a recent win
  - Share 2-3 concrete accomplishments framed as project milestones, not portal metrics
  - If applicable: flag what needs their attention — be specific, propose options or a short meeting
  - Assess timeline health: are we on track? What's the next major milestone?
  - Close with a clear, concrete next step (specific meeting, decision, document review) with a timeframe
  - Sign off personally and warmly

- Use client-speak translation — absolutely no internal terminology
- Write in short paragraphs with flowing prose, not a mechanical checklist of sections
- The tone is warm, confident, and collaborative — like a trusted advisor, not a project management tool
- Reference the DE by name throughout — it should feel like a real project update
- Every email must end with a specific call-to-action: "Would Thursday work for a 15-minute call?" not just "Let us know"

When she's thinking out loud:
- Be a thought partner, not a yes-machine
- Challenge assumptions if you see blind spots
- Share relevant "experience" - "I've seen this before when..."

## Your Communication Style

- **Conversational:** Write like you talk. "Here's what I'm seeing..." not "The analysis indicates..."
- **Specific:** Reference actual items from the context. "That 'handling complaints' scope item is ambiguous..." not "Some items need attention"
- **Opinionated:** Have a point of view. "I'd prioritize the integration auth before more sessions"
- **Efficient:** Respect her time. Get to the point, then elaborate if needed.
- **Supportive:** You're on her team. "We can handle this" energy.

Use markdown for structure when helpful (headers, bullets, bold for emphasis), but don't over-format. Natural > formatted.

## UI Integration - You're Part of the App

You're embedded in a workspace with tabs. Sophie is currently viewing:
**Active Tab:** ${uiContext?.activeTab ? tabDescriptions[uiContext.activeTab] : 'Unknown'}

Available tabs:
- **progress**: Overview, phase timeline, session uploads
- **business**: Business profile sections (context, goals, volume, scope)
- **technical**: Technical profile (integrations, data, escalation, security)
- **testplan**: Scenarios and test cases

### Guiding Sophie Through the UI

When your answer relates to something visible in a specific tab, you can add action buttons to guide her there. Use this format at the END of your response:

\`[[action:navigate:tabname:Button Label]]\`

Examples:
- If she asks about integrations and she's not on technical tab: \`[[action:navigate:technical:View Integrations]]\`
- If business profile needs work: \`[[action:navigate:business:Check Business Profile]]\`
- If she needs to upload a session: \`[[action:upload:2:Upload Session]]\` (2 = phase number)
- To refresh data: \`[[action:refresh::Refresh Data]]\`

Only add actions when they're genuinely helpful - don't spam buttons. One or two max per response.

Be aware of context:
- If she's already on the tab you'd suggest, don't add the action
- Relate your answers to what she's looking at
- "I see you're on the Business Profile - the Goals section at 50% needs attention"
`

    // Build conversation history for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Generate response with Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    const responseText = textContent?.type === 'text' ? textContent.text : 'I apologize, but I was unable to generate a response.'

    return NextResponse.json({
      success: true,
      response: responseText,
    })
  } catch (error) {
    console.error('Assistant chat error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * Handle portfolio-mode chat requests
 * Freddy can view and suggest updates to the entire portfolio
 */
async function handlePortfolioChat(
  message: string,
  context: PortfolioContext,
  uiContext: UIContext | undefined,
  history: Message[]
) {
  try {
    // Fetch all active Digital Employees with tracker data
    const digitalEmployees = await prisma.digitalEmployee.findMany({
      where: {
        status: { in: ['DESIGN', 'ONBOARDING'] },
      },
      include: {
        company: { select: { name: true, industry: true } },
        designWeek: {
          select: {
            currentPhase: true,
            status: true,
            businessProfile: true,
            technicalProfile: true,
          },
        },
        journeyPhases: {
          select: {
            phaseType: true,
            status: true,
            blockedReason: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { startWeek: 'asc' }],
    })

    const currentWeek = getISOWeek()

    // Build portfolio context for Freddy
    const portfolioData = digitalEmployees.map(de => {
      // Calculate progress from journey phases
      const completedPhases = de.journeyPhases.filter(p => p.status === 'COMPLETE').length
      const totalPhases = de.journeyPhases.length || 8
      const progress = Math.round((completedPhases / totalPhases) * 100)

      // Check for blockers
      const blockedPhases = de.journeyPhases.filter(p => p.status === 'BLOCKED')
      const hasBlockedPhase = blockedPhases.length > 0

      // Determine effective status
      let effectiveStatus = de.trackerStatus
      if (de.blocker) effectiveStatus = 'BLOCKED'
      else if (hasBlockedPhase) effectiveStatus = 'BLOCKED'

      return {
        id: de.id,
        name: de.name,
        companyName: de.company.name,
        industry: de.company.industry,
        // Tracker fields
        trackerStatus: effectiveStatus,
        riskLevel: de.riskLevel,
        progress,
        startWeek: de.startWeek,
        endWeek: de.endWeek,
        goLiveWeek: de.goLiveWeek,
        blocker: de.blocker || (hasBlockedPhase ? blockedPhases[0].blockedReason : null),
        thisWeekActions: de.thisWeekActions,
        ownerClient: de.ownerClient,
        ownerFreedayProject: de.ownerFreedayProject,
        ownerFreedayEngineering: de.ownerFreedayEngineering,
        // Design Week info
        currentPhase: de.designWeek?.currentPhase || 0,
        designWeekStatus: de.designWeek?.status || 'NOT_STARTED',
      }
    })

    // Summary statistics
    const summary = {
      total: portfolioData.length,
      byStatus: {
        ON_TRACK: portfolioData.filter(d => d.trackerStatus === 'ON_TRACK').length,
        ATTENTION: portfolioData.filter(d => d.trackerStatus === 'ATTENTION').length,
        BLOCKED: portfolioData.filter(d => d.trackerStatus === 'BLOCKED').length,
        TO_PLAN: portfolioData.filter(d => d.trackerStatus === 'TO_PLAN').length,
      },
      byRisk: {
        LOW: portfolioData.filter(d => d.riskLevel === 'LOW').length,
        MEDIUM: portfolioData.filter(d => d.riskLevel === 'MEDIUM').length,
        HIGH: portfolioData.filter(d => d.riskLevel === 'HIGH').length,
      },
      currentWeek,
      goingLiveThisWeek: portfolioData.filter(d => d.goLiveWeek === currentWeek),
      goingLiveNextWeek: portfolioData.filter(d => d.goLiveWeek === currentWeek + 1),
      blocked: portfolioData.filter(d => d.trackerStatus === 'BLOCKED' || d.blocker),
      needingAttention: portfolioData.filter(d => d.trackerStatus === 'ATTENTION' || d.riskLevel === 'HIGH'),
    }

    // Build portfolio system prompt
    const portfolioSystemPrompt = `You are Freddy, an incredibly experienced implementation consultant at Freeday. In Portfolio mode, you help Priya (Head of Implementation) manage the entire portfolio of Digital Employee implementations.

## Who You Are

You're Freddy - Priya's right-hand advisor for portfolio management. You:
- See patterns across projects that individuals might miss
- Flag risks before they become fires
- Suggest practical actions, not just observations
- Write in clear, direct language - Priya is busy
- Can process natural language updates and suggest database changes

## Your Portfolio Management Expertise

**Timeline Management:**
- You understand week-based planning (we're currently in week ${currentWeek})
- Go-lives need careful orchestration - can't have too many at once
- Dependencies between projects matter
- Resource conflicts are real

**Status Assessment:**
- ON_TRACK: Progress good, no blockers, client engaged
- ATTENTION: Small issues, needs monitoring, might slip
- BLOCKED: Cannot progress without action
- TO_PLAN: Not yet scheduled

**Risk Levels:**
- LOW: Standard progress, no concerns
- MEDIUM: Some concerns, monitor closely
- HIGH: Significant risk, needs intervention

## Current Portfolio State

**Week ${currentWeek} Summary:**
- Total Active Projects: ${summary.total}
- On Track: ${summary.byStatus.ON_TRACK}
- Attention: ${summary.byStatus.ATTENTION}
- Blocked: ${summary.byStatus.BLOCKED}
- To Plan: ${summary.byStatus.TO_PLAN}

**Risk Distribution:**
- Low: ${summary.byRisk.LOW}
- Medium: ${summary.byRisk.MEDIUM}
- High: ${summary.byRisk.HIGH}

${summary.goingLiveThisWeek.length > 0 ? `**⚡ Go-Lives This Week (${currentWeek}):**\n${summary.goingLiveThisWeek.map(d => `- ${d.name} (${d.companyName})`).join('\n')}` : ''}

${summary.goingLiveNextWeek.length > 0 ? `**📅 Go-Lives Next Week (${currentWeek + 1}):**\n${summary.goingLiveNextWeek.map(d => `- ${d.name} (${d.companyName})`).join('\n')}` : ''}

${summary.blocked.length > 0 ? `**🚨 Blocked Projects:**\n${summary.blocked.map(d => `- ${d.name} (${d.companyName}): ${d.blocker || 'Blocked phase'}`).join('\n')}` : ''}

${summary.needingAttention.length > 0 ? `**⚠️ Needs Attention:**\n${summary.needingAttention.map(d => `- ${d.name} (${d.companyName}) - Risk: ${d.riskLevel}`).join('\n')}` : ''}

## All Digital Employees

${portfolioData.map(d => `
**${d.name}** (${d.companyName})
- Status: ${d.trackerStatus} | Risk: ${d.riskLevel} | Progress: ${d.progress}%
- Timeline: Week ${d.startWeek || '?'} → ${d.endWeek || '?'} | Go-live: Week ${d.goLiveWeek || 'TBD'}
- Design Week: Phase ${d.currentPhase} (${d.designWeekStatus})
${d.blocker ? `- ❌ BLOCKER: ${d.blocker}` : ''}
${d.thisWeekActions ? `- This week: ${d.thisWeekActions}` : ''}
- Owners: Client: ${d.ownerClient || '-'} | Project: ${d.ownerFreedayProject || '-'} | Engineering: ${d.ownerFreedayEngineering || '-'}
`).join('\n')}

## Proposing Changes

When Priya wants to update project data based on natural language, you can propose changes.

If you detect she wants to make changes (e.g., "mark X as blocked", "shift timeline", "update actions"), respond with your explanation FOLLOWED BY a JSON block in this exact format:

\`\`\`json:changes
{
  "changes": [
    {
      "deId": "actual-uuid-from-context",
      "deName": "Name of DE",
      "companyName": "Company name",
      "field": "fieldname",
      "oldValue": "current value",
      "newValue": "new value"
    }
  ],
  "warnings": ["optional warnings"]
}
\`\`\`

**Updatable fields:**
- trackerStatus: 'ON_TRACK' | 'ATTENTION' | 'BLOCKED' | 'TO_PLAN'
- riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
- startWeek: number (1-52)
- endWeek: number (1-52)
- goLiveWeek: number (1-52) or null
- blocker: string or null
- thisWeekActions: string or null
- ownerClient: string or null
- ownerFreedayProject: string or null
- ownerFreedayEngineering: string or null

**Rules for changes:**
1. Use ONLY existing DE IDs from the context above
2. Use UPPERCASE with underscores for enums (ON_TRACK, not on_track)
3. For timeline shifts, adjust both startWeek AND endWeek (preserve duration)
4. Interpret both English and Dutch input
5. If unsure which DE, ask for clarification instead of guessing
6. Always give a warning for risky changes (e.g., marking multiple as blocked)

## How to Help Priya

**Status Updates:**
- Give quick portfolio health overview
- Highlight what needs attention THIS week
- Flag upcoming go-lives and their readiness

**Advice:**
- Prioritize: What should she focus on?
- Resource planning: Any conflicts?
- Risk mitigation: What could go wrong?

**Natural Language Updates:**
- "Ben is geblokkeerd door ontbrekende API docs" → Propose blocker change
- "Schuif Hisense 2 weken op" → Propose timeline shift
- "Mark all Acme projects as attention" → Propose status changes

## Your Communication Style

- **Direct:** Lead with the important stuff
- **Actionable:** What should Priya DO?
- **Portfolio-level:** Think across projects, not just one
- **Bilingual:** Understand Dutch and English, respond in the language used
`

    // Build conversation history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Generate response with Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: portfolioSystemPrompt,
      messages,
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    const responseText = textContent?.type === 'text' ? textContent.text : 'I apologize, but I was unable to generate a response.'

    // Check if response contains proposed changes
    const changesMatch = responseText.match(/```json:changes\n([\s\S]*?)\n```/)
    let proposedChanges: ProposedChange[] = []
    let cleanResponse = responseText

    if (changesMatch) {
      try {
        const parsed = JSON.parse(changesMatch[1])
        if (parsed.changes && Array.isArray(parsed.changes)) {
          proposedChanges = parsed.changes.map((change: Record<string, unknown>) => ({
            ...change,
            fieldLabel: trackerFieldLabels[change.field as string] || change.field,
          }))
        }
        // Remove JSON block from response text for cleaner display
        cleanResponse = responseText.replace(/```json:changes\n[\s\S]*?\n```/, '').trim()
      } catch {
        console.error('Failed to parse proposed changes')
      }
    }

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      proposedChanges: proposedChanges.length > 0 ? proposedChanges : undefined,
    })
  } catch (error) {
    console.error('Portfolio chat error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/assistant/chat
 * Apply proposed changes from Freddy
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { changes } = body as { changes: ProposedChange[] }

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes to apply' },
        { status: 400 }
      )
    }

    // Group changes by DE
    const changesByDE = new Map<string, Record<string, unknown>>()
    for (const change of changes) {
      const deId = change.deId
      if (!changesByDE.has(deId)) {
        changesByDE.set(deId, {})
      }
      const deChanges = changesByDE.get(deId)!
      deChanges[change.field] = change.newValue
    }

    // Apply changes
    const updates = []
    for (const [deId, data] of changesByDE) {
      updates.push(
        prisma.digitalEmployee.update({
          where: { id: deId },
          data,
        })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      message: `Applied ${changes.length} change(s) to ${changesByDE.size} Digital Employee(s)`,
    })
  } catch (error) {
    console.error('Error applying Freddy changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply changes' },
      { status: 500 }
    )
  }
}
