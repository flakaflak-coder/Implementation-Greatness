/**
 * Document Generation Prompt Sections
 *
 * Modularized components for the master document generation prompt.
 * This allows easier maintenance and testing of individual sections.
 */

import type { DocumentLanguage } from './generate-document'

export const LANGUAGE_NAMES: Record<DocumentLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
}

/**
 * Build the language instruction section
 */
export function buildLanguageInstruction(language: DocumentLanguage): string {
  if (language === 'en') return ''

  return `
🌍 CRITICAL LANGUAGE REQUIREMENT: Write ALL content in ${LANGUAGE_NAMES[language]}. Every single word, phrase, section title, and narrative must be in ${LANGUAGE_NAMES[language]}. Do not use any English except for proper nouns and technical system names.`
}

/**
 * The persona and quality expectations section
 */
export const PERSONA_SECTION = `You are a senior management consultant at a top-tier consulting firm (McKinsey, BCG, Bain level). You're creating a focused Digital Employee design document that will be presented to C-level executives.

This document must be:
- CONCISE: Target 12-15 pages total. Be impactful, not verbose.
- Professionally written with compelling storytelling
- Self-explanatory so anyone can understand without context
- Visionary yet practical
- Full of business insights and value quantification
- Written as if executives have limited time - every word must earn its place`

/**
 * Build the project context section
 */
export function buildProjectContext(
  companyName: string,
  digitalEmployeeName: string,
  deDescription?: string
): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
PROJECT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

**Client Organization:** ${companyName}
**Digital Employee Name:** ${digitalEmployeeName}
${deDescription ? `**Initiative Description:** ${deDescription}` : ''}`
}

/**
 * Build the extracted data section
 */
export function buildExtractedDataSection(extractedData: {
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
  personaTraits?: Array<{ name: string; description: string; examplePhrase?: string }>
  escalationScripts?: Array<{ context: string; script: string }>
  monitoringMetrics?: Array<{ name: string; target: string; owner?: string; perspective?: string }>
  launchCriteria?: Array<{ criterion: string; phase?: string; owner?: string }>
}): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
EXTRACTED REQUIREMENTS DATA
═══════════════════════════════════════════════════════════════════════════════

### Key Stakeholders
${extractedData.stakeholders.map((s) => `• ${s.name} — ${s.role}${s.email ? ` (${s.email})` : ''}`).join('\n') || '• Stakeholder information to be confirmed'}

### Strategic Goals & Objectives
${extractedData.goals.map((g) => `• **${g.title}**\n  ${g.description}`).join('\n\n') || '• Goals to be defined'}

### Key Performance Indicators
${extractedData.kpis.map((k) => `• ${k.name}: Target ${k.target}${k.unit ? ` ${k.unit}` : ''}`).join('\n') || '• KPIs to be defined'}

### Volume Expectations
${extractedData.volumes.map((v) => `• ${v.metric}: ${v.value} per ${v.period}`).join('\n') || '• Volume metrics to be quantified'}

### Process Steps (Happy Path)
${extractedData.processSteps.map((s) => `${s.stepNumber}. **${s.name}**\n   ${s.description}`).join('\n\n') || '• Process to be mapped'}

### Exception Scenarios
${extractedData.exceptions.map((e) => `• **${e.name}**\n  Scenario: ${e.description}\n  Handling: ${e.handling}`).join('\n\n') || '• Exceptions to be identified'}

### Capabilities In Scope
${extractedData.inScope.map((i) => `• ${i.description}${i.skill ? `\n  Skill Required: ${i.skill}` : ''}${i.conditions ? `\n  Conditions: ${i.conditions}` : ''}`).join('\n') || '• Scope to be defined'}

### Explicitly Out of Scope
${extractedData.outOfScope.map((o) => `• ${o.description}${o.notes ? ` — ${o.notes}` : ''}`).join('\n') || '• Out-of-scope items to be defined'}

### Operational Guardrails
${extractedData.guardrails.map((g) => `• **${g.type}**: ${g.description}`).join('\n') || '• Guardrails to be established'}

### System Integrations Required
${extractedData.integrations.map((i) => `• **${i.systemName}**\n  Purpose: ${i.purpose}\n  Connection: ${i.connectionType}`).join('\n\n') || '• Integrations to be mapped'}

### Business Rules
${extractedData.businessRules.map((r) => `• **${r.name}**\n  When: ${r.condition}\n  Then: ${r.action}`).join('\n\n') || '• Business rules to be documented'}

### Security & Compliance Requirements
${extractedData.securityRequirements.length > 0 ? extractedData.securityRequirements.map((s) => `• ${s}`).join('\n') : '• Security requirements to be defined'}

### Communication Channels
${extractedData.channels.length > 0 ? extractedData.channels.join(', ') : 'To be determined'}
${extractedData.personaTraits && extractedData.personaTraits.length > 0 ? `
### Persona & Conversational Design
${extractedData.personaTraits.map((t) => `• **${t.name}**: ${t.description}${t.examplePhrase ? `\n  Example: "${t.examplePhrase}"` : ''}`).join('\n')}` : ''}
${extractedData.escalationScripts && extractedData.escalationScripts.length > 0 ? `
### Escalation Scripts
${extractedData.escalationScripts.map((s) => `• **${s.context}**\n  "${s.script}"`).join('\n\n')}` : ''}
${extractedData.monitoringMetrics && extractedData.monitoringMetrics.length > 0 ? `
### Monitoring Metrics
${extractedData.monitoringMetrics.map((m) => `• ${m.name}: Target ${m.target}${m.owner ? ` (Owner: ${m.owner})` : ''}${m.perspective ? ` [${m.perspective}]` : ''}`).join('\n')}` : ''}
${extractedData.launchCriteria && extractedData.launchCriteria.length > 0 ? `
### Launch Criteria
${extractedData.launchCriteria.map((c) => `• ${c.criterion}${c.phase ? ` (Phase: ${c.phase})` : ''}${c.owner ? ` — Owner: ${c.owner}` : ''}`).join('\n')}` : ''}`
}

/**
 * The JSON schema section for generated content
 */
export const JSON_SCHEMA_SECTION = `
═══════════════════════════════════════════════════════════════════════════════
YOUR TASK: Generate Comprehensive Document Content
═══════════════════════════════════════════════════════════════════════════════

Create a JSON object with the following structure. Each section should be FOCUSED and IMPACTFUL. Think 1-2 paragraphs where paragraph content is expected - be concise but substantive. Target a 12-15 page final document.

{
  "executiveSummary": {
    "opening": "A powerful opening statement (1-2 sentences) that captures attention.",
    "overview": "1-2 paragraphs providing a focused overview. Cover what, why, and expected impact.",
    "keyObjectives": ["3-5 objectives, each as a sentence"],
    "valueProposition": "1 paragraph explaining why this matters strategically.",
    "expectedOutcomes": ["3-5 specific, quantified expected outcomes"]
  },

  "currentStateAnalysis": {
    "introduction": "1-2 sentences setting up the current state analysis.",
    "challenges": [
      {"challenge": "Name of challenge", "impact": "Business impact", "frequency": "How often"}
    ],
    "inefficiencies": "1 paragraph on current process inefficiencies.",
    "opportunityCost": "1 paragraph on what the current state costs."
  },

  "futureStateVision": {
    "introduction": "1-2 sentences painting what success looks like.",
    "transformationNarrative": "1-2 paragraphs describing the transformed state.",
    "dayInTheLife": "1 paragraph describing a typical day after go-live.",
    "benefits": [
      {"benefit": "Benefit name", "description": "Brief explanation", "metric": "Measurement"}
    ]
  },

  "processAnalysis": {
    "introduction": "1-2 sentences on process design approach.",
    "processOverview": "1 paragraph on the end-to-end process.",
    "stepByStepNarrative": "1-2 paragraphs walking through key process steps briefly.",
    "automationBenefits": "1 paragraph on what gets automated and why.",
    "exceptionHandlingApproach": "1 paragraph on exception handling and escalation.",
    "humanMachineCollaboration": "1 paragraph on human-machine collaboration."
  },

  "scopeAnalysis": {
    "introduction": "1-2 sentences on scope importance.",
    "inScopeRationale": "1 paragraph on what's in scope and why.",
    "outOfScopeRationale": "1 paragraph on what's out of scope and why.",
    "guardrailsExplanation": "1 paragraph on guardrails and rules of engagement.",
    "boundaryManagement": "1-2 sentences on edge case handling."
  },

  "technicalFoundation": {
    "introduction": "1-2 sentences on technical approach.",
    "architectureOverview": "1 paragraph on solution architecture in business terms.",
    "integrationStrategy": "1 paragraph on integration approach.",
    "dataFlowNarrative": "1 paragraph on data flow.",
    "securityApproach": "1 paragraph on security measures."
  },

  "riskAssessment": {
    "introduction": "1-2 sentences on risk management.",
    "risks": [
      {"risk": "Risk", "likelihood": "Low/Medium/High", "impact": "Low/Medium/High", "mitigation": "Mitigation"}
    ],
    "overallRiskPosture": "1 paragraph on overall risk assessment."
  },

  "implementationApproach": {
    "introduction": "1-2 sentences on implementation philosophy.",
    "phases": [
      {"phase": "Phase name", "description": "Brief description", "deliverables": ["Key deliverables"]}
    ],
    "successFactors": ["3-5 critical success factors"],
    "changeManagement": "1 paragraph on change management.",
    "trainingPlan": {
      "overview": "1 paragraph on training approach.",
      "sessions": [
        {
          "topic": "Training topic",
          "audience": "Target audience",
          "duration": "Duration",
          "deliveryMethod": "Delivery method",
          "keyContent": ["Key topics"]
        }
      ],
      "materials": ["Training materials"],
      "supportPlan": "1-2 sentences on ongoing support."
    }
  },

  "successMetrics": {
    "introduction": "1-2 sentences on measurement philosophy.",
    "kpiNarrative": "1 paragraph describing KPIs and targets.",
    "measurementApproach": "1-2 sentences on metric collection.",
    "reportingCadence": "1-2 sentences on reporting cadence."
  },

  "conclusion": {
    "summary": "1 paragraph summary tying everything together.",
    "callToAction": "2-3 sentences calling stakeholders to action.",
    "nextSteps": [
      {"step": "Next step", "owner": "Owner", "timeline": "Timeline"}
    ],
    "closingStatement": "A memorable closing statement (1-2 sentences)."
  },

  "quickReference": {
    "agentName": "The Digital Employee name",
    "purpose": "1-2 sentence clear summary of what this agent does",
    "canDo": ["5-7 specific things the agent CAN do"],
    "cannotDo": ["5-7 specific things the agent CANNOT do"],
    "escalationTriggers": [
      {"trigger": "Situation requiring escalation", "action": "What to do", "contactMethod": "How to escalate"}
    ],
    "keyContacts": [
      {"role": "Role name", "name": "Contact name", "responsibility": "What they handle"}
    ],
    "quickTips": ["3-5 practical tips for working with the Digital Employee"]
  },

  "executiveOnePager": {
    "headline": "Compelling 5-10 word headline",
    "problem": "2-3 sentences describing the business problem",
    "solution": "2-3 sentences describing the solution",
    "keyBenefits": [
      {"benefit": "Benefit name", "metric": "Specific quantified impact"}
    ],
    "investment": "Brief description of investment level",
    "timeline": "Clear timeline summary",
    "bottomLine": "1-2 sentence compelling 'bottom line' statement"
  },

  "processFlowSummary": {
    "happyPathFlow": "Text-based visual flow showing the main process steps",
    "escalationFlow": "Clear explanation of when and how escalation happens",
    "decisionPoints": [
      {"point": "Key decision point", "options": ["Option 1", "Option 2"], "criteria": "How the decision is made"}
    ]
  }
}`

/**
 * The writing guidelines section
 */
export function buildWritingGuidelines(companyName: string): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
WRITING GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

1. CONCISE: Target 12-15 pages total. Every word must earn its place. Cut filler.
2. NARRATIVE STYLE: Write in flowing paragraphs, not bullet points (except where arrays are specified).
3. CONCRETE & SPECIFIC: Use specific examples and numbers. No generic statements.
4. BUSINESS VALUE: Connect technical elements back to business value.
5. PROFESSIONAL TONE: Write as a senior consultant would for busy executives.
6. SELF-EXPLANATORY: Readers with no context should understand.
7. IMPACTFUL: Make key points clearly and move on. No repetition.
8. ACTIVE VOICE: Use active, engaging language.
9. CLIENT FOCUSED: This is about ${companyName}, not technology for technology's sake.`
}

/**
 * The critical quality requirements section
 */
export const QUALITY_REQUIREMENTS_SECTION = `
═══════════════════════════════════════════════════════════════════════════════
CRITICAL QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

⚠️ STAKEHOLDER ROLES: When mentioning stakeholders in any section, ALWAYS use their SPECIFIC role titles (e.g., "Claims Operations Director", "Head of Customer Service", "IT Integration Lead"), NEVER use generic terms like "Stakeholder" or "Team Member". Make roles actionable and clear.

⚠️ KPI CONSISTENCY: All metrics and KPIs must be expressed in PROPER FORMATS:
   - Use real percentages (e.g., "20% reduction", "40% improvement"), not abstract numbers like "1" or "2"
   - Keep KPI values CONSISTENT throughout the document - if you mention "20% processing time reduction" in the executive summary, use that SAME value in the success metrics section
   - Always include the unit of measurement (%, hours, count, etc.)

⚠️ NO TECHNICAL PLACEHOLDERS: NEVER use placeholder text like "<brand>_service", "{system_name}", or similar technical placeholders. Always infer and use REAL, human-readable system and service names based on context. If a specific name isn't available, use a descriptive term like "the claims management system" or "customer portal".

⚠️ ACTIONABLE CONTENT: Every section should be immediately usable:
   - Training plans should include specific session topics and target audiences
   - Escalation triggers should tell frontline staff EXACTLY when and how to escalate
   - Next steps should have clear owners and realistic timelines

⚠️ FRONTLINE FRIENDLY: Include content specifically designed for teams who will work with the Digital Employee daily, not just executives:
   - Quick reference guides for when to escalate
   - Clear "can do" vs "cannot do" lists
   - Practical tips for collaboration

The goal is that when the client sees this document, they say "WOW, this is exactly what I needed to understand and get excited about this initiative."

Now generate the comprehensive JSON content:`
