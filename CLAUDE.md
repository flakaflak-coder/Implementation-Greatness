# CLAUDE.md - Development Context

## Project Overview

Onboarding Command Center (OCC) is an internal tool for **Freeday** to manage Digital Employee (AI agent) implementations from design through live monitoring.

## Core Concepts

### Data Hierarchy
```
Company → Digital Employee(s) → Lifecycle Stage
```

- **Company**: Client organization (e.g., Acme Insurance)
- **Digital Employee (DE)**: An AI agent deployed for a specific task (e.g., "Claims Intake Assistant")
- **Lifecycle**: Design Week → Build → UAT → Live

### Design Week Phases
Each phase has different sessions and extracts different information:

| Phase | Sessions | Primary Focus |
|-------|----------|---------------|
| Kickoff | 1 | Goals, stakeholders, success metrics, volume expectations |
| Process Design | 2-3 | Happy path, exceptions, scope items, business rules |
| Technical | 2-3 | Systems, integrations, data fields, APIs, security |
| Sign-off | 1 | Final confirmations, outstanding items, go/no-go |

See [DESIGN-WEEK.md](DESIGN-WEEK.md) for detailed workflow specification.

### Health System
Live DEs have a health score (0-100):
- **Automatic factors**: Support tickets, transaction volume, escalation rate
- **Manual override**: Consultant can flag "at risk" regardless of metrics
- **Indicators**: 🟢 Healthy (80+) | 🟡 Attention (60-79) | 🔴 Critical (<60)

## User Roles

| Role | User | Primary View | Access |
|------|------|--------------|--------|
| Implementation Lead | Sophie | My Implementations | Full |
| Head of Implementation | Priya | Portfolio Dashboard | Full + analytics |
| Freeday Support | Thomas | Live DEs Dashboard | Read + health monitoring |
| Client Stakeholder | Marcus | Client Portal | Read-only, own company only |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma
- **AI**: Google Gemini for session extraction
- **UI**: Tailwind CSS + Radix UI
- **Testing**: Vitest
- **Deployment**: Railway

## Key Files

### Pages (Route Group: `(global)`)
- `src/app/(global)/page.tsx` - Main dashboard (Sophie's view)
- `src/app/(global)/companies/` - Company management
- `src/app/(global)/companies/[id]/digital-employees/[deId]/` - DE workspace
- `src/app/(global)/support/` - Support dashboard (Thomas)
- `src/app/(global)/portfolio/` - Portfolio dashboard (Priya)
- `src/app/(global)/observatory/` - Feature tracking
- `src/app/(global)/settings/` - Settings & prompt management

### Data & Logic
- `prisma/schema.prisma` - Data model
- `src/lib/gemini.ts` - Gemini AI extraction (audio/video) + Avatar generation
- `src/lib/claude.ts` - Claude AI extraction (transcripts) + document generation
- `src/lib/pipeline/orchestrator.ts` - Extraction pipeline with auto-progress updates
- `src/lib/documents/generate-document.ts` - PDF generation with LLM narratives
- `src/lib/documents/pdf-template.tsx` - React-PDF template
- `src/lib/documents/meet-your-de.tsx` - "Meet Your DE" document template

### Components
- `src/components/scope-guardian/` - Scope item management
- `src/components/de-workspace/` - DE detail workspace with tabs
- `src/components/de-workspace/tabs/progress-tab.tsx` - Progress tab with auto-coverage questions
- `src/components/command-palette/` - Global search (⌘K)
- `src/components/portfolio/gantt-timeline.tsx` - Portfolio Gantt chart
- `src/components/settings/prompt-manager.tsx` - Prompt editing UI

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Tests (watch mode)
npm run test:run     # Tests (single run)
npm run lint         # Linting
npx prisma studio    # Database GUI
npx prisma migrate dev  # Run migrations
```

## Development Guidelines

### Current Phase
Phase 1: Foundation - Focus on Sophie's Design Week workflow

### Priorities
1. Minimum admin work for Sophie - automate everything possible
2. Progress visibility - cards with status, not tables
3. Evidence linking - scope items traceable to session recordings
4. Auto-status updates - milestone-based, no manual updates needed

### UI Patterns
- Card-based dashboards (not tables) for implementation overview
- Traffic light indicators (🟢🟡🔴) for quick status scanning
- Search-first for support lookups
- Gantt timeline for client-facing status

### When Adding Features
1. Consider which persona benefits
2. Does it reduce admin work or add to it?
3. Can status be auto-calculated vs manually entered?
4. Is there evidence/audit trail?

## AI Prompts

The system uses multiple AI models for different tasks:

### Gemini Prompts (Hardcoded in `src/lib/gemini.ts`)
Used for multimodal extraction from audio/video recordings:

| Prompt | Session Phase | Extracts |
|--------|---------------|----------|
| `KICKOFF_PROMPT` | 1 (Kickoff) | Business context, KPIs, stakeholders |
| `PROCESS_DESIGN_PROMPT` | 2 (Process Design 1) | Process steps, case types, channels |
| `SKILLS_GUARDRAILS_PROMPT` | 3 (Process Design 2) | Skills, brand tone, guardrails |
| `TECHNICAL_PROMPT` | 4-5 (Technical) | Integrations, data fields, security |
| `SIGNOFF_PROMPT` | 6 (Sign-off) | Open items, decisions, approvals |

Also includes:
- **Avatar Generation** - `generateDEAvatar()` for DE portraits via Imagen 4

### Claude Prompts (Database-managed via Settings)
Editable in Settings → AI Prompts:

| Type | Purpose |
|------|---------|
| `EXTRACT_KICKOFF` | Extract stakeholders, goals, KPIs from transcripts |
| `EXTRACT_PROCESS` | Extract happy paths, exceptions, business rules |
| `EXTRACT_TECHNICAL` | Extract integrations, data fields, APIs |
| `EXTRACT_SIGNOFF` | Extract open items, decisions, approvals |
| `GENERATE_DE_DESIGN` | Generate DE Design document |
| `GENERATE_SOLUTION` | Generate Solution Design document |
| `GENERATE_TEST_PLAN` | Generate Test Plan document |

### Document Generation (Hardcoded in `src/lib/documents/generate-document.ts`)
- **Master Prompt** - 460+ line consulting-quality prompt for comprehensive PDF generation
- Supports languages: en, nl, de, fr, es
- Generates: Executive Summary, Current/Future State, Process Analysis, Risk Assessment, Training Plan, Quick Reference, Executive One-Pager

## Auto-Coverage System

The Progress tab's "Questions to Cover" are automatically marked as covered based on extracted items.

### Question-to-ItemType Mapping (`src/components/de-workspace/tabs/progress-tab.tsx`)

| Phase | Question | Auto-covered when these types exist |
|-------|----------|-------------------------------------|
| 1 | What problem are we solving? | `GOAL`, `BUSINESS_CASE` |
| 1 | Who are the key stakeholders? | `STAKEHOLDER` |
| 1 | What does success look like? | `KPI_TARGET`, `GOAL` |
| 1 | What's the expected volume? | `VOLUME_EXPECTATION` |
| 2 | What triggers this process? | `CASE_TYPE`, `CHANNEL` |
| 2 | Walk me through a typical case | `HAPPY_PATH_STEP` |
| 2 | When do you escalate? | `ESCALATION_TRIGGER` |
| 3 | What systems does this touch? | `SYSTEM_INTEGRATION` |
| 3 | Security/compliance requirements? | `COMPLIANCE_REQUIREMENT`, `SECURITY_REQUIREMENT` |
| 4 | Is scope complete? | `SCOPE_IN`, `SCOPE_OUT` |

Full mapping in `QUESTION_COVERAGE_MAPPING` constant. Questions can still be manually toggled if not auto-covered.

### Design Week Auto-Progress (`src/lib/pipeline/orchestrator.ts`)

When uploads are processed, Design Week status/phase auto-updates:
- `NOT_STARTED` → `IN_PROGRESS` on first upload
- `currentPhase` advances to highest phase seen (e.g., Technical upload → phase 3)
- Sign-off content → `PENDING_SIGNOFF` status

## Completed Features

- ✅ Portfolio Gantt Chart (Priya's view)
- ✅ Prerequisites Tracking
- ✅ LLM-Enhanced PDF Export (multi-language)
- ✅ Meet Your DE Document
- ✅ DE Avatar Generation (Imagen 4)
- ✅ Command Palette (⌘K global search)
- ✅ Prompt Management (Settings page)
- ✅ Auto-Coverage for Questions to Cover (based on extracted items)
- ✅ Auto Design Week Progress Updates (phase/status from uploads)

## Future Phases

See README.md roadmap for full details:
- Phase 3: Client Portal (Marcus's read-only view)
- Phase 4: Live Monitoring (Thomas's health dashboard)
- Phase 6: Integrations (Notion, Jira)
