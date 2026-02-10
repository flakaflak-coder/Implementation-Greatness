/**
 * LLM-Powered Document Generation Pipeline
 *
 * Creates comprehensive, client-facing Digital Employee design documents
 * with extensive narratives, analysis, and professional presentation.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DEDesignDocument } from './types'
import { extractJson } from '../prompt-utils'
import {
  LANGUAGE_NAMES,
  buildLanguageInstruction,
  PERSONA_SECTION,
  buildProjectContext,
  buildExtractedDataSection,
  JSON_SCHEMA_SECTION,
  buildWritingGuidelines,
  QUALITY_REQUIREMENTS_SECTION,
} from './prompt-sections'

// Supported languages for document generation
export type DocumentLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es'

// Re-export for backwards compatibility
export { LANGUAGE_NAMES }

interface GenerationContext {
  companyName: string
  digitalEmployeeName: string
  deDescription?: string
  extractedData: {
    stakeholders: Array<{ name: string; role: string; email?: string }>
    goals: Array<{ title: string; description: string }>
    kpis: Array<{ name: string; target: string; unit?: string; owner?: string; alertThreshold?: string }>
    volumes: Array<{ metric: string; value: string; period: string }>
    processSteps: Array<{ stepNumber: number; name: string; description: string }>
    exceptions: Array<{ name: string; description: string; handling: string }>
    inScope: Array<{ description: string; skill?: string; conditions?: string }>
    outOfScope: Array<{ description: string; notes?: string }>
    guardrails: Array<{ type: string; description: string }>
    integrations: Array<{ systemName: string; purpose: string; connectionType: string }>
    businessRules: Array<{ name: string; condition: string; action: string }>
    securityRequirements: string[]
    channels: string[]
    // New persona/monitoring/launch data
    personaTraits: Array<{ name: string; description: string; examplePhrase?: string }>
    escalationScripts: Array<{ context: string; script: string }>
    monitoringMetrics: Array<{ name: string; target: string; owner?: string; perspective?: string }>
    launchCriteria: Array<{ criterion: string; phase?: string; owner?: string }>
  }
  language: DocumentLanguage
}

// Generation metadata for audit trails and debugging
export interface GenerationMetadata {
  generatedAt: string
  model: string
  isFallback: boolean
  sourceItemCount: number
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
}

// Comprehensive generated content structure
export interface GeneratedContent {
  // Executive Summary Section
  executiveSummary: {
    opening: string // Compelling opening statement
    overview: string // 3-4 paragraphs explaining the initiative
    keyObjectives: string[] // 5-7 detailed objectives
    valueProposition: string // Strong value proposition
    expectedOutcomes: string[] // Quantified expected outcomes
  }

  // Current State Analysis
  currentStateAnalysis: {
    introduction: string
    challenges: Array<{ challenge: string; impact: string; frequency: string }>
    inefficiencies: string
    opportunityCost: string
  }

  // Future State Vision
  futureStateVision: {
    introduction: string
    transformationNarrative: string
    dayInTheLife: string // A day-in-the-life scenario
    benefits: Array<{ benefit: string; description: string; metric?: string }>
  }

  // Detailed Process Analysis
  processAnalysis: {
    introduction: string
    processOverview: string
    stepByStepNarrative: string // Detailed walkthrough of each step
    automationBenefits: string
    exceptionHandlingApproach: string
    humanMachineCollaboration: string
  }

  // Scope & Boundaries
  scopeAnalysis: {
    introduction: string
    inScopeRationale: string
    outOfScopeRationale: string
    guardrailsExplanation: string
    boundaryManagement: string
  }

  // Technical Foundation
  technicalFoundation: {
    introduction: string
    architectureOverview: string
    integrationStrategy: string
    dataFlowNarrative: string
    securityApproach: string
  }

  // Risk Assessment
  riskAssessment: {
    introduction: string
    risks: Array<{
      risk: string
      likelihood: 'Low' | 'Medium' | 'High'
      impact: 'Low' | 'Medium' | 'High'
      mitigation: string
    }>
    overallRiskPosture: string
  }

  // Implementation Approach
  implementationApproach: {
    introduction: string
    phases: Array<{ phase: string; description: string; deliverables: string[] }>
    successFactors: string[]
    changeManagement: string
    trainingPlan: {
      overview: string
      sessions: Array<{
        topic: string
        audience: string
        duration: string
        deliveryMethod: string
        keyContent: string[]
      }>
      materials: string[]
      supportPlan: string
    }
  }

  // Success Metrics
  successMetrics: {
    introduction: string
    kpiNarrative: string
    measurementApproach: string
    reportingCadence: string
  }

  // Conclusion & Next Steps
  conclusion: {
    summary: string
    callToAction: string
    nextSteps: Array<{ step: string; owner: string; timeline: string }>
    closingStatement: string
  }

  // Quick Reference Card (1-page summary for frontline teams)
  quickReference: {
    agentName: string
    purpose: string
    canDo: string[]
    cannotDo: string[]
    escalationTriggers: Array<{
      trigger: string
      action: string
      contactMethod: string
    }>
    keyContacts: Array<{
      role: string
      name: string
      responsibility: string
    }>
    quickTips: string[]
  }

  // Executive One-Pager (standalone summary for leadership)
  executiveOnePager: {
    headline: string
    problem: string
    solution: string
    keyBenefits: Array<{ benefit: string; metric: string }>
    investment: string
    timeline: string
    bottomLine: string
  }

  // Process Flow Summary
  processFlowSummary: {
    happyPathFlow: string
    escalationFlow: string
    decisionPoints: Array<{
      point: string
      options: string[]
      criteria: string
    }>
  }

  // Generation metadata (added by system, not LLM)
  _metadata?: GenerationMetadata
}

const anthropic = new Anthropic()

/**
 * Master prompt for generating comprehensive document content
 *
 * Uses modularized sections from prompt-sections.ts for easier maintenance.
 * See that file for individual section definitions.
 */
function buildGenerationPrompt(ctx: GenerationContext): string {
  const languageInstruction = buildLanguageInstruction(ctx.language)

  return `${PERSONA_SECTION}${languageInstruction}

${buildProjectContext(ctx.companyName, ctx.digitalEmployeeName, ctx.deDescription)}

${buildExtractedDataSection(ctx.extractedData)}

${JSON_SCHEMA_SECTION}

${buildWritingGuidelines(ctx.companyName)}

${QUALITY_REQUIREMENTS_SECTION}`
}

const DOCUMENT_GENERATION_MODEL = 'claude-sonnet-4-20250514'

/**
 * Validate that generated KPIs match extracted KPIs
 * Returns warnings for any fabricated metrics
 */
function validateKPIConsistency(
  generated: GeneratedContent,
  extractedKPIs: Array<{ name: string; target: string }>
): string[] {
  const warnings: string[] = []
  const extractedKPINames = new Set(extractedKPIs.map((k) => k.name.toLowerCase()))
  const extractedTargets = new Set(extractedKPIs.map((k) => k.target.toLowerCase()))

  // Check executive summary expected outcomes for ungrounded metrics
  if (generated.executiveSummary?.expectedOutcomes) {
    for (const outcome of generated.executiveSummary.expectedOutcomes) {
      // Look for percentage claims
      const percentMatch = outcome.match(/(\d+)%/)
      if (percentMatch) {
        const hasMatchingTarget = extractedKPIs.some(
          (k) => k.target.includes(percentMatch[1]) || k.target.includes('%')
        )
        if (!hasMatchingTarget && extractedKPIs.length > 0) {
          warnings.push(`Ungrounded metric in outcomes: "${outcome}" - no matching extracted KPI`)
        }
      }
    }
  }

  // Check executive one-pager benefits
  if (generated.executiveOnePager?.keyBenefits) {
    for (const benefit of generated.executiveOnePager.keyBenefits) {
      if (benefit.metric && extractedKPIs.length > 0) {
        const metricLower = benefit.metric.toLowerCase()
        const hasMatch = Array.from(extractedTargets).some(
          (t) => metricLower.includes(t) || t.includes(metricLower.split(' ')[0])
        )
        if (!hasMatch) {
          warnings.push(`Ungrounded metric in one-pager: "${benefit.benefit}: ${benefit.metric}"`)
        }
      }
    }
  }

  return warnings
}

/**
 * Generate comprehensive document content using LLM
 */
export async function generateDocumentContent(ctx: GenerationContext): Promise<GeneratedContent> {
  const prompt = buildGenerationPrompt(ctx)
  const startTime = Date.now()

  try {
    console.log(`[Document Generation] Starting comprehensive generation for ${ctx.digitalEmployeeName}...`)

    const response = await anthropic.messages.create({
      model: DOCUMENT_GENERATION_MODEL,
      max_tokens: 8000, // Optimized for 12-15 page document
      temperature: 0.5, // Balanced creativity and consistency
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const latencyMs = Date.now() - startTime

    // Extract the text content
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response')
    }

    // Parse the JSON response using improved extraction
    const generated = extractJson<GeneratedContent>(textContent.text)
    if (!generated) {
      console.error('[Document Generation] Failed to parse JSON from response')
      console.error('[Document Generation] Response text:', textContent.text.substring(0, 500) + '...')
      throw new Error('Could not parse JSON from response')
    }

    // Validate KPI consistency
    const kpiWarnings = validateKPIConsistency(generated, ctx.extractedData.kpis)
    if (kpiWarnings.length > 0) {
      console.warn('[Document Generation] KPI validation warnings:', kpiWarnings)
    }

    // Count source items
    const sourceItemCount =
      ctx.extractedData.stakeholders.length +
      ctx.extractedData.goals.length +
      ctx.extractedData.kpis.length +
      ctx.extractedData.processSteps.length +
      ctx.extractedData.integrations.length

    // Add metadata
    generated._metadata = {
      generatedAt: new Date().toISOString(),
      model: DOCUMENT_GENERATION_MODEL,
      isFallback: false,
      sourceItemCount,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
    }

    console.log(`[Document Generation] Generated comprehensive content successfully`)
    console.log(
      `[Document Generation] Tokens: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`
    )

    return generated
  } catch (error) {
    console.error('[Document Generation] Error:', error)
    // Return fallback content with clear indicator
    return generateFallbackContent(ctx, Date.now() - startTime)
  }
}

/**
 * Build expected outcomes from extracted KPIs or use honest placeholders
 * Avoids fabricated metrics that could mislead clients
 */
function buildFallbackExpectedOutcomes(
  kpis: Array<{ name: string; target: string; unit?: string }>
): string[] {
  // If we have real KPIs, derive outcomes from them
  if (kpis.length > 0) {
    const outcomes = kpis.slice(0, 4).map((kpi) => `${kpi.name}: ${kpi.target}${kpi.unit ? ` ${kpi.unit}` : ''}`)
    // Add generic non-numeric outcomes
    outcomes.push('24/7 operational capability')
    outcomes.push('Enhanced compliance and audit trails')
    return outcomes
  }

  // No real data - use honest placeholders without specific numbers
  return [
    'Processing time reduction [to be baselined]',
    'Error rate improvement [to be baselined]',
    'Improved customer response times',
    '24/7 operational capability',
    'Enhanced compliance and audit trails',
  ]
}

/**
 * Build key benefits from extracted KPIs or use honest placeholders
 * Avoids fabricated metrics that could mislead clients
 */
function buildFallbackKeyBenefits(
  kpis: Array<{ name: string; target: string; unit?: string }>
): Array<{ benefit: string; metric: string }> {
  // If we have real KPIs, use them
  if (kpis.length > 0) {
    return kpis.slice(0, 4).map((kpi) => ({
      benefit: kpi.name,
      metric: kpi.target + (kpi.unit ? ` ${kpi.unit}` : ''),
    }))
  }

  // No real data - use honest placeholders that clearly indicate data is pending
  return [
    { benefit: 'Processing Speed', metric: '[To be measured during pilot]' },
    { benefit: 'Error Reduction', metric: '[To be measured during pilot]' },
    { benefit: 'Availability', metric: '24/7 operation capability' },
    { benefit: 'Scalability', metric: '[Capacity to be determined]' },
  ]
}

/**
 * Fallback content if LLM fails
 * IMPORTANT: This content contains placeholder data - clearly marked via _metadata.isFallback
 */
function generateFallbackContent(ctx: GenerationContext, latencyMs: number = 0): GeneratedContent {
  const sourceItemCount =
    ctx.extractedData.stakeholders.length +
    ctx.extractedData.goals.length +
    ctx.extractedData.kpis.length +
    ctx.extractedData.processSteps.length +
    ctx.extractedData.integrations.length

  console.warn('[Document Generation] Using FALLBACK content - metrics are placeholders, not extracted data')

  return {
    _metadata: {
      generatedAt: new Date().toISOString(),
      model: 'fallback',
      isFallback: true,
      sourceItemCount,
      latencyMs,
    },
    executiveSummary: {
      opening: `Introducing ${ctx.digitalEmployeeName}: The future of intelligent automation for ${ctx.companyName}.`,
      overview: `This document outlines the comprehensive design specifications for ${ctx.digitalEmployeeName}, a state-of-the-art Digital Employee being implemented for ${ctx.companyName}. ${ctx.deDescription || 'This AI-powered solution will transform key business processes, delivering unprecedented efficiency and accuracy.'}\n\nThe initiative represents a strategic investment in operational excellence, combining cutting-edge AI capabilities with deep understanding of ${ctx.companyName}'s unique business requirements. Through careful design and rigorous implementation, this Digital Employee will become an indispensable member of the team.`,
      keyObjectives: ctx.extractedData.goals.length > 0
        ? ctx.extractedData.goals.slice(0, 7).map((g) => `${g.title}: ${g.description}`)
        : ['[Objectives to be defined during Design Week sessions]'],
      valueProposition: `${ctx.digitalEmployeeName} represents a transformational opportunity for ${ctx.companyName}. By automating routine yet critical processes, the organization can redirect valuable human talent toward strategic initiatives while ensuring consistent, accurate execution of operational tasks.`,
      expectedOutcomes: buildFallbackExpectedOutcomes(ctx.extractedData.kpis),
    },
    currentStateAnalysis: {
      introduction: 'Understanding the current operational landscape is essential for designing an effective solution.',
      challenges: ctx.extractedData.exceptions.slice(0, 5).map((e) => ({
        challenge: e.name,
        impact: e.description,
        frequency: 'Regular occurrence',
      })),
      inefficiencies:
        'The current process involves significant manual intervention, creating bottlenecks and opportunities for error.',
      opportunityCost:
        'Every hour spent on manual processing is an hour not spent on strategic initiatives and customer relationship building.',
    },
    futureStateVision: {
      introduction: 'The future state represents a fundamental shift in how work gets done.',
      transformationNarrative: `With ${ctx.digitalEmployeeName} in place, ${ctx.companyName} will experience a new operational paradigm where routine tasks are handled automatically while humans focus on high-value activities.`,
      dayInTheLife: `Imagine starting your day knowing that overnight, ${ctx.digitalEmployeeName} has already processed incoming requests, identified priorities, and prepared everything for your review. This is the future we are building.`,
      benefits: [
        { benefit: 'Speed', description: 'Faster processing times', metric: 'Processing time reduction' },
        { benefit: 'Accuracy', description: 'Reduced error rates', metric: 'Error rate' },
        { benefit: 'Availability', description: '24/7 operation', metric: 'Uptime' },
      ],
    },
    processAnalysis: {
      introduction: 'The process design reflects best practices in intelligent automation.',
      processOverview: `The Digital Employee will handle ${ctx.extractedData.processSteps.length} key process steps, from intake through completion.`,
      stepByStepNarrative: ctx.extractedData.processSteps
        .map((s) => `Step ${s.stepNumber}: ${s.name} - ${s.description}`)
        .join('\n\n'),
      automationBenefits:
        'Each automated step reduces cycle time and eliminates the potential for human error in routine operations.',
      exceptionHandlingApproach: `${ctx.extractedData.exceptions.length} exception scenarios have been identified and will be handled through intelligent routing and escalation.`,
      humanMachineCollaboration:
        'This is augmentation, not replacement. Humans remain in control of complex decisions while the Digital Employee handles routine execution.',
    },
    scopeAnalysis: {
      introduction: 'Clear scope boundaries ensure focused delivery and measurable success.',
      inScopeRationale: `${ctx.extractedData.inScope.length} capabilities have been included based on business value and technical feasibility.`,
      outOfScopeRationale: `${ctx.extractedData.outOfScope.length} items are explicitly out of scope to maintain focus and manage complexity.`,
      guardrailsExplanation: `${ctx.extractedData.guardrails.length} guardrails ensure safe, compliant operation within defined boundaries.`,
      boundaryManagement:
        'Edge cases will be handled through intelligent routing to appropriate human experts.',
    },
    technicalFoundation: {
      introduction: 'The technical architecture is designed for reliability, security, and scalability.',
      architectureOverview: `The solution integrates with ${ctx.extractedData.integrations.length} key systems to enable end-to-end automation.`,
      integrationStrategy: ctx.extractedData.integrations
        .map((i) => `${i.systemName}: ${i.purpose} via ${i.connectionType}`)
        .join('. '),
      dataFlowNarrative:
        'Data flows securely between systems with full audit trails and compliance controls.',
      securityApproach:
        'Enterprise-grade security measures protect all data and operations.',
    },
    riskAssessment: {
      introduction: 'Proactive risk management ensures project success.',
      risks: [
        {
          risk: 'Integration complexity',
          likelihood: 'Medium' as const,
          impact: 'Medium' as const,
          mitigation: 'Early integration testing and contingency planning',
        },
        {
          risk: 'Change adoption',
          likelihood: 'Medium' as const,
          impact: 'High' as const,
          mitigation: 'Comprehensive change management program',
        },
      ],
      overallRiskPosture:
        'With proper mitigation measures in place, overall project risk is manageable.',
    },
    implementationApproach: {
      introduction: 'A phased approach ensures controlled delivery and early value realization.',
      phases: [
        { phase: 'Design & Setup', description: 'Finalize design and configure systems', deliverables: ['Design document approval', 'Environment setup'] },
        { phase: 'Build & Test', description: 'Develop and test the solution', deliverables: ['Working solution', 'Test results'] },
        { phase: 'UAT & Go-Live', description: 'User acceptance and deployment', deliverables: ['User sign-off', 'Production deployment'] },
      ],
      successFactors: [
        'Executive sponsorship and engagement',
        'Clear communication throughout',
        'Adequate testing time',
        'User training and support',
      ],
      changeManagement:
        'A comprehensive change management program will ensure smooth adoption and maximize value realization.',
      trainingPlan: {
        overview: 'Training will be delivered through a combination of instructor-led sessions and self-paced materials to ensure all team members are confident working with the Digital Employee.',
        sessions: [
          {
            topic: 'Introduction to the Digital Employee',
            audience: 'All affected team members',
            duration: '1 hour',
            deliveryMethod: 'Virtual presentation',
            keyContent: ['What the Digital Employee does', 'How it fits into daily work', 'Key benefits for the team'],
          },
          {
            topic: 'Working with the Digital Employee',
            audience: 'Operations team',
            duration: '2 hours',
            deliveryMethod: 'Interactive workshop',
            keyContent: ['Step-by-step workflows', 'Escalation procedures', 'Common scenarios and handling'],
          },
        ],
        materials: ['Quick reference card', 'FAQ document', 'Video tutorials'],
        supportPlan: 'Post-launch support will be available through the IT help desk with escalation to the project team for complex issues.',
      },
    },
    successMetrics: {
      introduction: 'Success will be measured through a balanced set of metrics.',
      kpiNarrative: ctx.extractedData.kpis.map((k) => `${k.name}: Target of ${k.target}`).join('. '),
      measurementApproach: 'Automated dashboards will track key metrics in real-time.',
      reportingCadence: 'Weekly operational reports and monthly executive summaries.',
    },
    conclusion: {
      summary: `${ctx.digitalEmployeeName} represents a significant step forward in ${ctx.companyName}'s operational excellence journey.`,
      callToAction: 'We recommend proceeding to the next phase to begin realizing these benefits.',
      nextSteps: [
        { step: 'Review and approve this design document', owner: 'Project Sponsor', timeline: 'This week' },
        { step: 'Begin technical integration setup', owner: 'Technical Team', timeline: 'Next week' },
        { step: 'Schedule UAT sessions', owner: 'Project Manager', timeline: 'Following week' },
      ],
      closingStatement: `Together, we will transform how ${ctx.companyName} operates, setting a new standard for efficiency and excellence.`,
    },
    quickReference: {
      agentName: ctx.digitalEmployeeName,
      purpose: `${ctx.digitalEmployeeName} handles routine tasks automatically, freeing up your time for complex cases.`,
      canDo: [
        'Process standard requests within defined parameters',
        'Validate and verify incoming data',
        'Route requests to appropriate teams',
        'Generate automated responses',
        'Track and log all interactions',
      ],
      cannotDo: [
        'Handle exceptions outside defined rules',
        'Make decisions on edge cases',
        'Access systems outside integration scope',
        'Override business rules',
        'Handle escalated complaints',
      ],
      escalationTriggers: [
        { trigger: 'Customer requests human assistance', action: 'Transfer to available team member', contactMethod: 'Standard escalation queue' },
        { trigger: 'Request falls outside scope', action: 'Route to supervisor', contactMethod: 'Priority queue' },
        { trigger: 'System error or timeout', action: 'Report to technical support', contactMethod: 'IT help desk' },
      ],
      keyContacts: [
        { role: 'Technical Support', name: 'IT Help Desk', responsibility: 'System issues and errors' },
        { role: 'Process Questions', name: 'Operations Manager', responsibility: 'Business rules and exceptions' },
        { role: 'Escalations', name: 'Team Supervisor', responsibility: 'Customer escalations' },
      ],
      quickTips: [
        'Check the Digital Employee status before assuming a system issue',
        'Document any unusual cases for future training',
        'Use the escalation queue for time-sensitive matters',
      ],
    },
    executiveOnePager: {
      headline: `${ctx.digitalEmployeeName}: Transforming Operations for ${ctx.companyName}`,
      problem: `Current manual processes create bottlenecks, introduce errors, and limit ${ctx.companyName}'s ability to scale operations efficiently.`,
      solution: `${ctx.digitalEmployeeName} automates routine tasks while maintaining quality and compliance, enabling the team to focus on high-value activities.`,
      keyBenefits: buildFallbackKeyBenefits(ctx.extractedData.kpis),
      investment: 'Implementation includes design, build, testing, training, and ongoing support.',
      timeline: 'Design complete. Build and UAT phases to follow with production go-live targeted.',
      bottomLine: `${ctx.digitalEmployeeName} enables ${ctx.companyName} to do more with existing resources while improving quality and customer experience.`,
    },
    processFlowSummary: {
      happyPathFlow: ctx.extractedData.processSteps.map((s) => s.name).join(' → ') || 'Request received → Validation → Processing → Completion → Notification',
      escalationFlow: 'If request is outside scope OR customer requests human assistance → Route to appropriate team member via escalation queue',
      decisionPoints: [
        { point: 'Scope Check', options: ['In scope: Continue automated processing', 'Out of scope: Escalate to human'], criteria: 'Based on defined scope boundaries' },
        { point: 'Validation', options: ['Valid: Proceed', 'Invalid: Request correction'], criteria: 'Based on business rules' },
      ],
    },
  }
}

/**
 * Transform raw design week data into generation context
 */
export function buildGenerationContext(
  designWeekData: {
    digitalEmployee: {
      name: string
      description?: string | null
      company: { name: string }
    }
    sessions: Array<{
      extractedItems: Array<{
        type: string
        content: string
        status?: string
        structuredData?: Record<string, unknown> | null
      }>
    }>
    scopeItems: Array<{
      description: string
      classification: string
      skill?: string | null
      conditions?: string | null
      notes?: string | null
    }>
    integrations: Array<{
      systemName: string
      purpose: string
      connectionType: string
    }>
    businessRules: Array<{
      name: string
      condition: string
      action: string
    }>
  },
  language: DocumentLanguage = 'en'
): GenerationContext {
  // Flatten all extracted items
  const allItems = designWeekData.sessions.flatMap((s) => s.extractedItems || [])
  const approvedItems = allItems.filter((item) => item.status === 'APPROVED' || !item.status)

  const getItemsByType = (type: string) => approvedItems.filter((item) => item.type === type)

  return {
    companyName: designWeekData.digitalEmployee.company.name,
    digitalEmployeeName: designWeekData.digitalEmployee.name,
    deDescription: designWeekData.digitalEmployee.description || undefined,
    language,
    extractedData: {
      stakeholders: getItemsByType('STAKEHOLDER').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          name: raw?.name || item.content.split(' - ')[0] || item.content,
          role: raw?.role || item.content.split(' - ')[1] || 'Stakeholder',
          email: raw?.email,
        }
      }),
      goals: getItemsByType('GOAL').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          title: raw?.title || extractTitle(item.content),
          description: raw?.description || item.content,
        }
      }),
      kpis: getItemsByType('KPI_TARGET').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          name: raw?.name || extractTitle(item.content),
          target: raw?.target || item.content,
          unit: raw?.unit,
        }
      }),
      volumes: getItemsByType('VOLUME_EXPECTATION').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          metric: raw?.metric || extractTitle(item.content),
          value: raw?.value || item.content,
          period: raw?.period || 'monthly',
        }
      }),
      processSteps: getItemsByType('HAPPY_PATH_STEP').map((item, index) => {
        const raw = item.structuredData as Record<string, unknown> | undefined
        return {
          stepNumber: (raw?.stepNumber as number) || index + 1,
          name: (raw?.name as string) || extractTitle(item.content),
          description: (raw?.description as string) || item.content,
        }
      }),
      exceptions: getItemsByType('EXCEPTION_CASE').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          name: raw?.name || extractTitle(item.content),
          description: raw?.description || item.content,
          handling: raw?.handling || 'Escalate to human operator',
        }
      }),
      inScope: designWeekData.scopeItems
        .filter((s) => s.classification === 'IN_SCOPE')
        .map((s) => ({
          description: s.description,
          skill: s.skill || undefined,
          conditions: s.conditions || undefined,
        })),
      outOfScope: designWeekData.scopeItems
        .filter((s) => s.classification === 'OUT_OF_SCOPE')
        .map((s) => ({
          description: s.description,
          notes: s.notes || undefined,
        })),
      guardrails: [
        ...getItemsByType('GUARDRAIL_NEVER').map((item) => ({ type: 'NEVER', description: item.content })),
        ...getItemsByType('GUARDRAIL_ALWAYS').map((item) => ({ type: 'ALWAYS', description: item.content })),
        ...getItemsByType('FINANCIAL_LIMIT').map((item) => ({
          type: 'FINANCIAL LIMIT',
          description: item.content,
        })),
        ...getItemsByType('LEGAL_RESTRICTION').map((item) => ({ type: 'LEGAL', description: item.content })),
      ],
      integrations: designWeekData.integrations.map((i) => ({
        systemName: i.systemName,
        purpose: i.purpose,
        connectionType: i.connectionType,
      })),
      businessRules: designWeekData.businessRules.map((r) => ({
        name: r.name,
        condition: r.condition,
        action: r.action,
      })),
      securityRequirements: getItemsByType('SECURITY_REQUIREMENT').map((item) => item.content),
      channels: getItemsByType('CHANNEL').map((item) => item.content),
      // New persona/monitoring/launch data
      personaTraits: getItemsByType('PERSONA_TRAIT').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          name: raw?.name || extractTitle(item.content),
          description: raw?.description || item.content,
          examplePhrase: raw?.examplePhrase,
        }
      }),
      escalationScripts: getItemsByType('ESCALATION_SCRIPT').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          context: raw?.context || raw?.trigger || extractTitle(item.content),
          script: raw?.script || item.content,
        }
      }),
      monitoringMetrics: getItemsByType('MONITORING_METRIC').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          name: raw?.name || extractTitle(item.content),
          target: raw?.target || item.content,
          owner: raw?.owner,
          perspective: raw?.perspective,
        }
      }),
      launchCriteria: getItemsByType('LAUNCH_CRITERION').map((item) => {
        const raw = item.structuredData as Record<string, string> | undefined
        return {
          criterion: raw?.criterion || item.content,
          phase: raw?.phase,
          owner: raw?.owner,
        }
      }),
    },
  }
}

/**
 * Helper: Extract title from content
 */
function extractTitle(content: string): string {
  const match = content.match(/^([^:\-\n]+)/)
  if (match) {
    return match[1].trim().slice(0, 100)
  }
  return content.slice(0, 100)
}

/**
 * Merge generated content into document structure
 */
export function mergeGeneratedContent(
  baseDocument: DEDesignDocument,
  generatedContent: GeneratedContent
): DEDesignDocument {
  return {
    ...baseDocument,
    executiveSummary: {
      overview: generatedContent.executiveSummary.overview,
      keyObjectives: generatedContent.executiveSummary.keyObjectives,
      timeline: baseDocument.executiveSummary.timeline,
    },
    _generated: generatedContent,
  }
}
