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

- `prisma/schema.prisma` - Data model
- `src/app/page.tsx` - Main dashboard (Sophie's view)
- `src/app/companies/` - Company management
- `src/app/support/` - Support dashboard
- `src/app/observatory/` - Feature tracking
- `src/components/scope-guardian/` - Scope item management
- `src/lib/gemini.ts` - AI extraction logic

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

## Future Phases

See README.md roadmap for full details:
- Phase 2: Lifecycle & Timeline (stage tracking, Gantt)
- Phase 3: Client Portal (Marcus's read-only view)
- Phase 4: Live Monitoring (Thomas's health dashboard)
- Phase 5: Portfolio View (Priya's management dashboard)
- Phase 6: Integrations (Notion, Jira)
