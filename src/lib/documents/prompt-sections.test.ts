import { describe, it, expect } from 'vitest'
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

describe('prompt-sections', () => {
  describe('LANGUAGE_NAMES', () => {
    it('has entries for all supported languages', () => {
      expect(LANGUAGE_NAMES.en).toBe('English')
      expect(LANGUAGE_NAMES.nl).toBe('Nederlands')
      expect(LANGUAGE_NAMES.de).toBe('Deutsch')
      expect(LANGUAGE_NAMES.fr).toBe('Français')
      expect(LANGUAGE_NAMES.es).toBe('Español')
    })

    it('has exactly 5 language entries', () => {
      expect(Object.keys(LANGUAGE_NAMES)).toHaveLength(5)
    })
  })

  describe('buildLanguageInstruction', () => {
    it('returns empty string for English', () => {
      const result = buildLanguageInstruction('en')
      expect(result).toBe('')
    })

    it('returns language instruction for Dutch', () => {
      const result = buildLanguageInstruction('nl')
      expect(result).toContain('Nederlands')
      expect(result).toContain('CRITICAL LANGUAGE REQUIREMENT')
    })

    it('returns language instruction for German', () => {
      const result = buildLanguageInstruction('de')
      expect(result).toContain('Deutsch')
      expect(result).toContain('CRITICAL LANGUAGE REQUIREMENT')
    })

    it('returns language instruction for French', () => {
      const result = buildLanguageInstruction('fr')
      expect(result).toContain('Français')
    })

    it('returns language instruction for Spanish', () => {
      const result = buildLanguageInstruction('es')
      expect(result).toContain('Español')
    })

    it('includes instruction to write all content in target language', () => {
      const result = buildLanguageInstruction('nl')
      expect(result).toContain('Write ALL content in Nederlands')
      expect(result).toContain('Every single word')
    })
  })

  describe('PERSONA_SECTION', () => {
    it('contains consultant persona description', () => {
      expect(PERSONA_SECTION).toContain('senior management consultant')
      expect(PERSONA_SECTION).toContain('McKinsey')
    })

    it('specifies document requirements', () => {
      expect(PERSONA_SECTION).toContain('CONCISE')
      expect(PERSONA_SECTION).toContain('12-15 pages')
      expect(PERSONA_SECTION).toContain('C-level executives')
    })
  })

  describe('buildProjectContext', () => {
    it('includes company and DE name', () => {
      const result = buildProjectContext('Acme Corp', 'Claims Bot')
      expect(result).toContain('Acme Corp')
      expect(result).toContain('Claims Bot')
      expect(result).toContain('PROJECT CONTEXT')
    })

    it('includes description when provided', () => {
      const result = buildProjectContext('Acme Corp', 'Claims Bot', 'Handles insurance claims')
      expect(result).toContain('Handles insurance claims')
      expect(result).toContain('Initiative Description')
    })

    it('omits description line when not provided', () => {
      const result = buildProjectContext('Acme Corp', 'Claims Bot')
      expect(result).not.toContain('Initiative Description')
    })

    it('omits description line when undefined', () => {
      const result = buildProjectContext('Acme Corp', 'Claims Bot', undefined)
      expect(result).not.toContain('Initiative Description')
    })
  })

  describe('buildExtractedDataSection', () => {
    const emptyData = {
      stakeholders: [],
      goals: [],
      kpis: [],
      volumes: [],
      processSteps: [],
      exceptions: [],
      inScope: [],
      outOfScope: [],
      guardrails: [],
      integrations: [],
      businessRules: [],
      securityRequirements: [],
      channels: [],
    }

    it('returns section header', () => {
      const result = buildExtractedDataSection(emptyData)
      expect(result).toContain('EXTRACTED REQUIREMENTS DATA')
    })

    it('shows fallback text for empty arrays', () => {
      const result = buildExtractedDataSection(emptyData)
      expect(result).toContain('Stakeholder information to be confirmed')
      expect(result).toContain('Goals to be defined')
      expect(result).toContain('KPIs to be defined')
      expect(result).toContain('Volume metrics to be quantified')
      expect(result).toContain('Process to be mapped')
      expect(result).toContain('Exceptions to be identified')
      expect(result).toContain('Scope to be defined')
      expect(result).toContain('Out-of-scope items to be defined')
      expect(result).toContain('Guardrails to be established')
      expect(result).toContain('Integrations to be mapped')
      expect(result).toContain('Business rules to be documented')
      expect(result).toContain('Security requirements to be defined')
      expect(result).toContain('To be determined')
    })

    it('formats stakeholders correctly', () => {
      const data = {
        ...emptyData,
        stakeholders: [
          { name: 'John Smith', role: 'VP Operations', email: 'john@acme.com' },
          { name: 'Jane Doe', role: 'CTO' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('John Smith — VP Operations (john@acme.com)')
      expect(result).toContain('Jane Doe — CTO')
      expect(result).not.toContain('Stakeholder information to be confirmed')
    })

    it('formats goals correctly', () => {
      const data = {
        ...emptyData,
        goals: [{ title: 'Reduce Cost', description: 'Cut processing cost by 50%' }],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('**Reduce Cost**')
      expect(result).toContain('Cut processing cost by 50%')
    })

    it('formats KPIs with optional unit', () => {
      const data = {
        ...emptyData,
        kpis: [
          { name: 'Automation Rate', target: '85%', unit: '%' },
          { name: 'Response Time', target: '2 seconds' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Automation Rate: Target 85% %')
      expect(result).toContain('Response Time: Target 2 seconds')
    })

    it('formats volumes correctly', () => {
      const data = {
        ...emptyData,
        volumes: [{ metric: 'Cases', value: '5000', period: 'month' }],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Cases: 5000 per month')
    })

    it('formats process steps with numbering', () => {
      const data = {
        ...emptyData,
        processSteps: [
          { stepNumber: 1, name: 'Receive Claim', description: 'Customer submits claim' },
          { stepNumber: 2, name: 'Validate', description: 'Check claim data' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('1. **Receive Claim**')
      expect(result).toContain('2. **Validate**')
    })

    it('formats exceptions with handling', () => {
      const data = {
        ...emptyData,
        exceptions: [{ name: 'Missing Docs', description: 'Documents not provided', handling: 'Request from customer' }],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('**Missing Docs**')
      expect(result).toContain('Handling: Request from customer')
    })

    it('formats scope items with optional fields', () => {
      const data = {
        ...emptyData,
        inScope: [
          { description: 'Simple claims', skill: 'claims-basic', conditions: 'Under $1000' },
          { description: 'FAQ answers' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Simple claims')
      expect(result).toContain('Skill Required: claims-basic')
      expect(result).toContain('Conditions: Under $1000')
      expect(result).toContain('FAQ answers')
    })

    it('formats out-of-scope with optional notes', () => {
      const data = {
        ...emptyData,
        outOfScope: [
          { description: 'Litigation', notes: 'Requires legal review' },
          { description: 'Complex cases' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Litigation — Requires legal review')
      expect(result).toContain('Complex cases')
    })

    it('formats integrations correctly', () => {
      const data = {
        ...emptyData,
        integrations: [{ systemName: 'SAP', purpose: 'ERP', connectionType: 'REST API' }],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('**SAP**')
      expect(result).toContain('Purpose: ERP')
      expect(result).toContain('Connection: REST API')
    })

    it('formats business rules correctly', () => {
      const data = {
        ...emptyData,
        businessRules: [{ name: 'Auto-approve', condition: 'Amount < $500', action: 'Approve immediately' }],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('**Auto-approve**')
      expect(result).toContain('When: Amount < $500')
      expect(result).toContain('Then: Approve immediately')
    })

    it('formats channels as comma-separated list', () => {
      const data = {
        ...emptyData,
        channels: ['Email', 'Web Portal', 'Phone'],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Email, Web Portal, Phone')
    })

    it('formats security requirements as bullet list', () => {
      const data = {
        ...emptyData,
        securityRequirements: ['SSL encryption', 'SOC2 compliance'],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('SSL encryption')
      expect(result).toContain('SOC2 compliance')
    })

    it('includes optional persona traits when provided', () => {
      const data = {
        ...emptyData,
        personaTraits: [
          { name: 'Helpful', description: 'Always tries to assist', examplePhrase: 'Let me help you' },
          { name: 'Patient', description: 'Never rushes' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Persona & Conversational Design')
      expect(result).toContain('**Helpful**: Always tries to assist')
      expect(result).toContain('Example: "Let me help you"')
    })

    it('includes optional escalation scripts when provided', () => {
      const data = {
        ...emptyData,
        escalationScripts: [
          { context: 'After hours', script: 'Our team is currently unavailable' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Escalation Scripts')
      expect(result).toContain('**After hours**')
      expect(result).toContain('"Our team is currently unavailable"')
    })

    it('includes optional monitoring metrics when provided', () => {
      const data = {
        ...emptyData,
        monitoringMetrics: [
          { name: 'Response Time', target: '< 2s', owner: 'Ops Team', perspective: 'operational' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Monitoring Metrics')
      expect(result).toContain('Response Time: Target < 2s (Owner: Ops Team) [operational]')
    })

    it('includes optional launch criteria when provided', () => {
      const data = {
        ...emptyData,
        launchCriteria: [
          { criterion: 'CSAT > 4.0', phase: 'soft_launch', owner: 'Product' },
        ],
      }
      const result = buildExtractedDataSection(data)
      expect(result).toContain('Launch Criteria')
      expect(result).toContain('CSAT > 4.0 (Phase: soft_launch) — Owner: Product')
    })

    it('omits optional sections when not provided', () => {
      const result = buildExtractedDataSection(emptyData)
      expect(result).not.toContain('Persona & Conversational Design')
      expect(result).not.toContain('Escalation Scripts')
      expect(result).not.toContain('Monitoring Metrics')
      expect(result).not.toContain('Launch Criteria')
    })
  })

  describe('JSON_SCHEMA_SECTION', () => {
    it('contains the task description', () => {
      expect(JSON_SCHEMA_SECTION).toContain('YOUR TASK: Generate Comprehensive Document Content')
    })

    it('defines executiveSummary schema', () => {
      expect(JSON_SCHEMA_SECTION).toContain('"executiveSummary"')
      expect(JSON_SCHEMA_SECTION).toContain('"opening"')
      expect(JSON_SCHEMA_SECTION).toContain('"overview"')
      expect(JSON_SCHEMA_SECTION).toContain('"keyObjectives"')
    })

    it('defines all major document sections', () => {
      expect(JSON_SCHEMA_SECTION).toContain('"currentStateAnalysis"')
      expect(JSON_SCHEMA_SECTION).toContain('"futureStateVision"')
      expect(JSON_SCHEMA_SECTION).toContain('"processAnalysis"')
      expect(JSON_SCHEMA_SECTION).toContain('"scopeAnalysis"')
      expect(JSON_SCHEMA_SECTION).toContain('"technicalFoundation"')
      expect(JSON_SCHEMA_SECTION).toContain('"riskAssessment"')
      expect(JSON_SCHEMA_SECTION).toContain('"implementationApproach"')
      expect(JSON_SCHEMA_SECTION).toContain('"successMetrics"')
      expect(JSON_SCHEMA_SECTION).toContain('"conclusion"')
      expect(JSON_SCHEMA_SECTION).toContain('"quickReference"')
      expect(JSON_SCHEMA_SECTION).toContain('"executiveOnePager"')
      expect(JSON_SCHEMA_SECTION).toContain('"processFlowSummary"')
    })
  })

  describe('buildWritingGuidelines', () => {
    it('includes the company name', () => {
      const result = buildWritingGuidelines('Acme Insurance')
      expect(result).toContain('Acme Insurance')
    })

    it('includes writing guidelines section header', () => {
      const result = buildWritingGuidelines('Test Corp')
      expect(result).toContain('WRITING GUIDELINES')
    })

    it('contains all numbered guidelines', () => {
      const result = buildWritingGuidelines('Test Corp')
      expect(result).toContain('1. CONCISE')
      expect(result).toContain('2. NARRATIVE STYLE')
      expect(result).toContain('3. CONCRETE & SPECIFIC')
      expect(result).toContain('4. BUSINESS VALUE')
      expect(result).toContain('5. PROFESSIONAL TONE')
      expect(result).toContain('6. SELF-EXPLANATORY')
      expect(result).toContain('7. IMPACTFUL')
      expect(result).toContain('8. ACTIVE VOICE')
      expect(result).toContain('9. CLIENT FOCUSED')
    })

    it('references client focus with company name', () => {
      const result = buildWritingGuidelines('Freeday')
      expect(result).toContain('This is about Freeday')
    })
  })

  describe('QUALITY_REQUIREMENTS_SECTION', () => {
    it('contains critical quality warnings', () => {
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('STAKEHOLDER ROLES')
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('KPI CONSISTENCY')
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('NO TECHNICAL PLACEHOLDERS')
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('ACTIONABLE CONTENT')
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('FRONTLINE FRIENDLY')
    })

    it('ends with generation instruction', () => {
      expect(QUALITY_REQUIREMENTS_SECTION).toContain('generate the comprehensive JSON content')
    })
  })
})
