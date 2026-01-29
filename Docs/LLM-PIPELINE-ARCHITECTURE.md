# LLM Pipeline Architecture

## Overview

Dit document beschrijft de AI/LLM pipelines voor het Onboarding Command Center - van session extractie tot document generatie.

---

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DESIGN WEEK LLM PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  SESSION INPUT              EXTRACTION                 DOCUMENT GENERATION      │
│  ══════════════            ═══════════                ═════════════════════     │
│                                                                                 │
│  ┌─────────────┐     ┌──────────────────┐     ┌────────────────────────────┐   │
│  │   Audio     │     │                  │     │                            │   │
│  │   Upload    │────▶│   Transcribe     │     │   DE Design Generator      │──▶│ DE Design.md
│  │             │     │   (Whisper/      │     │   (Claude)                 │   │
│  └─────────────┘     │    Gemini)       │     │                            │   │
│                      │                  │     └────────────────────────────┘   │
│  ┌─────────────┐     └────────┬─────────┘                                      │
│  │  Document   │              │              ┌────────────────────────────┐   │
│  │  Upload     │──────────────┤              │                            │   │
│  │  (PDF/Doc)  │              │              │   Solution Design Gen      │──▶│ Solution.md
│  └─────────────┘              ▼              │   (Claude)                 │   │
│                      ┌──────────────────┐    │                            │   │
│  ┌─────────────┐     │                  │    └────────────────────────────┘   │
│  │   Notes     │     │    EXTRACTORS    │                                      │
│  │   (Manual)  │────▶│                  │    ┌────────────────────────────┐   │
│  │             │     │  Per Session Type│    │                            │   │
│  └─────────────┘     │  (Claude)        │    │   Test Plan Generator      │──▶│ TestPlan.md
│                      │                  │    │   (Claude)                 │   │
│                      └────────┬─────────┘    │                            │   │
│                               │              └────────────────────────────┘   │
│                               ▼                                                │
│                      ┌──────────────────┐                                      │
│                      │   SCOPE ITEMS    │                                      │
│                      │   (Database)     │                                      │
│                      │                  │                                      │
│                      │  • In Scope      │◀─── Sophie Reviews & Edits           │
│                      │  • Out of Scope  │                                      │
│                      │  • Needs Clarity │                                      │
│                      │  • Business Rules│                                      │
│                      │  • Guardrails    │                                      │
│                      │  • Technical Req │                                      │
│                      └──────────────────┘                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## LLM Prompts Per Stap

### Pipeline 1: Session Extraction

Voor elke sessie type hebben we een specifieke extraction prompt nodig:

| Sessie Type | Extraction Focus | Output Types |
|-------------|------------------|--------------|
| **Kickoff** | Goals, stakeholders, KPIs, timeline | STAKEHOLDER, KPI, GOAL, CONSTRAINT, TIMELINE |
| **Process Design** | Happy path, exceptions, scope items | SCOPE_IN, SCOPE_OUT, SCOPE_UNCLEAR, PROCESS_STEP, BUSINESS_RULE |
| **Technical** | Systems, integrations, data fields | SYSTEM, INTEGRATION, DATA_FIELD, CREDENTIAL, API_SPEC |
| **Sign-off** | Confirmations, outstanding items | CONFIRMATION, OUTSTANDING_ITEM, DECISION |

---

### Pipeline 2: Document Generation

Drie document generators, elk met eigen prompt:

| Document | Model | Prompt Focus | Input |
|----------|-------|--------------|-------|
| **DE Design** | Claude | Business-friendly, client sign-off | Extracted scope items + template structure |
| **Solution Design** | Claude | Technical detail, engineering specs | Extracted technical items + integrations |
| **Test Plan** | Claude | Test scenarios from scope/rules | Scope items + business rules + guardrails |

---

## Prompt Library

### 1. Extraction Prompts

#### 1.1 Kickoff Session Extractor

```yaml
prompt_id: extract_kickoff
model: claude-sonnet-4-20250514
temperature: 0.1
purpose: Extract key information from kickoff session transcript

system_prompt: |
  You are an expert at extracting structured information from Design Week
  kickoff session transcripts for Digital Employee implementations.

  Your task is to identify and extract:
  1. STAKEHOLDERS - People mentioned, their roles, and responsibilities
  2. GOALS - Project objectives and desired outcomes
  3. KPIs - Success metrics and targets mentioned
  4. CONSTRAINTS - Limitations, deadlines, budget references
  5. TIMELINE - Any dates or phases mentioned
  6. VOLUME - Transaction volumes, case counts, FTE numbers
  7. PAIN_POINTS - Current problems being solved

  For each extracted item, provide:
  - type: The category (STAKEHOLDER, GOAL, KPI, etc.)
  - content: The extracted information
  - context: The surrounding text that provides context
  - confidence: Your confidence score (0.0-1.0)
  - speaker: Who said it (if identifiable)
  - timestamp: Approximate location in transcript (if available)

output_format: |
  {
    "session_summary": "Brief summary of the kickoff session",
    "extracted_items": [
      {
        "type": "STAKEHOLDER",
        "content": "Ellen - IT contact at ATAG",
        "context": "Ellen will be our main point of contact for technical matters...",
        "confidence": 0.95,
        "speaker": "Philip",
        "timestamp": "00:05:23"
      }
    ],
    "unclear_items": [
      {
        "topic": "Budget",
        "question": "No specific budget was mentioned - should we clarify?",
        "suggested_followup": "What is the budget for this implementation?"
      }
    ]
  }
```

---

#### 1.2 Process Design Session Extractor

```yaml
prompt_id: extract_process_design
model: claude-sonnet-4-20250514
temperature: 0.1
purpose: Extract process and scope information from process design sessions

system_prompt: |
  You are an expert at extracting process design information from Design Week
  sessions for Digital Employee implementations.

  Your task is to identify and extract:

  SCOPE ITEMS:
  - SCOPE_IN: Things the DE will handle (with confidence level)
  - SCOPE_OUT: Things explicitly excluded (with reason)
  - SCOPE_UNCLEAR: Items needing clarification

  PROCESS ELEMENTS:
  - PROCESS_STEP: Steps in the workflow
  - BUSINESS_RULE: Conditions and logic ("if X then Y")
  - EXCEPTION: Edge cases and how to handle them
  - ESCALATION: When and how to escalate to humans

  GUARDRAILS:
  - MUST_DO: Things the DE must always do
  - MUST_NOT_DO: Things the DE must never do

  Pay special attention to:
  - Explicit statements: "This is in scope" / "This is out of scope"
  - Implicit boundaries: Topics discussed vs. topics avoided
  - Conditional logic: "If customer says X, then do Y"
  - Escalation triggers: "Always escalate when..."

output_format: |
  {
    "session_summary": "Brief summary of process design session",
    "scope_items": {
      "in_scope": [...],
      "out_of_scope": [...],
      "needs_clarification": [...]
    },
    "process_steps": [...],
    "business_rules": [...],
    "guardrails": {
      "must_do": [...],
      "must_not_do": [...]
    },
    "escalation_triggers": [...]
  }
```

---

#### 1.3 Technical Session Extractor

```yaml
prompt_id: extract_technical
model: claude-sonnet-4-20250514
temperature: 0.1
purpose: Extract technical requirements from technical deep-dive sessions

system_prompt: |
  You are an expert at extracting technical requirements from Design Week
  technical sessions for Digital Employee implementations.

  Your task is to identify and extract:

  SYSTEMS:
  - SYSTEM: External systems mentioned (CRM, ERP, etc.)
  - INTEGRATION: How systems connect (API, webhook, polling)
  - DATA_FIELD: Specific fields, schemas, data types

  ACCESS:
  - CREDENTIAL: Login details, API keys needed
  - PERMISSION: Access levels required
  - ENVIRONMENT: Dev/staging/production URLs

  TECHNICAL SPECS:
  - API_SPEC: Endpoints, methods, payloads
  - QUEUE: Queue names, IDs, routing
  - WORKFLOW: Technical process flows

  Also capture:
  - ACTION_ITEM: Technical tasks to be done
  - DEPENDENCY: Things that block progress
  - RISK: Technical risks or concerns mentioned

output_format: |
  {
    "systems": [...],
    "integrations": [...],
    "data_fields": [...],
    "credentials_needed": [...],
    "api_specifications": [...],
    "queues": [...],
    "action_items": [...],
    "technical_risks": [...]
  }
```

---

#### 1.4 Sign-off Session Extractor

```yaml
prompt_id: extract_signoff
model: claude-sonnet-4-20250514
temperature: 0.1
purpose: Extract confirmations and decisions from sign-off sessions

system_prompt: |
  You are an expert at extracting sign-off information from Design Week
  final sessions for Digital Employee implementations.

  Your task is to identify and extract:

  CONFIRMATIONS:
  - SCOPE_CONFIRMED: Scope items explicitly confirmed
  - RULE_CONFIRMED: Business rules confirmed
  - APPROVAL: Go/no-go decisions

  OUTSTANDING:
  - OUTSTANDING_ITEM: Things still to be resolved
  - FOLLOWUP_NEEDED: Actions required before go-live

  DECISIONS:
  - DECISION: Key decisions made with rationale
  - CHANGE: Changes from previous understanding

  Pay attention to:
  - Explicit approvals: "Yes, that's correct"
  - Concerns raised: "I'm worried about..."
  - Conditions: "We can proceed if..."

output_format: |
  {
    "confirmed_items": [...],
    "outstanding_items": [...],
    "decisions": [...],
    "conditions_for_golive": [...],
    "next_steps": [...]
  }
```

---

### 2. Document Generation Prompts

#### 2.1 DE Design Generator

```yaml
prompt_id: generate_de_design
model: claude-sonnet-4-20250514
temperature: 0.3
purpose: Generate client-facing Digital Employee Design document

system_prompt: |
  You are a professional technical writer creating a Digital Employee Design
  document for a client. This document will be used for client sign-off.

  TONE & STYLE:
  - Professional but approachable
  - Clear, jargon-free language that business stakeholders understand
  - Use concrete examples to illustrate capabilities
  - Be precise about what IS and IS NOT in scope

  DOCUMENT STRUCTURE:
  Follow the provided template structure exactly. Fill in each section
  based on the extracted information provided.

  IMPORTANT GUIDELINES:
  - Guardrails section must be comprehensive - this protects the client
  - Success metrics must be specific and measurable
  - Scope boundaries must be crystal clear
  - Use tables and visual formatting for readability
  - Include sign-off section at the end

  If information is missing for a section, mark it as [TO BE CONFIRMED]
  rather than making assumptions.

input_format: |
  {
    "client_name": "...",
    "de_name": "...",
    "extracted_data": {
      "stakeholders": [...],
      "goals": [...],
      "kpis": [...],
      "scope_in": [...],
      "scope_out": [...],
      "business_rules": [...],
      "guardrails": [...],
      "channels": [...],
      "timeline": [...]
    },
    "template": "..."
  }
```

---

#### 2.2 Solution Design Generator

```yaml
prompt_id: generate_solution_design
model: claude-sonnet-4-20250514
temperature: 0.2
purpose: Generate technical Solution Design document

system_prompt: |
  You are a senior solutions architect creating a technical Solution Design
  document for a Digital Employee implementation.

  AUDIENCE: Implementation engineers, support team, technical stakeholders

  TONE & STYLE:
  - Highly technical and precise
  - Include code snippets, YAML configs, and diagrams where appropriate
  - Use proper technical terminology
  - Be specific about models, endpoints, and configurations

  DOCUMENT STRUCTURE:
  Follow the provided template structure. Include:
  - Architecture diagrams (as ASCII/Mermaid)
  - API specifications
  - Data models
  - Classification schemas
  - Prompt templates (full text)
  - Monitoring configuration
  - Error handling strategies
  - Support runbook

  IMPORTANT:
  - All queue IDs and system identifiers must be included
  - Prompt templates should be complete and usable
  - Include confidence thresholds and fallback logic
  - Document all integrations with full technical specs

input_format: |
  {
    "de_name": "...",
    "extracted_data": {
      "systems": [...],
      "integrations": [...],
      "data_fields": [...],
      "queues": [...],
      "api_specs": [...],
      "business_rules": [...],
      "escalation_triggers": [...]
    },
    "template": "..."
  }
```

---

#### 2.3 Test Plan Generator

```yaml
prompt_id: generate_test_plan
model: claude-sonnet-4-20250514
temperature: 0.3
purpose: Generate client-friendly Test Plan document

system_prompt: |
  You are a QA specialist creating a Test Plan document that will be used
  by both the implementation team and client stakeholders.

  TONE & STYLE:
  - Clear and accessible to non-technical readers
  - Specific enough that anyone can execute the tests
  - Include concrete examples for each scenario

  TEST SCENARIO GENERATION:
  Based on the scope items and business rules, generate:

  1. HAPPY PATH tests - For each "in scope" item, create a test that
     verifies it works correctly

  2. EDGE CASE tests - For each business rule with conditions, create
     tests for the boundary conditions

  3. BOUNDARY tests - For each "guardrail" / "must not do" item, create
     a test that verifies the DE correctly refuses or escalates

  4. ROUTING tests - For each queue/routing rule, create a test that
     verifies correct routing

  Each test scenario needs:
  - ID (e.g., HP-01, EC-01, BT-01, RT-01)
  - Scenario name
  - Customer action (what they do)
  - Expected behavior (what DE should do)
  - Pass criteria (how to know it passed)

input_format: |
  {
    "de_name": "...",
    "scope_in": [...],
    "scope_out": [...],
    "business_rules": [...],
    "guardrails": [...],
    "routing_rules": [...],
    "template": "..."
  }
```

---

## App Integration

### Data Model Updates

```prisma
// Add to schema.prisma

model PromptTemplate {
  id            String   @id @default(cuid())
  name          String   // e.g., "extract_kickoff"
  type          PromptType
  model         String   // e.g., "claude-sonnet-4-20250514"
  temperature   Float    @default(0.3)
  systemPrompt  String   @db.Text
  outputFormat  String?  @db.Text
  version       Int      @default(1)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // For A/B testing
  usageCount    Int      @default(0)
  successRate   Float?
}

enum PromptType {
  EXTRACT_KICKOFF
  EXTRACT_PROCESS
  EXTRACT_TECHNICAL
  EXTRACT_SIGNOFF
  GENERATE_DE_DESIGN
  GENERATE_SOLUTION
  GENERATE_TEST_PLAN
}

model ExtractedItem {
  id            String   @id @default(cuid())
  sessionId     String
  session       Session  @relation(fields: [sessionId], references: [id])

  type          ItemType
  content       String
  context       String?  @db.Text
  confidence    Float
  speaker       String?
  timestamp     String?

  // Review status
  status        ReviewStatus @default(PENDING)
  reviewedBy    String?
  reviewedAt    DateTime?
  editedContent String?

  createdAt     DateTime @default(now())
}

enum ItemType {
  // Kickoff
  STAKEHOLDER
  GOAL
  KPI
  CONSTRAINT
  TIMELINE
  VOLUME
  PAIN_POINT

  // Process Design
  SCOPE_IN
  SCOPE_OUT
  SCOPE_UNCLEAR
  PROCESS_STEP
  BUSINESS_RULE
  EXCEPTION
  ESCALATION

  // Guardrails
  MUST_DO
  MUST_NOT_DO

  // Technical
  SYSTEM
  INTEGRATION
  DATA_FIELD
  CREDENTIAL
  API_SPEC
  QUEUE

  // Sign-off
  CONFIRMATION
  OUTSTANDING_ITEM
  DECISION
  ACTION_ITEM
}

enum ReviewStatus {
  PENDING
  ACCEPTED
  REJECTED
  EDITED
}

model GeneratedDocument {
  id                String   @id @default(cuid())
  digitalEmployeeId String
  digitalEmployee   DigitalEmployee @relation(fields: [digitalEmployeeId], references: [id])

  type              DocumentType
  version           Int      @default(1)
  content           String   @db.Text

  // Generation metadata
  promptTemplateId  String
  modelUsed         String
  generatedAt       DateTime @default(now())

  // Approval
  status            DocumentStatus @default(DRAFT)
  approvedBy        String?
  approvedAt        DateTime?

  // For regeneration
  sourceItems       String[] // IDs of ExtractedItems used
}

enum DocumentType {
  DE_DESIGN
  SOLUTION_DESIGN
  TEST_PLAN
}

enum DocumentStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  SUPERSEDED
}
```

---

### API Routes

```
/api/prompts
├── GET    /                    - List all prompt templates
├── GET    /:id                 - Get specific prompt
├── PUT    /:id                 - Update prompt (creates new version)
├── POST   /:id/test            - Test prompt with sample input
└── GET    /:id/versions        - Get version history

/api/sessions/:id/extract
├── POST   /                    - Trigger extraction for session
├── GET    /status              - Get extraction status
└── GET    /items               - Get extracted items

/api/digital-employees/:id/documents
├── POST   /generate            - Generate document
├── GET    /:docId              - Get document
├── PUT    /:docId              - Update document
├── POST   /:docId/approve      - Approve document
└── POST   /:docId/regenerate   - Regenerate with updated items
```

---

### Settings Page UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings > Prompt Templates                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Extraction Prompts                                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────┬─────────────────┬──────────┬─────────┬──────┐ │   │
│  │  │ Prompt          │ Model           │ Version  │ Success │      │ │   │
│  │  ├─────────────────┼─────────────────┼──────────┼─────────┼──────┤ │   │
│  │  │ Kickoff         │ claude-sonnet   │ v3       │ 94%     │ Edit │ │   │
│  │  │ Process Design  │ claude-sonnet   │ v2       │ 91%     │ Edit │ │   │
│  │  │ Technical       │ claude-sonnet   │ v2       │ 89%     │ Edit │ │   │
│  │  │ Sign-off        │ claude-sonnet   │ v1       │ 95%     │ Edit │ │   │
│  │  └─────────────────┴─────────────────┴──────────┴─────────┴──────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Generation Prompts                                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────┬─────────────────┬──────────┬─────────┬──────┐ │   │
│  │  │ Prompt          │ Model           │ Version  │ Success │      │ │   │
│  │  ├─────────────────┼─────────────────┼──────────┼─────────┼──────┤ │   │
│  │  │ DE Design       │ claude-sonnet   │ v4       │ 87%     │ Edit │ │   │
│  │  │ Solution Design │ claude-sonnet   │ v3       │ 85%     │ Edit │ │   │
│  │  │ Test Plan       │ claude-sonnet   │ v2       │ 92%     │ Edit │ │   │
│  │  └─────────────────┴─────────────────┴──────────┴─────────┴──────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Edit Prompt: Kickoff Extraction                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Model:        [claude-sonnet-4-20250514    ▼]                              │
│  Temperature:  [0.1          ]                                              │
│                                                                             │
│  System Prompt:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ You are an expert at extracting structured information from         │   │
│  │ Design Week kickoff session transcripts...                          │   │
│  │                                                                      │   │
│  │ Your task is to identify and extract:                               │   │
│  │ 1. STAKEHOLDERS - People mentioned...                               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Output Format:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                    │   │
│  │   "session_summary": "...",                                         │   │
│  │   "extracted_items": [...]                                          │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Test with Sample]  [Save as Draft]  [Publish New Version]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Model Selection

### Recommended: Claude for All

| Use Case | Model | Reasoning |
|----------|-------|-----------|
| **Extraction** | `claude-sonnet-4-20250514` | Best at understanding context, nuance, and implicit information |
| **DE Design Generation** | `claude-sonnet-4-20250514` | Excellent at professional writing with proper tone |
| **Solution Design Generation** | `claude-sonnet-4-20250514` | Strong technical writing, code generation |
| **Test Plan Generation** | `claude-sonnet-4-20250514` | Good at systematic thinking, edge cases |

### Why Claude over Gemini?

1. **Better at ambiguity** - Design Week sessions are messy, Claude handles this well
2. **Superior writing quality** - Documents need to be professional and clear
3. **Stronger reasoning** - For deriving test cases from business rules
4. **More consistent** - Important for document generation

### Cost Consideration

```
Estimated costs per Digital Employee:

Sessions (4-8 total):
- Transcription: ~$0.50/session (if using Whisper)
- Extraction: ~$0.30/session (Claude input + output)
  Subtotal: ~$3-6

Document Generation:
- DE Design: ~$0.50 (large output)
- Solution Design: ~$0.80 (larger output)
- Test Plan: ~$0.40
  Subtotal: ~$1.70

Total per DE: ~$5-8
```

---

## Processing Pipeline

### 1. Session Processing Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      SESSION PROCESSING                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. UPLOAD                                                               │
│     └─▶ Sophie uploads audio/document/notes                              │
│     └─▶ System detects file type                                         │
│                                                                          │
│  2. TRANSCRIBE (if audio)                                                │
│     └─▶ Send to Whisper/Gemini for transcription                        │
│     └─▶ Store transcript with timestamps                                 │
│     └─▶ Status: TRANSCRIBED                                              │
│                                                                          │
│  3. EXTRACT                                                              │
│     └─▶ Determine session type (kickoff/process/technical/signoff)       │
│     └─▶ Load appropriate extraction prompt                               │
│     └─▶ Send transcript + prompt to Claude                               │
│     └─▶ Parse structured output                                          │
│     └─▶ Store ExtractedItems in database                                 │
│     └─▶ Status: EXTRACTED                                                │
│                                                                          │
│  4. REVIEW                                                               │
│     └─▶ Sophie sees extracted items in UI                                │
│     └─▶ For each item: Accept / Edit / Reject / Move category            │
│     └─▶ Add manual items if AI missed something                          │
│     └─▶ Status: REVIEWED                                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2. Document Generation Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT GENERATION                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. TRIGGER                                                              │
│     └─▶ Sophie clicks "Generate DE Design"                               │
│     └─▶ System checks: All required sessions reviewed?                   │
│                                                                          │
│  2. AGGREGATE                                                            │
│     └─▶ Collect all ACCEPTED ExtractedItems                              │
│     └─▶ Group by type (scope, rules, technical, etc.)                    │
│     └─▶ Include any manual items added by Sophie                         │
│                                                                          │
│  3. GENERATE                                                             │
│     └─▶ Load document template                                           │
│     └─▶ Load generation prompt                                           │
│     └─▶ Send aggregated data + template + prompt to Claude               │
│     └─▶ Receive generated markdown                                       │
│                                                                          │
│  4. STORE                                                                │
│     └─▶ Save as GeneratedDocument (DRAFT)                                │
│     └─▶ Link to source ExtractedItems (for traceability)                 │
│                                                                          │
│  5. REVIEW & APPROVE                                                     │
│     └─▶ Sophie reviews generated document                                │
│     └─▶ Can edit directly or regenerate                                  │
│     └─▶ When ready: Mark as APPROVED                                     │
│     └─▶ Export to PDF/Word for client                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Manual Templates + Basic Extraction
- Upload session notes (text/PDF)
- Extract with single generic prompt
- Manual document creation with template

### Phase 2: Session-Specific Extraction
- Different prompts per session type
- Sophie review UI for extracted items
- Semi-automated document generation

### Phase 3: Full Pipeline
- Audio transcription
- Confidence scoring
- Evidence linking (timestamps)
- Prompt versioning and A/B testing
- Document comparison/versioning

---

## Next Steps

1. **Update Prisma schema** with new models
2. **Create extraction prompts** for each session type
3. **Build Settings UI** for prompt management
4. **Implement extraction API** with Claude
5. **Build Sophie's review UI** for extracted items
6. **Implement document generation** with templates
