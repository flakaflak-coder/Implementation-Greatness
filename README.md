# Onboarding Command Center

A comprehensive platform for managing Digital Employee implementations at Freeday - from Design Week through continuous success monitoring.

## Vision

**Goal:** Minimum admin work, maximum output - help implementation consultants deliver successful Digital Employees while giving stakeholders full visibility into progress and health.

### Data Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FREEDAY PORTFOLIO                           │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Company A  │  │  Company B  │  │  Company C  │  ...            │
│  │             │  │             │  │             │                 │
│  │  ┌───┐┌───┐│  │  ┌───┐     │  │  ┌───┐┌───┐│                 │
│  │  │DE1││DE2││  │  │DE1│      │  │  │DE1││DE2││                 │
│  │  └───┘└───┘│  │  └───┘      │  │  └───┘└───┘│                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Digital Employee Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │  DESIGN  │ → │  BUILD   │ → │   UAT    │ → │      LIVE        │  │
│  │  WEEK    │   │          │   │          │   │  (health tracked)│  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘  │
│                                                                      │
│  Design Week Phases:                                                 │
│  Kickoff → Process Design → Technical Deep-dive → Sign-off          │
└──────────────────────────────────────────────────────────────────────┘
```

### Role-Based Views

| Role | Primary View | Focus |
|------|--------------|-------|
| **Sophie** (Implementation Lead) | My Implementations | Progress, ambiguous items, blockers |
| **Priya** (Head of Implementation) | Portfolio Dashboard | At-risk DEs, team allocation, trends |
| **Thomas** (Freeday Support) | Live DEs Dashboard | Health scores, issues, transaction volume |
| **Marcus** (Client) | Client Portal | Gantt timeline, status, scope (read-only) |

## Current Focus: Sophie's Design Week Workflow

The Design Week module helps implementation leads like Sophie manage multiple Digital Employee implementations simultaneously. The goal: **minimum admin work, maximum output**.

### Design Week Phases

1. **Kickoff** - Initial alignment and goal setting
2. **Process Design** - Detailed workflow mapping
3. **Technical Deep-dive** - Integration and system requirements
4. **Sign-off** - Final validation and approval

### Key Features

- **My Implementations Dashboard** - Card-based view of all active DEs with progress and alerts
- **Session Processing** - Upload recordings, AI extracts scope items with timestamps
- **Scope Guardian** - Track in-scope, out-of-scope, and ambiguous items with evidence
- **Completeness Tracking** - Know what's confirmed vs. what needs clarification
- **Artifact Generation** - Auto-generate intake docs, runbooks, UAT scripts

### Health Score System

When DEs go live, health is tracked via:
- **Automatic calculation**: Support tickets + transaction volume + escalation rate
- **Manual override**: Implementation lead can flag "at risk" for non-metric reasons (e.g., client relationship issues)

Health indicators: 🟢 Healthy | 🟡 Attention | 🔴 Critical

## Roadmap

### Phase 1: Foundation (Current)
Core data model and Sophie's Design Week workflow.

- [x] Company and Digital Employee management
- [x] Design Week session tracking
- [x] Scope item management UI
- [x] Observatory dashboard
- [ ] Wire UI to real API data
- [ ] Session upload and AI processing
- [ ] Evidence linking to recordings
- [ ] Artifact generation (intake docs, runbooks)

### Phase 2: Lifecycle & Timeline
Stage tracking with milestone-based status updates.

- [ ] Lifecycle stages (Design → Build → UAT → Live)
- [ ] Milestone completion tracking
- [ ] Timeline/Gantt visualization
- [ ] Auto-generated status updates per milestone
- [ ] Blocker tracking (green/orange/red status)

### Phase 3: Client Portal
Read-only portal for client stakeholders (Marcus).

- [ ] Separate client authentication
- [ ] Gantt chart view of implementation timeline
- [ ] Traffic light status indicators
- [ ] Scope summary (in/out) in plain language
- [ ] Action items for client input needed

### Phase 4: Live Monitoring
Health dashboard for deployed Digital Employees (Thomas's view).

- [ ] Health score calculation (automatic + manual override)
- [ ] Support ticket integration (volume, severity)
- [ ] Transaction/case volume metrics
- [ ] Trend indicators (improving/declining)
- [ ] Issue pattern detection

### Phase 5: Portfolio View
Management dashboard for Priya.

- [ ] Aggregate metrics across all DEs
- [ ] At-risk implementations surfaced
- [ ] Team workload/allocation view
- [ ] Drill-down to any DE
- [ ] Analytics on implementation patterns

### Phase 6: Integrations
- [ ] **Notion** - Sync companies and Digital Employees
- [ ] **Jira** - Track support tickets per DE
- [ ] **Document Upload** - Import existing materials

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma
- **AI:** Google Gemini for extraction
- **Styling:** Tailwind CSS + Radix UI
- **Deployment:** Railway

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or use Homebrew: `brew install postgresql@15`)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL (if using Homebrew)
brew services start postgresql@15

# Create database
createdb occ

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Environment Variables

```bash
DATABASE_URL="postgresql://user@localhost:5432/occ"
GEMINI_API_KEY="your-gemini-api-key"
STORAGE_TYPE="volume"
STORAGE_PATH="/data/uploads"
```

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests (watch mode)
npm run test:run     # Run tests once
npm run lint         # Run linter
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── companies/    # Company CRUD
│   │   ├── digital-employees/
│   │   ├── sessions/     # Session upload & processing
│   │   ├── observatory/  # Metrics & tracking
│   │   └── health/       # Health check
│   ├── companies/        # Companies page
│   ├── support/          # Support dashboard
│   ├── observatory/      # Observatory dashboard
│   └── page.tsx          # Main dashboard
├── components/
│   ├── dashboard/        # Dashboard components
│   ├── scope-guardian/   # Scope management UI
│   ├── layout/           # Header, navigation
│   └── ui/               # Reusable UI components
└── lib/
    ├── observatory/      # Feature tracking
    ├── db.ts             # Prisma client
    ├── gemini.ts         # AI extraction
    └── processing.ts     # Session processing
```

## User Personas

See [PERSONAS.md](PERSONAS.md) for detailed user personas:

| Persona | Role | Primary Need |
|---------|------|--------------|
| **Sophie** | Implementation Lead | Manage 5+ DEs simultaneously with minimal admin work |
| **Priya** | Head of Implementation | Portfolio visibility, risk detection, resource allocation |
| **Thomas** | Freeday Support | Monitor all live DEs, health scores, issue tracking |
| **Marcus** | Client Stakeholder | Timeline visibility, status updates, scope transparency |

## License

Proprietary - Freeday
