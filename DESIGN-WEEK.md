# Design Week Workflow Specification

This document details how the Design Week module works in the Onboarding Command Center.

## Overview

Design Week is the structured process for capturing requirements for a new Digital Employee. The goal is **minimum admin work for Sophie, maximum output** in terms of documentation and clarity.

### Current Pain Point

Today: Sophie attends sessions → takes manual notes → manually creates standardized documents

This is time-consuming and error-prone.

### Target Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. SESSION          2. UPLOAD           3. REVIEW          4. DONE │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌──────┐ │
│  │ Attend  │   →    │ Upload  │   →    │ Review  │   →    │ Docs │ │
│  │ session │        │ audio   │        │ AI      │        │ auto-│ │
│  │         │        │         │        │ extract │        │ gen  │ │
│  └─────────┘        └─────────┘        └─────────┘        └──────┘ │
│                                                                     │
│  Sophie focuses     System does        Sophie validates    System   │
│  on the client      the work           & refines          compiles  │
└─────────────────────────────────────────────────────────────────────┘
```

## Session Types

### Kickoff (1 session)

**Purpose:** Align on goals, stakeholders, and expectations

**AI Extracts:**
- Goals & success metrics
- Stakeholders & roles identified
- Timeline expectations
- Current pain points
- Volume expectations (cases/day, peak times)
- High-level scope boundaries mentioned

**Standard Questions:**
- What problem are we solving?
- Who are the key stakeholders?
- What does success look like?
- What's the expected volume?
- What's the timeline expectation?
- Any hard constraints or non-negotiables?

---

### Process Design (2-3 sessions)

**Purpose:** Map the detailed workflow and define scope

**AI Extracts:**
- Happy path workflow steps
- Exception scenarios
- Business rules / conditions
- Scope items: IN (with confidence)
- Scope items: OUT (with reason)
- Scope items: UNCLEAR (needs clarification)
- Handoff/escalation points
- Edge cases discussed

**Standard Questions:**
- What triggers this process?
- Walk me through a typical case end-to-end
- What information is collected at each step?
- How does the process end?
- What happens if [X] is missing?
- What types of requests do you NOT handle?
- When do you escalate?
- What are the most common exceptions?

---

### Technical Deep-dive (2-3 sessions)

**Purpose:** Define integration and system requirements

**AI Extracts:**
- Systems to integrate with
- Data fields / schemas mentioned
- APIs / credentials needed
- Authentication requirements
- Security / compliance mentions
- Access / permissions needed
- Technical constraints
- Data flows

**Standard Questions:**
- What systems does this touch?
- Where does the data come from?
- Where does the data need to go?
- What credentials/access do we need?
- Any security or compliance requirements?
- Who owns the technical relationship?

---

### Sign-off (1 session)

**Purpose:** Final validation and approval

**AI Extracts:**
- Final scope confirmations
- Outstanding items resolved
- Go/no-go decisions
- Sign-off approvals (who approved)
- Next steps confirmed
- Remaining concerns

**Standard Questions:**
- Is the scope complete and accurate?
- Are there any outstanding concerns?
- Who is signing off on behalf of the client?
- What are the immediate next steps?

---

## Data Model

### Session
```
Session {
  id
  digitalEmployeeId
  type: KICKOFF | PROCESS_DESIGN | TECHNICAL | SIGNOFF
  sessionNumber: number (e.g., Process Design 2 of 3)
  date
  audioUrl
  transcriptUrl (generated)
  status: PENDING | PROCESSING | PROCESSED | REVIEWED
  confidence: number (AI confidence score)
  attendees: string[]
}
```

### Extracted Item
```
ExtractedItem {
  id
  sessionId
  type: SCOPE_IN | SCOPE_OUT | SCOPE_UNCLEAR | PROCESS_STEP |
        BUSINESS_RULE | TECHNICAL_REQ | KPI | STAKEHOLDER
  content: string
  context: string (surrounding context from transcript)
  timestampSeconds: number
  confidence: number
  status: PENDING_REVIEW | ACCEPTED | REJECTED | EDITED
  reviewedBy: userId
  reviewedAt: timestamp
}
```

### Scope Item (Merged View)
```
ScopeItem {
  id
  digitalEmployeeId
  category: IN_SCOPE | OUT_OF_SCOPE | NEEDS_CLARIFICATION
  title: string
  description: string
  evidence: ExtractedItem[] (links to source extractions)
  resolvedAt: timestamp (for NEEDS_CLARIFICATION items)
  resolvedBy: userId
  resolution: string
}
```

---

## UI Flows

### Session Upload

1. Sophie selects DE → clicks "Add Session"
2. Uploads audio file (MP3, WAV, M4A, WEBM)
3. Selects session type and number
4. Adds attendees
5. Clicks "Upload & Process"
6. System processes in background, notifies when done

### Sophie's Review Flow

After AI processing:

1. Session shows "Ready for Review" status
2. Sophie sees extracted items grouped by type
3. For each item:
   - **Accept**: Confirms AI extraction is correct
   - **Edit**: Modifies the text
   - **Move**: Changes category (e.g., IN → OUT)
   - **Reject**: Removes item entirely
   - **Play**: Jumps to timestamp in audio
4. Can add manual items not caught by AI
5. Marks session as "Reviewed" when done

### Marcus's Review Flow (Client Confirmation)

Simpler view for client stakeholders:

1. Sees list of scope items (IN / OUT / UNCLEAR)
2. For each item:
   - **Looks correct**: Confirms
   - **Needs discussion**: Flags for Sophie
3. Can play audio clips for context
4. Flagged items return to Sophie's queue

### Scope Guardian (Aggregate View)

Shows all scope items across all sessions:

- Completeness percentage
- Items needing clarification (must resolve before sign-off)
- IN scope items (grouped, with evidence links)
- OUT of scope items (with reasons)
- Filter by session, confidence, status

---

## Document Generation

When Design Week is complete (all items reviewed, clarifications resolved):

### Process Intake Document
**Audience:** Implementation Engineers
**Contains:**
- Scope summary (in/out)
- Happy path workflow
- Exception scenarios
- Business rules
- Escalation criteria
- KPIs / success metrics

### Technical Intake Document
**Audience:** Implementation Engineers
**Contains:**
- Systems overview
- Integration requirements
- Data fields / schemas
- API specifications
- Credentials needed
- Security requirements

### Support Runbook
**Audience:** Thomas / Freeday Support
**Contains:**
- Scope quick reference (in/out)
- Common issues and resolutions
- Escalation paths
- What's NOT in scope (important for support)

### UAT Test Scripts (Optional)
**Audience:** QA / Client
**Contains:**
- Test scenarios based on scope items
- Happy path test cases
- Exception test cases
- Expected outcomes

---

## Evidence Linking

Every scope item links back to its source:

```
Scope Item: "Standard claims under €5000"
├── Source: Process Design Session 2
├── Timestamp: 12:34
├── Confidence: 94%
├── Context: "Marcus confirmed these are the bread and butter..."
└── [Play Audio Clip]
```

This enables:
- Sophie to verify extractions quickly
- Marcus to hear what was actually said
- Thomas to understand why something is/isn't in scope
- Audit trail for disputes

---

## Completeness Tracking

Design Week is "complete" when:

1. All session phases have at least one processed session
2. All extracted items have been reviewed
3. All NEEDS_CLARIFICATION items are resolved
4. Sign-off session is completed and reviewed

Progress shown as:
- Overall percentage
- Per-phase status (complete/in-progress/not-started)
- Items needing attention count

---

## AI Processing Pipeline

```
Audio Upload
    ↓
Transcription (Gemini or dedicated service)
    ↓
Session-Type-Specific Extraction Prompt
    ↓
Structured Output (items with timestamps, confidence)
    ↓
Store as ExtractedItems
    ↓
Ready for Review
```

### Extraction Prompts

Each session type has a tailored prompt that:
1. Knows what to look for (based on session type)
2. Extracts with timestamps
3. Provides confidence scores
4. Captures context around each extraction
5. Identifies unclear/ambiguous statements

---

## Future Enhancements

- **Pre-session question checklist**: Sophie sees what to cover before each session
- **Follow-up tracking**: Items from previous sessions that need follow-up
- **Real-time extraction**: Process during the session (stretch goal)
- **Multi-language support**: Dutch/English sessions
- **Notion sync**: Push generated docs directly to Notion
