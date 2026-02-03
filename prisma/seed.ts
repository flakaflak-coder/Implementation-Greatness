import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, ProcessingStatus, DesignWeekStatus, DigitalEmployeeStatus, JourneyPhaseType, JourneyPhaseStatus, ScopeClassification, IntegrationType, AuthMethod, IntegrationStatus, ConditionType, EscalationAction, Priority, PrerequisiteCategory, PrerequisiteOwner, PrerequisiteStatus, SignOffStatus, ExtractionStatus, StepActor, ExtractedItemType, ReviewStatus, TrackerStatus, RiskLevel } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database with complete ITSM Agent...')

  // ============================================
  // 1. COMPANY
  // ============================================
  const company = await prisma.company.upsert({
    where: { id: 'techcorp-solutions' },
    update: {},
    create: {
      id: 'techcorp-solutions',
      name: 'TechCorp Solutions',
      industry: 'Technology Services',
      contactName: 'Sarah van der Berg',
      contactEmail: 'sarah.vanderberg@techcorp.nl',
      contactPhone: '+31 20 123 4567',
      logoUrl: null,
    },
  })
  console.log('✅ Created company:', company.name)

  // ============================================
  // 2. DIGITAL EMPLOYEE
  // ============================================
  const digitalEmployee = await prisma.digitalEmployee.upsert({
    where: { id: 'itsm-agent' },
    update: {
      status: DigitalEmployeeStatus.DESIGN,
      currentJourneyPhase: JourneyPhaseType.DESIGN_WEEK,
      goLiveDate: new Date('2026-03-15'),
    },
    create: {
      id: 'itsm-agent',
      companyId: company.id,
      name: 'ITSM Agent',
      description: 'Intelligent IT Service Management agent that handles ticket classification, routing, password resets, and first-line support for TechCorp employees.',
      status: DigitalEmployeeStatus.DESIGN,
      currentJourneyPhase: JourneyPhaseType.DESIGN_WEEK,
      channels: ['EMAIL', 'TEAMS', 'WEBCHAT'],
      goLiveDate: new Date('2026-03-15'),
    },
  })
  console.log('✅ Created Digital Employee:', digitalEmployee.name)

  // ============================================
  // 3. JOURNEY PHASES (all complete up to Design Week)
  // ============================================
  const journeyPhases = [
    { type: JourneyPhaseType.SALES_HANDOVER, status: JourneyPhaseStatus.COMPLETE, order: 1 },
    { type: JourneyPhaseType.KICKOFF, status: JourneyPhaseStatus.COMPLETE, order: 2 },
    { type: JourneyPhaseType.DESIGN_WEEK, status: JourneyPhaseStatus.COMPLETE, order: 3 },
    { type: JourneyPhaseType.ONBOARDING, status: JourneyPhaseStatus.NOT_STARTED, order: 4 },
    { type: JourneyPhaseType.UAT, status: JourneyPhaseStatus.NOT_STARTED, order: 5 },
    { type: JourneyPhaseType.GO_LIVE, status: JourneyPhaseStatus.NOT_STARTED, order: 6 },
    { type: JourneyPhaseType.HYPERCARE, status: JourneyPhaseStatus.NOT_STARTED, order: 7 },
    { type: JourneyPhaseType.HANDOVER_TO_SUPPORT, status: JourneyPhaseStatus.NOT_STARTED, order: 8 },
  ]

  for (const phase of journeyPhases) {
    await prisma.journeyPhase.upsert({
      where: {
        digitalEmployeeId_phaseType: {
          digitalEmployeeId: digitalEmployee.id,
          phaseType: phase.type,
        },
      },
      update: { status: phase.status },
      create: {
        digitalEmployeeId: digitalEmployee.id,
        phaseType: phase.type,
        status: phase.status,
        order: phase.order,
        startedAt: phase.status === JourneyPhaseStatus.COMPLETE ? new Date('2026-01-15') : null,
        completedAt: phase.status === JourneyPhaseStatus.COMPLETE ? new Date('2026-01-30') : null,
        assignedTo: 'Sophie Martinez',
      },
    })
  }
  console.log('✅ Created journey phases')

  // ============================================
  // 4. DESIGN WEEK
  // ============================================
  const designWeek = await prisma.designWeek.upsert({
    where: { id: 'itsm-design-week' },
    update: {
      status: DesignWeekStatus.COMPLETE,
      currentPhase: 4,
      completedAt: new Date('2026-01-30'),
    },
    create: {
      id: 'itsm-design-week',
      digitalEmployeeId: digitalEmployee.id,
      status: DesignWeekStatus.COMPLETE,
      currentPhase: 4,
      startedAt: new Date('2026-01-20'),
      completedAt: new Date('2026-01-30'),
      // Business Profile - uses profile-types.ts structure
      businessProfile: {
        identity: {
          name: 'ITSM Agent',
          description: 'Intelligent IT Service Management agent that handles ticket classification, routing, password resets, and first-line support for TechCorp employees.',
          stakeholders: [
            { id: 'sh-1', name: 'Sarah van der Berg', role: 'IT Director', email: 'sarah.vanderberg@techcorp.nl', isDecisionMaker: true },
            { id: 'sh-2', name: 'Thomas de Vries', role: 'Service Desk Manager', email: 'thomas.devries@techcorp.nl', isDecisionMaker: false },
            { id: 'sh-3', name: 'Linda Jansen', role: 'CISO', email: 'linda.jansen@techcorp.nl', isDecisionMaker: true },
            { id: 'sh-4', name: 'Mark Peters', role: 'HR Business Partner', email: 'mark.peters@techcorp.nl', isDecisionMaker: false },
          ],
        },
        businessContext: {
          problemStatement: 'IT helpdesk receives 2,500+ tickets monthly with 40% being routine requests (password resets, access requests, basic troubleshooting). Current 4-hour average response time and high escalation rate causing employee frustration.',
          volumePerMonth: 2500,
          volumeOriginalValue: 2500,
          volumeOriginalUnit: 'tickets/month',
          volumeCalculationNote: 'Based on ServiceNow ticket data from last 6 months',
          costPerCase: 45,
          totalMonthlyCost: 112500,
          currency: 'EUR',
          costCalculationNote: '€45 per ticket (15 min @ €180/hr fully loaded)',
          peakPeriods: ['Monday mornings', 'Month-end', 'After software deployments'],
          painPoints: ['4-hour average response time', 'High escalation rate', 'Employee frustration', 'Manual ticket routing'],
        },
        kpis: [
          { id: 'kpi-1', name: 'Automation Rate', description: 'Percentage of tickets fully handled by DE', targetValue: '60%', currentValue: '0%', unit: '%', frequency: 'weekly' },
          { id: 'kpi-2', name: 'First Response Time', description: 'Time to first meaningful response', targetValue: '<5 min', currentValue: '4 hours', unit: 'minutes', frequency: 'daily' },
          { id: 'kpi-3', name: 'Customer Satisfaction', description: 'Post-resolution CSAT score', targetValue: '4.5/5', currentValue: '3.2/5', unit: 'score', frequency: 'weekly' },
          { id: 'kpi-4', name: 'Resolution Rate', description: 'Tickets resolved without human intervention', targetValue: '50%', currentValue: '0%', unit: '%', frequency: 'weekly' },
        ],
        channels: [
          { id: 'ch-1', name: 'Email', type: 'email', volumePercentage: 45, sla: '4 hours', rules: ['Auto-create ticket', 'Parse subject for priority'] },
          { id: 'ch-2', name: 'Microsoft Teams', type: 'chat', volumePercentage: 35, sla: '15 minutes', rules: ['Real-time response', 'Adaptive cards for actions'] },
          { id: 'ch-3', name: 'Web Portal', type: 'portal', volumePercentage: 20, sla: '5 minutes', rules: ['Self-service options first', 'Form validation'] },
        ],
        skills: {
          skills: [
            { id: 'sk-1', type: 'other', name: 'Password Reset', description: 'Reset user passwords via Active Directory after identity verification', knowledgeSources: ['AD API', 'Identity verification flow'], rules: ['Require OTP verification', 'Log all resets'] },
            { id: 'sk-2', type: 'route', name: 'Ticket Classification', description: 'Classify and route tickets based on content analysis', knowledgeSources: ['ServiceNow categories', 'Historical ticket data'], rules: ['Use NLP for classification', 'Auto-assign to resolver groups'] },
            { id: 'sk-3', type: 'answer', name: 'KB Article Suggestion', description: 'Suggest relevant knowledge base articles for common issues', knowledgeSources: ['ServiceNow KB'], rules: ['Match keywords', 'Rank by relevance'] },
            { id: 'sk-4', type: 'approve_reject', name: 'Access Provisioning', description: 'Provision standard access requests after manager approval', knowledgeSources: ['Okta', 'AD Groups'], rules: ['Verify manager relationship', 'Standard access only'] },
          ],
          communicationStyle: {
            tone: ['Professional', 'Helpful', 'Efficient'],
            languages: ['Dutch', 'English'],
            formality: 'casual',
          },
        },
        process: {
          happyPathSteps: [
            { id: 'ps-1', order: 1, title: 'Receive Request', description: 'User submits request via email, Teams, or portal', isDecisionPoint: false },
            { id: 'ps-2', order: 2, title: 'Classify Request', description: 'NLP analysis to determine request type and priority', isDecisionPoint: true },
            { id: 'ps-3', order: 3, title: 'Verify Identity', description: 'Confirm user identity for sensitive operations', isDecisionPoint: false },
            { id: 'ps-4', order: 4, title: 'Execute Action', description: 'Perform the requested action (reset, provision, route)', isDecisionPoint: false },
            { id: 'ps-5', order: 5, title: 'Confirm Completion', description: 'Notify user and log ticket resolution', isDecisionPoint: false },
          ],
          exceptions: [
            { id: 'ex-1', trigger: 'Identity verification fails', action: 'Escalate to human agent', escalateTo: 'Service Desk Team' },
            { id: 'ex-2', trigger: 'Request type unclear', action: 'Ask clarifying questions', escalateTo: null },
            { id: 'ex-3', trigger: 'Privileged access requested', action: 'Route to approval workflow', escalateTo: 'Security Team' },
          ],
          escalationRules: ['Security incidents: immediate escalation', 'VIP users: priority handling', 'Confidence < 60%: human review'],
          caseTypes: [
            { id: 'ct-1', name: 'Password Reset', volumePercent: 35, complexity: 'LOW', automatable: true, description: 'Standard password reset requests' },
            { id: 'ct-2', name: 'Access Request', volumePercent: 25, complexity: 'MEDIUM', automatable: true, description: 'Standard access provisioning' },
            { id: 'ct-3', name: 'Ticket Classification', volumePercent: 20, complexity: 'LOW', automatable: true, description: 'Route to correct team' },
            { id: 'ct-4', name: 'Security Incident', volumePercent: 10, complexity: 'HIGH', automatable: false, description: 'Requires human investigation' },
            { id: 'ct-5', name: 'Hardware Request', volumePercent: 10, complexity: 'MEDIUM', automatable: false, description: 'Requires procurement approval' },
          ],
        },
        scope: {
          inScope: [
            { id: 'is-1', statement: 'Password resets for all TechCorp employees', conditions: 'After identity verification' },
            { id: 'is-2', statement: 'Ticket classification and routing', conditions: null },
            { id: 'is-3', statement: 'Standard access requests (SharePoint, shared drives)', conditions: 'Manager approval for elevated access' },
            { id: 'is-4', statement: 'First-line troubleshooting for common software issues', conditions: null },
            { id: 'is-5', statement: 'MFA reset requests', conditions: 'After verified identity' },
          ],
          outOfScope: [
            { id: 'os-1', statement: 'Hardware procurement and ordering', conditions: 'Handled by Procurement team' },
            { id: 'os-2', statement: 'Network infrastructure changes', conditions: 'Requires Network team' },
            { id: 'os-3', statement: 'Security incident investigation', conditions: 'Escalate to SOC' },
            { id: 'os-4', statement: 'Privileged access (admin rights)', conditions: 'Requires CISO approval' },
          ],
        },
        guardrails: {
          never: ['Store or display passwords in plain text', 'Grant admin privileges without explicit approval', 'Share user credentials', 'Bypass identity verification'],
          always: ['Verify identity before password/access changes', 'Log all actions for audit', 'Escalate security concerns immediately', 'Provide ticket reference numbers'],
          financialLimits: [],
          legalRestrictions: ['GDPR compliance required', 'EU data residency', 'Audit trail for all changes'],
        },
      },
      // Technical Profile - uses profile-types.ts structure
      technicalProfile: {
        integrations: [
          {
            id: 'int-servicenow',
            systemName: 'ServiceNow',
            purpose: 'Ticket management, CMDB lookup, knowledge base',
            type: 'api',
            authMethod: 'oauth',
            fieldsRead: ['incident.*', 'kb_knowledge.*', 'cmdb_ci.*', 'sys_user.*'],
            fieldsWrite: ['incident.state', 'incident.assigned_to', 'incident.work_notes'],
            status: 'ready',
          },
          {
            id: 'int-ad',
            systemName: 'Microsoft Active Directory',
            purpose: 'User authentication, password resets, group management',
            type: 'api',
            authMethod: 'certificate',
            fieldsRead: ['userPrincipalName', 'displayName', 'department', 'manager'],
            fieldsWrite: ['unicodePwd', 'lockoutTime'],
            status: 'ready',
          },
          {
            id: 'int-teams',
            systemName: 'Microsoft Teams',
            purpose: 'Chat interface, notifications',
            type: 'webhook',
            authMethod: 'oauth',
            fieldsRead: ['messages', 'users', 'presence'],
            fieldsWrite: ['messages', 'adaptiveCards'],
            status: 'ready',
          },
          {
            id: 'int-okta',
            systemName: 'Okta',
            purpose: 'SSO, MFA management, access provisioning',
            type: 'api',
            authMethod: 'api_key',
            fieldsRead: ['users', 'groups', 'apps', 'factors'],
            fieldsWrite: ['users/{id}/lifecycle/reset_factors', 'groups/{id}/users'],
            status: 'ready',
          },
        ],
        dataFields: [
          { id: 'df-1', name: 'ticket_id', source: 'ServiceNow', type: 'string', required: true },
          { id: 'df-2', name: 'user_email', source: 'Active Directory', type: 'string', required: true },
          { id: 'df-3', name: 'department', source: 'Active Directory', type: 'string', required: false },
          { id: 'df-4', name: 'ticket_category', source: 'ServiceNow', type: 'string', required: true },
          { id: 'df-5', name: 'priority', source: 'ServiceNow', type: 'string', required: true },
        ],
        apiEndpoints: [
          { id: 'api-1', name: 'Get Ticket', method: 'GET', path: '/api/now/table/incident/{id}', description: 'Retrieve ticket details' },
          { id: 'api-2', name: 'Update Ticket', method: 'PUT', path: '/api/now/table/incident/{id}', description: 'Update ticket status and notes' },
          { id: 'api-3', name: 'Reset Password', method: 'POST', path: '/api/ad/users/{id}/resetPassword', description: 'Trigger AD password reset' },
          { id: 'api-4', name: 'Provision Access', method: 'POST', path: '/api/v1/groups/{id}/users', description: 'Add user to Okta group' },
        ],
        securityRequirements: [
          { id: 'sec-1', category: 'encryption', requirement: 'All data encrypted at rest and in transit (AES-256, TLS 1.3)', status: 'verified' },
          { id: 'sec-2', category: 'authentication', requirement: 'No storage of passwords or credentials', status: 'verified' },
          { id: 'sec-3', category: 'compliance', requirement: 'GDPR compliant - EU data residency', status: 'verified' },
          { id: 'sec-4', category: 'compliance', requirement: 'SOC 2 Type II compliance required', status: 'implemented' },
        ],
        technicalContacts: [
          { id: 'tc-1', name: 'Thomas de Vries', role: 'Service Desk Manager', system: 'ServiceNow', email: 'thomas.devries@techcorp.nl' },
          { id: 'tc-2', name: 'Linda Jansen', role: 'CISO', system: 'Security', email: 'linda.jansen@techcorp.nl' },
          { id: 'tc-3', name: 'Erik van Dam', role: 'AD Admin', system: 'Active Directory', email: 'erik.vandam@techcorp.nl' },
        ],
        notes: ['All integrations tested in staging environment', 'Production credentials received'],
      },
      // Test Plan
      testPlan: {
        overview: 'Comprehensive UAT covering all ITSM Agent capabilities across channels',
        testCases: [
          {
            id: 'TC-001',
            name: 'Password Reset - Happy Path',
            scenario: 'Employee requests password reset via Teams',
            steps: ['User sends "I forgot my password" via Teams', 'Agent verifies identity via email OTP', 'Agent triggers AD password reset', 'User receives temporary password'],
            expectedResult: 'Password reset completed within 2 minutes',
            status: 'Ready',
          },
          {
            id: 'TC-002',
            name: 'Ticket Classification - Software Issue',
            scenario: 'User reports software crash via email',
            steps: ['Email received with crash description', 'Agent classifies as Software > Application > Crash', 'Agent checks known issues in KB', 'Agent provides workaround or escalates'],
            expectedResult: 'Ticket correctly classified and routed within 1 minute',
            status: 'Ready',
          },
          {
            id: 'TC-003',
            name: 'Access Request - Standard',
            scenario: 'Manager requests SharePoint access for team member',
            steps: ['Request received via webchat', 'Agent validates manager authorization', 'Agent checks if standard access', 'Agent provisions access via Okta'],
            expectedResult: 'Access granted within 5 minutes for standard requests',
            status: 'Ready',
          },
          {
            id: 'TC-004',
            name: 'Escalation - Security Concern',
            scenario: 'User reports suspected phishing email',
            steps: ['User forwards suspicious email', 'Agent detects security keywords', 'Agent immediately escalates to Security team', 'Agent confirms escalation to user'],
            expectedResult: 'Escalation to Security within 30 seconds',
            status: 'Ready',
          },
          {
            id: 'TC-005',
            name: 'Multi-language Support',
            scenario: 'Dutch user sends request in Dutch',
            steps: ['User sends Dutch message', 'Agent detects language', 'Agent responds in Dutch', 'Ticket notes in English for team'],
            expectedResult: 'Seamless Dutch/English handling',
            status: 'Ready',
          },
        ],
        coverage: {
          happyPath: 12,
          edgeCases: 8,
          errorHandling: 6,
          security: 4,
          performance: 3,
        },
      },
    },
  })
  console.log('✅ Created Design Week with profiles')

  // ============================================
  // 5. SESSIONS (4 phases as per UI: Kickoff, Process Design, Technical, Sign-off)
  // ============================================
  const sessions = [
    // Phase 1: Kickoff (1 session)
    { id: 'itsm-session-1', phase: 1, sessionNumber: 1, topics: ['Business context', 'Volume analysis', 'Stakeholder mapping', 'Success metrics', 'KPI targets'] },
    // Phase 2: Process Design (3 sessions)
    { id: 'itsm-session-2', phase: 2, sessionNumber: 1, topics: ['Happy path: Password reset', 'Happy path: Ticket classification', 'Case types', 'Channels'] },
    { id: 'itsm-session-3', phase: 2, sessionNumber: 2, topics: ['Skills: Answer, Route, Reset', 'Brand tone', 'Guardrails', 'Response templates'] },
    { id: 'itsm-session-4', phase: 2, sessionNumber: 3, topics: ['Exception handling', 'Edge cases', 'Escalation triggers'] },
    // Phase 3: Technical (3 sessions)
    { id: 'itsm-session-5', phase: 3, sessionNumber: 1, topics: ['ServiceNow integration', 'Active Directory', 'Authentication flow'] },
    { id: 'itsm-session-6', phase: 3, sessionNumber: 2, topics: ['Okta integration', 'Teams bot setup', 'Security requirements'] },
    { id: 'itsm-session-7', phase: 3, sessionNumber: 3, topics: ['Data mapping', 'Error handling', 'API testing'] },
    // Phase 4: Sign-off (1 session)
    { id: 'itsm-session-8', phase: 4, sessionNumber: 1, topics: ['Final review', 'Sign-off', 'Prerequisites confirmation', 'Go-live planning'] },
  ]

  for (const session of sessions) {
    await prisma.session.upsert({
      where: { id: session.id },
      update: { processingStatus: ProcessingStatus.COMPLETE },
      create: {
        id: session.id,
        designWeekId: designWeek.id,
        phase: session.phase,
        sessionNumber: session.sessionNumber,
        date: new Date(`2026-01-${19 + session.phase}`),
        processingStatus: ProcessingStatus.COMPLETE,
        processedAt: new Date(`2026-01-${19 + session.phase}`),
        topicsCovered: session.topics,
        recordingDuration: 3600 + Math.floor(Math.random() * 1800), // 60-90 minutes
      },
    })
  }
  console.log('✅ Created', sessions.length, 'sessions across 4 phases (all processed)')

  // ============================================
  // 6. SCOPE ITEMS
  // ============================================
  const scopeItems = [
    // IN SCOPE
    { statement: 'Password resets for all TechCorp employees', classification: ScopeClassification.IN_SCOPE, skill: 'Reset Password' },
    { statement: 'Ticket classification and routing based on content analysis', classification: ScopeClassification.IN_SCOPE, skill: 'Classify & Route' },
    { statement: 'First-line troubleshooting for common software issues', classification: ScopeClassification.IN_SCOPE, skill: 'Troubleshoot' },
    { statement: 'Standard access requests (SharePoint, shared drives)', classification: ScopeClassification.IN_SCOPE, skill: 'Provision Access' },
    { statement: 'Status updates on existing tickets', classification: ScopeClassification.IN_SCOPE, skill: 'Status Update' },
    { statement: 'Knowledge base article suggestions', classification: ScopeClassification.IN_SCOPE, skill: 'KB Lookup' },
    { statement: 'Automated ticket creation from emails', classification: ScopeClassification.IN_SCOPE, skill: 'Create Ticket' },
    { statement: 'MFA reset requests via verified identity', classification: ScopeClassification.IN_SCOPE, skill: 'Reset MFA' },
    // OUT OF SCOPE
    { statement: 'Hardware procurement and ordering', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Handled by Procurement team' },
    { statement: 'Network infrastructure changes', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Requires Network team approval' },
    { statement: 'Security incident investigation', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Escalate to Security Operations Center' },
    { statement: 'Contract or license negotiations', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Vendor Management team' },
    { statement: 'Data recovery from backups', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Infrastructure team with manager approval' },
    { statement: 'Privileged access (admin rights)', classification: ScopeClassification.OUT_OF_SCOPE, notes: 'Requires CISO approval workflow' },
  ]

  for (const item of scopeItems) {
    await prisma.scopeItem.create({
      data: {
        designWeekId: designWeek.id,
        statement: item.statement,
        classification: item.classification,
        skill: item.skill || null,
        notes: item.notes || null,
        status: ExtractionStatus.CONFIRMED,
      },
    })
  }
  console.log('✅ Created', scopeItems.length, 'scope items')

  // ============================================
  // 7. SCENARIOS
  // ============================================
  const scenarios = [
    {
      name: 'Password Reset Flow',
      trigger: 'Employee reports forgotten password',
      actor: 'Employee',
      expectedOutcome: 'Password reset completed, user can log in',
      skill: 'Reset Password',
      steps: [
        { order: 1, actor: StepActor.CUSTOMER, action: 'Sends message: "I forgot my password"' },
        { order: 2, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Identifies request type, initiates verification' },
        { order: 3, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Sends OTP to registered email' },
        { order: 4, actor: StepActor.CUSTOMER, action: 'Provides OTP code' },
        { order: 5, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Validates OTP, triggers AD password reset' },
        { order: 6, actor: StepActor.SYSTEM, action: 'AD generates temporary password' },
        { order: 7, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Sends temporary password securely, logs ticket' },
      ],
    },
    {
      name: 'Ticket Classification & Routing',
      trigger: 'New support request received',
      actor: 'Employee',
      expectedOutcome: 'Ticket classified, prioritized, and routed to correct team',
      skill: 'Classify & Route',
      steps: [
        { order: 1, actor: StepActor.CUSTOMER, action: 'Submits support request with description' },
        { order: 2, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Analyzes content using NLP' },
        { order: 3, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Determines category, subcategory, and priority' },
        { order: 4, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Checks for matching KB articles' },
        { order: 5, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Creates ticket in ServiceNow with classification' },
        { order: 6, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Assigns to appropriate resolver group' },
        { order: 7, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Sends confirmation with ticket number and ETA' },
      ],
    },
    {
      name: 'Standard Access Request',
      trigger: 'Manager requests access for team member',
      actor: 'Manager',
      expectedOutcome: 'Access provisioned automatically for standard requests',
      skill: 'Provision Access',
      steps: [
        { order: 1, actor: StepActor.CUSTOMER, action: 'Requests access for team member' },
        { order: 2, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Validates requester is a manager' },
        { order: 3, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Checks if target user reports to requester' },
        { order: 4, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Verifies request is for standard access type' },
        { order: 5, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Provisions access via Okta API' },
        { order: 6, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Logs access grant in audit system' },
        { order: 7, actor: StepActor.DIGITAL_EMPLOYEE, action: 'Notifies both manager and user of completion' },
      ],
    },
  ]

  for (const scenario of scenarios) {
    const created = await prisma.scenario.create({
      data: {
        designWeekId: designWeek.id,
        name: scenario.name,
        trigger: scenario.trigger,
        actor: scenario.actor,
        expectedOutcome: scenario.expectedOutcome,
        skill: scenario.skill,
        successCriteria: ['Request completed within SLA', 'User satisfied', 'Proper logging'],
      },
    })

    for (const step of scenario.steps) {
      await prisma.scenarioStep.create({
        data: {
          scenarioId: created.id,
          order: step.order,
          actor: step.actor,
          action: step.action,
        },
      })
    }
  }
  console.log('✅ Created', scenarios.length, 'scenarios with steps')

  // ============================================
  // 8. KPIs
  // ============================================
  const kpis = [
    { name: 'Automation Rate', description: 'Percentage of tickets fully handled by DE', targetValue: '60%', baselineValue: '0%', measurementMethod: 'ServiceNow reports', owner: 'Sarah van der Berg' },
    { name: 'First Response Time', description: 'Time to first meaningful response', targetValue: '<5 minutes', baselineValue: '4 hours', measurementMethod: 'ServiceNow SLA tracking', owner: 'Thomas de Vries' },
    { name: 'Customer Satisfaction', description: 'Post-resolution CSAT score', targetValue: '4.5/5', baselineValue: '3.2/5', measurementMethod: 'Survey after ticket closure', owner: 'Thomas de Vries' },
    { name: 'Resolution Rate', description: 'Tickets resolved without human intervention', targetValue: '50%', baselineValue: '0%', measurementMethod: 'ServiceNow analytics', owner: 'Sarah van der Berg' },
    { name: 'Average Handling Time', description: 'Time from ticket creation to resolution', targetValue: '15 minutes (automated)', baselineValue: '45 minutes', measurementMethod: 'ServiceNow reports', owner: 'Thomas de Vries' },
    { name: 'Escalation Accuracy', description: 'Correctly escalated tickets', targetValue: '>95%', baselineValue: 'N/A', measurementMethod: 'Weekly audit sample', owner: 'Thomas de Vries' },
  ]

  for (const kpi of kpis) {
    await prisma.kPI.create({
      data: {
        designWeekId: designWeek.id,
        name: kpi.name,
        description: kpi.description,
        targetValue: kpi.targetValue,
        baselineValue: kpi.baselineValue,
        measurementMethod: kpi.measurementMethod,
        owner: kpi.owner,
        frequency: 'Weekly',
        status: ExtractionStatus.CONFIRMED,
      },
    })
  }
  console.log('✅ Created', kpis.length, 'KPIs')

  // ============================================
  // 9. INTEGRATIONS
  // ============================================
  const integrations = [
    {
      systemName: 'ServiceNow',
      purpose: 'Ticket management, CMDB lookup, knowledge base search',
      type: IntegrationType.API,
      authMethod: AuthMethod.OAUTH,
      endpoint: 'https://techcorp.service-now.com/api',
      fieldsRead: ['incident.*', 'kb_knowledge.*', 'cmdb_ci.*', 'sys_user.*'],
      fieldsWrite: ['incident.state', 'incident.assigned_to', 'incident.work_notes', 'incident.resolution_notes'],
      status: IntegrationStatus.READY,
    },
    {
      systemName: 'Microsoft Active Directory',
      purpose: 'User authentication, password resets, group membership',
      type: IntegrationType.API,
      authMethod: AuthMethod.CERTIFICATE,
      endpoint: 'ldaps://ad.techcorp.local',
      fieldsRead: ['userPrincipalName', 'displayName', 'department', 'manager', 'memberOf'],
      fieldsWrite: ['unicodePwd', 'lockoutTime'],
      status: IntegrationStatus.READY,
    },
    {
      systemName: 'Okta',
      purpose: 'SSO, MFA management, access provisioning',
      type: IntegrationType.API,
      authMethod: AuthMethod.API_KEY,
      endpoint: 'https://techcorp.okta.com/api/v1',
      fieldsRead: ['users', 'groups', 'apps', 'factors'],
      fieldsWrite: ['users/{id}/lifecycle/reset_factors', 'groups/{id}/users'],
      status: IntegrationStatus.READY,
    },
    {
      systemName: 'Microsoft Teams',
      purpose: 'Chat interface, notifications, presence',
      type: IntegrationType.WEBHOOK,
      authMethod: AuthMethod.OAUTH,
      endpoint: 'https://graph.microsoft.com/v1.0',
      fieldsRead: ['messages', 'users', 'presence'],
      fieldsWrite: ['messages', 'adaptiveCards'],
      status: IntegrationStatus.READY,
    },
  ]

  const integrationRecords: { id: string; systemName: string }[] = []
  for (const integration of integrations) {
    const created = await prisma.integration.create({
      data: {
        designWeekId: designWeek.id,
        systemName: integration.systemName,
        purpose: integration.purpose,
        type: integration.type,
        authMethod: integration.authMethod,
        endpoint: integration.endpoint,
        fieldsRead: integration.fieldsRead,
        fieldsWrite: integration.fieldsWrite,
        status: integration.status,
        authOwner: 'TechCorp IT',
      },
    })
    integrationRecords.push({ id: created.id, systemName: created.systemName })
  }
  console.log('✅ Created', integrations.length, 'integrations (all ready)')

  // ============================================
  // 10. ESCALATION RULES
  // ============================================
  const escalationRules = [
    { trigger: 'Security-related keywords detected', conditionType: ConditionType.KEYWORD, keywords: ['hacked', 'breach', 'phishing', 'malware', 'virus', 'ransomware'], action: EscalationAction.ESCALATE_IMMEDIATE, priority: Priority.HIGH, handoverContext: ['Original message', 'User email', 'Timestamp', 'IP if available'] },
    { trigger: 'User explicitly requests human agent', conditionType: ConditionType.KEYWORD, keywords: ['speak to human', 'real person', 'supervisor', 'manager'], action: EscalationAction.ESCALATE_WITH_SUMMARY, priority: Priority.MEDIUM, handoverContext: ['Conversation summary', 'User sentiment', 'Attempted resolutions'] },
    { trigger: 'VIP user identified', conditionType: ConditionType.POLICY, keywords: [], action: EscalationAction.ESCALATE_WITH_SUMMARY, priority: Priority.HIGH, handoverContext: ['VIP status', 'Previous interactions', 'Full request details'] },
    { trigger: 'Confidence below threshold', conditionType: ConditionType.CONFIDENCE, keywords: [], threshold: 0.6, action: EscalationAction.ESCALATE_WITH_SUMMARY, priority: Priority.MEDIUM, handoverContext: ['Best guess classification', 'Alternative classifications', 'Original request'] },
    { trigger: 'Request requires privileged access', conditionType: ConditionType.POLICY, keywords: ['admin rights', 'elevated', 'privileged'], action: EscalationAction.ESCALATE_IMMEDIATE, priority: Priority.HIGH, handoverContext: ['Requested access type', 'Business justification', 'Manager approval status'] },
  ]

  for (const rule of escalationRules) {
    await prisma.escalationRule.create({
      data: {
        designWeekId: designWeek.id,
        trigger: rule.trigger,
        conditionType: rule.conditionType,
        keywords: rule.keywords,
        threshold: rule.threshold || null,
        action: rule.action,
        priority: rule.priority,
        handoverContext: rule.handoverContext,
      },
    })
  }
  console.log('✅ Created', escalationRules.length, 'escalation rules')

  // ============================================
  // 11. PREREQUISITES (all received)
  // ============================================
  const prerequisites = [
    { title: 'ServiceNow API Credentials', category: PrerequisiteCategory.API_CREDENTIALS, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Thomas de Vries', integrationName: 'ServiceNow' },
    { title: 'AD Service Account', category: PrerequisiteCategory.SYSTEM_ACCESS, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Linda Jansen', integrationName: 'Microsoft Active Directory' },
    { title: 'Okta API Token', category: PrerequisiteCategory.API_CREDENTIALS, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Linda Jansen', integrationName: 'Okta' },
    { title: 'Teams Bot Registration', category: PrerequisiteCategory.INFRASTRUCTURE, ownerType: PrerequisiteOwner.FREEDAY, ownerName: 'Freeday DevOps', integrationName: 'Microsoft Teams' },
    { title: 'Security Assessment Approval', category: PrerequisiteCategory.SECURITY_APPROVAL, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Linda Jansen', integrationName: null },
    { title: 'DPIA Sign-off', category: PrerequisiteCategory.LEGAL_APPROVAL, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Legal Department', integrationName: null },
    { title: 'Test Environment Access', category: PrerequisiteCategory.SYSTEM_ACCESS, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Thomas de Vries', integrationName: null },
    { title: 'Sample Ticket Data', category: PrerequisiteCategory.TEST_DATA, ownerType: PrerequisiteOwner.CLIENT, ownerName: 'Thomas de Vries', integrationName: null },
  ]

  for (const prereq of prerequisites) {
    const integration = prereq.integrationName
      ? integrationRecords.find((i) => i.systemName === prereq.integrationName)
      : null

    await prisma.prerequisite.create({
      data: {
        designWeekId: designWeek.id,
        title: prereq.title,
        category: prereq.category,
        ownerType: prereq.ownerType,
        ownerName: prereq.ownerName,
        status: PrerequisiteStatus.RECEIVED,
        priority: Priority.HIGH,
        requestedAt: new Date('2026-01-22'),
        receivedAt: new Date('2026-01-28'),
        integrationId: integration?.id || null,
      },
    })
  }
  console.log('✅ Created', prerequisites.length, 'prerequisites (all received)')

  // ============================================
  // 12. SIGN-OFFS (all approved)
  // ============================================
  const signOffs = [
    { stakeholder: 'Sarah van der Berg', role: 'IT Director', comments: 'Approved. Excited to see this go live!' },
    { stakeholder: 'Thomas de Vries', role: 'Service Desk Manager', comments: 'All requirements captured correctly. Team is ready for UAT.' },
    { stakeholder: 'Linda Jansen', role: 'CISO', comments: 'Security requirements met. Approved pending final pen test.' },
    { stakeholder: 'Mark Peters', role: 'HR Business Partner', comments: 'Communication plan approved. Ready for employee rollout.' },
  ]

  for (const signOff of signOffs) {
    await prisma.signOff.create({
      data: {
        designWeekId: designWeek.id,
        stakeholder: signOff.stakeholder,
        role: signOff.role,
        status: SignOffStatus.APPROVED,
        comments: signOff.comments,
      },
    })
  }
  console.log('✅ Created', signOffs.length, 'sign-offs (all approved)')

  // ============================================
  // 13. EXTRACTED ITEMS (sample)
  // ============================================
  const extractedItems = [
    // Phase 1: Kickoff
    { sessionId: 'itsm-session-1', type: ExtractedItemType.STAKEHOLDER, content: 'Sarah van der Berg - IT Director, primary decision maker', confidence: 0.95 },
    { sessionId: 'itsm-session-1', type: ExtractedItemType.GOAL, content: 'Reduce average ticket handling time by 70%', confidence: 0.92 },
    { sessionId: 'itsm-session-1', type: ExtractedItemType.KPI_TARGET, content: 'Automation rate target: 60% of routine tickets', confidence: 0.90 },
    { sessionId: 'itsm-session-1', type: ExtractedItemType.VOLUME_EXPECTATION, content: '2,500 tickets per month, 40% routine', confidence: 0.88 },
    // Phase 2: Process Design (sessions 2-4)
    { sessionId: 'itsm-session-2', type: ExtractedItemType.HAPPY_PATH_STEP, content: 'Step 1: User sends password reset request via Teams', confidence: 0.95 },
    { sessionId: 'itsm-session-2', type: ExtractedItemType.HAPPY_PATH_STEP, content: 'Step 2: Agent verifies identity via email OTP', confidence: 0.93 },
    { sessionId: 'itsm-session-2', type: ExtractedItemType.SCOPE_IN, content: 'Password resets for all employees', confidence: 0.98 },
    { sessionId: 'itsm-session-2', type: ExtractedItemType.SCOPE_OUT, content: 'Hardware procurement - handled by Procurement', confidence: 0.95 },
    { sessionId: 'itsm-session-3', type: ExtractedItemType.GUARDRAIL_NEVER, content: 'Never store or display passwords in plain text', confidence: 0.99 },
    { sessionId: 'itsm-session-3', type: ExtractedItemType.GUARDRAIL_ALWAYS, content: 'Always verify identity before password/access changes', confidence: 0.98 },
    { sessionId: 'itsm-session-3', type: ExtractedItemType.BRAND_TONE, content: 'Professional but friendly, use first names, Dutch or English based on user preference', confidence: 0.90 },
    // Phase 3: Technical (sessions 5-7)
    { sessionId: 'itsm-session-5', type: ExtractedItemType.SYSTEM_INTEGRATION, content: 'ServiceNow - primary ticket management system, REST API available', confidence: 0.95 },
    { sessionId: 'itsm-session-5', type: ExtractedItemType.SECURITY_REQUIREMENT, content: 'All data must be encrypted at rest and in transit', confidence: 0.97 },
    { sessionId: 'itsm-session-6', type: ExtractedItemType.SYSTEM_INTEGRATION, content: 'Okta for SSO and MFA management', confidence: 0.94 },
    // Phase 4: Sign-off (session 8)
    { sessionId: 'itsm-session-8', type: ExtractedItemType.DECISION, content: 'Go-live date set for March 15, 2026', confidence: 0.99 },
    { sessionId: 'itsm-session-8', type: ExtractedItemType.APPROVAL, content: 'Design document approved by all stakeholders', confidence: 0.98 },
  ]

  for (const item of extractedItems) {
    await prisma.extractedItem.create({
      data: {
        sessionId: item.sessionId,
        type: item.type,
        content: item.content,
        confidence: item.confidence,
        status: ReviewStatus.APPROVED,
        reviewedAt: new Date('2026-01-30'),
        reviewedBy: 'Sophie Martinez',
      },
    })
  }
  console.log('✅ Created', extractedItems.length, 'extracted items')

  // ============================================
  // SUMMARY
  // ============================================
  console.log('')
  console.log('🎉 ========================================')
  console.log('🎉 ITSM Agent seed complete!')
  console.log('🎉 ========================================')
  console.log('')
  console.log('📊 Summary:')
  console.log('   Company:        TechCorp Solutions')
  console.log('   Digital Employee: ITSM Agent')
  console.log('   Status:         Design Week COMPLETE ✅')
  console.log('')
  console.log('   Sessions:       8 (all processed)')
  console.log('   Scope Items:    ' + scopeItems.length)
  console.log('   Scenarios:      ' + scenarios.length)
  console.log('   KPIs:           ' + kpis.length)
  console.log('   Integrations:   ' + integrations.length + ' (all ready)')
  console.log('   Prerequisites:  ' + prerequisites.length + ' (all received)')
  console.log('   Sign-offs:      ' + signOffs.length + ' (all approved)')
  console.log('')
  console.log('🔗 Test URLs:')
  console.log(`   Dashboard:  http://localhost:3001`)
  console.log(`   Company:    http://localhost:3001/companies/${company.id}`)
  console.log(`   DE Detail:  http://localhost:3001/companies/${company.id}/digital-employees/${digitalEmployee.id}`)
  console.log(`   Portfolio:  http://localhost:3001/portfolio`)
  console.log('')
  console.log('📄 Ready to test exports:')
  console.log('   - DE Design Document (PDF)')
  console.log('   - Meet Your DE Document')
  console.log('   - Test Plan')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
