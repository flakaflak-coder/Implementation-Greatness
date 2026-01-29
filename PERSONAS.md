# User Personas - Onboarding Command Center

## Application Context

The Onboarding Command Center is an internal tool for **Freeday** - an AI/automation platform that helps companies implement digital employees (AI agents). The application manages the complete lifecycle of deploying digital employees, from initial design through live deployment, with a structured "Design Week" process.

---

## Persona 1: Sophie van der Berg

### Demographics
- **Name:** Sophie van der Berg
- **Age:** 34
- **Location:** Amsterdam, Netherlands
- **Occupation:** Implementation Consultant at Freeday
- **Income:** EUR 65,000-80,000
- **Education:** Master's in Business Information Technology, VU Amsterdam

### Profile Picture Description
Professional Dutch woman in her 30s, short auburn hair, usually wears smart casual attire. Often seen with a notebook and laptop in client meetings.

### Bio
Sophie has been at Freeday for 3 years and has led over 40 digital employee implementations. She started as a business analyst at a consulting firm before joining Freeday, attracted by the opportunity to work at the intersection of AI and process automation.

She's the primary user of the Onboarding Command Center - the person who runs Design Week sessions with clients, uploads recordings, manages scope decisions, and ensures digital employees are properly configured before go-live. She's methodical but often overwhelmed by the volume of simultaneous implementations.

Sophie is known for her ability to translate client requirements into clear scope boundaries, but she struggles when clients are vague or keep changing their minds mid-implementation.

### Goals
1. **Primary goal:** Complete Design Weeks efficiently while capturing all requirements accurately
2. **Secondary goal:** Reduce the back-and-forth with clients by surfacing ambiguities early
3. **Hidden goal:** Build a reputation as the go-to consultant for complex implementations

### Frustrations
1. Spending hours rewatching session recordings to find specific moments when clients mentioned requirements
2. Getting to sign-off only to discover a critical scope item was never clarified
3. Clients who say "yes" to everything in meetings but complain about limitations after go-live

### Tech Profile
- **Tech savviness:** 4/5 - Comfortable with enterprise software, APIs, and automation tools
- **Devices:** MacBook Pro (work), iPhone, iPad for client presentations
- **Apps they love:** Notion (clear organization), Loom (async communication), Miro (visual collaboration)
- **Apps they hate:** Overly complex CRMs with too many required fields, tools with poor search

### A Day in Their Life
**Morning:**
Starts at 8:30 AM, reviews calendar for the day's Design Week sessions. Checks the Command Center dashboard for any ambiguous items flagged on current implementations. Responds to Slack messages from colleagues asking about scope decisions.

**Workday:**
Typically has 2-3 sessions per day across different clients. Between sessions, uploads recordings, reviews AI-extracted scope items, and prepares agendas for next sessions. Frequently context-switches between 4-5 active Design Weeks.

**Evening:**
Tries to disconnect by 6 PM but often catches up on documentation or reviews scope items that need resolution before next-day sessions.

### Quotes
> "I've rewatched this 2-hour recording three times looking for where the client mentioned that edge case. There has to be a better way."

> "If I could just see all the ambiguous items across all my implementations in one place, I'd sleep better at night."

### How They'd Find Your App
Internal tool - introduced during onboarding at Freeday as the standard implementation management system.

### What Would Make Them Love It
- AI that accurately extracts and timestamps scope items from session recordings
- Single dashboard showing all ambiguous items across all active Design Weeks
- Evidence linking back to exact moments in recordings where decisions were discussed

### What Would Make Them Leave
- Inaccurate AI extractions that create more work to fix than manual note-taking
- Slow search or inability to find information quickly during client calls
- System that loses data or requires re-uploading sessions

### Willingness to Pay
Internal tool (company pays), but would advocate strongly for budget if it saves 5+ hours per week.

---

## Sophie's Design Week Discovery Checklist

This checklist tracks the **critical information** Sophie needs to understand the client's process and build a successful Digital Employee. Focus on **Channels → Skills → Integrations**.

### Traffic Light Legend
| Status | Meaning |
|:------:|:--------|
| 🟢 | **Complete** - All required information gathered with evidence |
| 🟠 | **Partial** - Some information gathered, needs clarification or gaps remain |
| 🔴 | **Not Asked** - Topic not yet covered in sessions |

---

### 1. Business Context & Volumes
> *Why we're doing this + the business case*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"What's the problem you're solving? Why now?"** | 🔴 | |
| **"How many [cases/invoices/documents] per month?"** | 🔴 | |
| **"What's the current cost per case/transaction?"** (FTE time + tools) | 🔴 | |
| **"What does success look like?"** (time saved, cost reduced, quality improved) | 🔴 | |
| "Are there peak periods?" (month-end, seasonality) | 🔴 | |

**Quick Summary:**
- **Volume:** [e.g., 5,000 emails/month]
- **Current Cost:** [e.g., €8 per case]
- **Target:** [e.g., < €2 per case, < 1 hour response time]
- **DE Name:** [e.g., "Emma" - Claims Assistant]

---

### 2. The Process (Happy Path)
> *Understand what happens today*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"Walk me through a typical case from start to finish"** | 🔴 | |
| **"What types of cases/requests come in?"** (list with % distribution) | 🔴 | |
| "What documents or attachments are involved?" | 🔴 | |
| "What information is needed to complete the process?" | 🔴 | |
| **"What's the exception rate?"** (% that are non-standard) | 🔴 | |
| **"When MUST this go to a human?"** (escalation triggers) | 🔴 | |

**Process Summary:**
| Case Type | % Volume | Complexity | Notes |
|:----------|:--------:|:----------:|:------|
| [e.g., Standard inquiry] | 60% | Low | Automatable |
| [e.g., With attachment] | 25% | Medium | Needs review |
| [e.g., Complaint] | 15% | High | Human only |

---

### 3. Channels
> *Where does work come from?*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"Which channels does work come through?"** (email, form, portal, API) | 🔴 | |
| **"What's the volume split per channel?"** | 🔴 | |
| "Do different channels have different SLAs or priorities?" | 🔴 | |
| "Any channel-specific rules?" (e.g., VIP portal faster response) | 🔴 | |

**Channel Summary:**
| Channel | Volume % | Current SLA | Target SLA | Notes |
|:--------|:--------:|:-----------:|:----------:|:------|
| 📧 Email | 70% | 48h | < 1h | Main channel |
| 📝 Web Form | 25% | 24h | < 1h | Structured data |
| 📞 API | 5% | Real-time | Real-time | System-to-system |

---

### 4. Skills
> *What does the DE need to DO?*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"What actions does the DE need to perform?"** (answer, route, approve, reject, etc.) | 🔴 | |
| **"Where does the knowledge come from?"** (KB, manuals, policies, rules) | 🔴 | |
| "Are there existing templates or response formats?" | 🔴 | |
| **"What's the brand tone?"** (formal/informal, language, empathy level) | 🔴 | |
| "Can the DE be proactive?" (offer suggestions, cross-sell) | 🔴 | |

**Skills Summary:**
| Skill | Description | Knowledge Source | Phase |
|:------|:------------|:-----------------|:-----:|
| 📚 **Answer Questions** | Provide information/solutions | KB, FAQs, Manuals | 1 |
| 🔍 **Request Information** | Ask for missing details | Templates | 1 |
| ✅ **Approve/Reject** | Make yes/no decisions | Business rules | 1 |
| 🔀 **Route/Escalate** | Send to right team/person | Routing rules | 1 |
| ✉️ **Notify** | Send confirmations/updates | Templates | 2 |

---

### 5. Integrations
> *What systems are involved?*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"What systems does this process touch?"** (list all) | 🔴 | |
| **"For each system: read, write, or both?"** | 🔴 | |
| **"What data fields are needed?"** (specific field names) | 🔴 | |
| "Is there API access? Documentation?" | 🔴 | |
| "Who's the technical contact for each system?" | 🔴 | |
| "Any security/compliance requirements?" (GDPR, audit trails) | 🔴 | |

**Integration Summary:**
| System | Purpose | Access Type | Data Fields | Tech Contact |
|:-------|:--------|:------------|:------------|:-------------|
| [e.g., Salesforce] | Case management | Read + Write | Case ID, Status, Description | [Name] |
| [e.g., SharePoint] | Knowledge base | Read only | FAQ content, PDFs | [Name] |
| [e.g., SAP] | Financial data | Read only | Invoice status, amount | [Name] |

---

### 6. Guardrails & Boundaries
> *What's allowed vs. NOT allowed*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"What should the DE NEVER do or say?"** (absolute boundaries) | 🔴 | |
| "Any financial limits?" (can't approve > €X, can't promise refunds) | 🔴 | |
| "Legal or compliance restrictions?" | 🔴 | |
| "What makes a GOOD interaction?" (behaviors to encourage) | 🔴 | |

**Guardrails:**
| ❌ NEVER | ✅ ALWAYS | Why |
|:---------|:----------|:----|
| [e.g., Promise refunds] | [Acknowledge & escalate] | Financial authority |
| [e.g., Share PII] | [Verify identity first] | GDPR compliance |
| [e.g., Make commitments] | [Say "I'll check" or "My colleague will confirm"] | Legal liability |

---

### 7. Success Metrics & KPIs
> *How do we know it's working?*

| Question | Status | Evidence |
|:---------|:------:|:---------|
| **"What's the automation rate target?"** (% fully handled by DE) | 🔴 | |
| **"What's acceptable accuracy?"** (% responses approved without edits) | 🔴 | |
| **"What KPIs matter most to you?"** (response time, CSAT, cost) | 🔴 | |
| "Who reviews quality? How often?" | 🔴 | |

**KPI Targets:**
| KPI | Phase 1 | Phase 2 | Measured How |
|:----|:-------:|:-------:|:-------------|
| Automation Rate | 20% | 40% | Weekly report |
| Quality Score | 80% | 90% | Sample review (n=50) |
| Response Time | < 1h | < 15min | System metric |

---

## Domain-Specific Add-Ons

### Customer Service
*Additional questions for customer-facing support implementations:*

| Topic | Critical Questions |
|:------|:-------------------|
| **Inquiry Mix** | "What's the split: questions vs. complaints vs. status checks?" |
| **Self-Service Gap** | "What can customers do themselves today? (portal, app, chatbot)" |
| **SLA Commitments** | "Are there contractual response time commitments?" |
| **Customer History** | "Does the DE need to see past interactions?" |
| **Sentiment Handling** | "How do you handle angry/frustrated customers today?" |

### Accounts Payable
*Additional questions for AP/invoice processing implementations:*

| Topic | Critical Questions |
|:------|:-------------------|
| **Invoice Types** | "What types of invoices: PO-based, non-PO, recurring, one-time?" |
| **Approval Workflows** | "What's the approval chain? (amount thresholds, department, GL codes)" |
| **Matching Rules** | "3-way match (PO + receipt + invoice)? 2-way? Tolerances?" |
| **Exception Handling** | "What makes an invoice 'exception'? (price variance, missing PO, duplicate)" |
| **Period Close** | "Any month-end/quarter-end cutoffs or special processing?" |
| **Payment Terms** | "Early payment discounts? Late payment penalties?" |

### KYC (Know Your Customer)
*Additional questions for identity verification/compliance implementations:*

| Topic | Critical Questions |
|:------|:-------------------|
| **Document Types** | "What ID documents are acceptable? (passport, driver's license, utility bill)" |
| **Verification Rules** | "What makes a document valid? (expiry, photo quality, address match)" |
| **Rejection Handling** | "Valid rejection reasons? How is rejection communicated?" |
| **Risk Tiers** | "Are there different verification levels? (simplified, standard, enhanced)" |
| **Compliance Framework** | "What regulations apply? (AML, CDD, local KYC laws)" |
| **Manual Review Triggers** | "What always needs human review? (high-risk countries, PEPs)" |
| **Audit Requirements** | "What audit trail is required? Data retention period?" |

### Internal Assistants
*Additional questions for employee-facing implementations (contract management, HR, IT help):*

| Topic | Critical Questions |
|:------|:-------------------|
| **User Base** | "Who uses this? All employees or specific departments/roles?" |
| **Access Control** | "Who can see what? (department boundaries, confidential info)" |
| **Policy Sources** | "Where do policies live? (intranet, SharePoint, Google Drive)" |
| **Approval Chains** | "Are there approval workflows? (manager → director → VP)" |
| **HR Sensitivity** | "Any sensitive topics? (complaints, health info, performance)" |
| **Contract Types** | "What contract types? (vendor, customer, employment, NDA)" |
| **Contract Lifecycle** | "Typical flow: draft → review → approve → sign → store → renew?" |
| **IT Integration** | "Need AD/SSO? Service desk integration? Ticketing system?" |

---

## Checklist Completeness Score

| Topic | Weight | Status | Score |
|:------|:------:|:------:|:-----:|
| 1. Business Context & Volumes | 20% | 🔴 | 0% |
| 2. The Process (Happy Path) | 15% | 🔴 | 0% |
| 3. Channels | 15% | 🔴 | 0% |
| 4. Skills | 20% | 🔴 | 0% |
| 5. Integrations | 15% | 🔴 | 0% |
| 6. Guardrails & Boundaries | 10% | 🔴 | 0% |
| 7. Success Metrics & KPIs | 5% | 🔴 | 0% |
| **Overall Completeness** | **100%** | | **0%** |

**Readiness Check:**
- 🟢 **80-100%** = Ready for document generation
- 🟠 **50-79%** = Major gaps, need another session
- 🔴 **< 50%** = Still in discovery mode

---

### Session-to-Checklist Mapping

| Session Type | Primary Topics Covered |
|:-------------|:-----------------------|
| **Kickoff** | Business Context, Volumes, Success Metrics |
| **Process Design 1** | The Process, Channels, Happy Path |
| **Process Design 2** | Skills Needed, Guardrails & Boundaries |
| **Technical 1** | Integrations, Data Fields, Systems |
| **Technical 2** | Integration Details, Security, API Docs |
| **Sign-off** | Final Review Across All Topics |

---

## Persona 2: Marcus Chen

### Demographics
- **Name:** Marcus Chen
- **Age:** 28
- **Location:** Rotterdam, Netherlands
- **Occupation:** Customer Support Team Lead at a Freeday client (Acme Insurance)
- **Income:** EUR 52,000
- **Education:** Bachelor's in Communications, Erasmus University

### Profile Picture Description
Young professional in business casual, clean-shaven, friendly demeanor. Usually has a headset nearby - clearly someone who spends time on calls.

### Bio
Marcus manages a team of 15 customer support agents at Acme Insurance. His team handles claims intake, policy questions, and general customer inquiries. When Acme decided to implement a digital employee for claims intake, Marcus was assigned as the business stakeholder.

He's cautiously optimistic about AI - excited about reducing his team's workload on repetitive tasks, but worried about getting blamed if the digital employee makes mistakes. He participates in Design Week sessions to ensure the scope accurately reflects what his team handles.

This is his first experience with AI implementation, and he finds the technical discussions overwhelming at times. He relies heavily on Sophie (the Freeday consultant) to translate requirements.

### Goals
1. **Primary goal:** Ensure the digital employee handles exactly the right tasks - no more, no less
2. **Secondary goal:** Have clear documentation to train his team on when to intervene
3. **Hidden goal:** Look good to leadership by making the AI implementation successful

### Frustrations
1. Sessions that move too fast with technical jargon he doesn't understand
2. Not being sure if his input was captured correctly in the system
3. Having to explain the same exceptions and edge cases multiple times

### Tech Profile
- **Tech savviness:** 2/5 - Competent with standard business tools, but not technical
- **Devices:** Windows laptop (work), Android phone
- **Apps they love:** Microsoft Teams (familiar), Excel (knows it well), WhatsApp (easy)
- **Apps they hate:** Any tool that requires reading documentation to figure out basic tasks

### A Day in Their Life
**Morning:**
Reviews overnight tickets and agent performance. Checks in with team leads on any escalated issues. Prepares for any scheduled Design Week sessions.

**Workday:**
Mostly managing team operations, handling escalations, and attending meetings. Design Week sessions are scheduled 2-3 times during the 2-week implementation period.

**Evening:**
Family time - has two young kids and tries to maintain work-life balance.

### Quotes
> "I told them three times that we don't handle total loss claims, but I'm not sure if they wrote it down correctly."

> "I need something my team can quickly check when they're not sure if the bot should have handled something."

### How They'd Find Your App
Invited by Freeday to participate in Design Week sessions; may have limited read-only access to view scope documentation.

### What Would Make Them Love It
- Simple, clear view of what's in scope vs. out of scope (without needing to understand the whole system)
- Ability to see the evidence/recording of when he said something, to verify it was captured
- Runbook format his team can use for quick reference during customer interactions

### What Would Make Them Leave
- Overwhelming interface with features he doesn't need
- If his feedback appears to be ignored or misrepresented
- No clear way to see the status of the implementation

### Willingness to Pay
Not a paying user - client stakeholder with limited access.

---

## Persona 3: Priya Patel

### Demographics
- **Name:** Priya Patel
- **Age:** 41
- **Location:** Utrecht, Netherlands
- **Occupation:** Head of Implementation at Freeday
- **Income:** EUR 110,000
- **Education:** MBA from INSEAD, BS in Computer Science from IIT Delhi

### Profile Picture Description
Confident Indian woman in her early 40s, professional attire, often seen in video calls. Wears statement earrings, has a calm but authoritative presence.

### Bio
Priya leads the team of 12 implementation consultants at Freeday. She's responsible for ensuring implementations are delivered on time, within scope, and set up for success. She doesn't run Design Week sessions herself anymore but closely monitors all active implementations and intervenes when they're at risk.

She came from a VP role at a major systems integrator and brings a strong focus on process discipline. She implemented the Design Week methodology that the team now uses and sees the Command Center as critical infrastructure for scaling the business.

Her biggest challenge is resource allocation - deciding which consultants to assign to which clients and identifying early when implementations are going off track.

### Goals
1. **Primary goal:** Visibility into all implementations to prevent surprises and allocate resources effectively
2. **Secondary goal:** Identify patterns - which types of implementations succeed/fail and why
3. **Hidden goal:** Build a case for expanding her team by demonstrating capacity constraints

### Frustrations
1. Learning about problems only when they become crises
2. Inconsistent quality across consultants in how they document scope
3. No easy way to compare progress across multiple implementations

### Tech Profile
- **Tech savviness:** 4/5 - Technical background but now more focused on management
- **Devices:** MacBook Pro, iPhone, occasionally checks dashboards on iPad
- **Apps they love:** Salesforce (CRM visibility), Tableau (analytics), Slack (team communication)
- **Apps they hate:** Tools without proper reporting/dashboards, anything that requires manual data compilation

### A Day in Their Life
**Morning:**
Starts at 8 AM reviewing the implementation dashboard, checking for any red flags. Weekly Monday pipeline review with sales team.

**Workday:**
Back-to-back meetings - team 1:1s, client escalations, strategic planning. Rarely does hands-on work in the Command Center but needs quick access to information.

**Evening:**
Catches up on industry reading, occasionally reviews analytics reports on implementation performance.

### Quotes
> "I shouldn't have to ask three consultants for status updates. I need a dashboard that tells me which implementations are at risk."

> "Why did this client churn? Can we look at their Design Week and see what went wrong?"

### How They'd Find Your App
Championed its development internally; primary stakeholder for the product.

### What Would Make Them Love It
- Real-time dashboard showing all active implementations, completeness scores, and risk indicators
- Ability to drill down into any implementation without having to ask the consultant
- Analytics on implementation patterns (average time to complete, common scope issues)

### What Would Make Them Leave
- System that requires constant manual updates to stay accurate
- No aggregate view - having to click into each implementation individually
- Inaccurate or stale data that undermines trust

### Willingness to Pay
Budget owner - would pay significant amount for tool that improves implementation success rates.

---

## Persona 4: Thomas Bakker

### Demographics
- **Name:** Thomas Bakker
- **Age:** 24
- **Location:** Amsterdam, Netherlands
- **Occupation:** Support Specialist at Freeday
- **Income:** EUR 38,000
- **Education:** HBO Bachelor's in IT Service Management

### Profile Picture Description
Young Dutch man, casual dress code, often wearing a headset. Friendly face, looks slightly stressed during busy periods. Multiple monitors visible in background.

### Bio
Thomas joined Freeday 8 months ago as part of the growing support team. His job is to monitor the "fleet" of live Digital Employees across all Freeday clients. When a DE has issues - high escalation rates, client complaints, or declining performance - Thomas is often the first to investigate.

He doesn't deal directly with end customers. Instead, he monitors health dashboards, investigates issue patterns, and escalates to implementation consultants when a DE needs attention. He's the early warning system for problems before they become crises.

Thomas has access to scope documentation for all live DEs, which he uses to determine whether reported issues are bugs, scope misunderstandings, or legitimate limitations.

### Goals
1. **Primary goal:** Spot problems early before clients complain - be proactive, not reactive
2. **Secondary goal:** Quickly investigate issues and determine root cause (scope vs. bug vs. config)
3. **Hidden goal:** Build expertise to move into implementation consulting

### Frustrations
1. Having to dig through multiple systems to understand a DE's health status
2. No single view showing all live DEs and their current state
3. When consultants don't keep scope documentation up to date after go-live changes

### Tech Profile
- **Tech savviness:** 3/5 - Comfortable with modern software, learns quickly
- **Devices:** Windows desktop with dual monitors (work), iPhone
- **Apps they love:** Grafana (dashboards), Zendesk (ticket patterns), Slack (quick questions)
- **Apps they hate:** Slow enterprise software, tools that require too many clicks for simple lookups

### A Day in Their Life
**Morning:**
Clocks in at 9 AM, opens the Live DEs dashboard to check overnight health scores. Flags any DEs that dropped into yellow/red territory. Reviews incoming tickets grouped by DE.

**Workday:**
Monitors 12+ live DEs throughout the day. Investigates any health score changes - checking transaction volumes, error rates, ticket patterns. When something looks wrong, digs into scope docs to determine if it's a legitimate issue or expected behavior. Escalates to Sophie or other consultants when needed.

**Evening:**
Leaves at 5:30 PM, hands off monitoring to the on-call rotation. Plays video games with friends online.

### Quotes
> "MedHealth's health score dropped 15 points overnight. Let me check if there was a spike in escalations or if their transaction volume just changed."

> "I need to see all my live DEs in one place with their health scores - not click into 12 different dashboards."

### How They'd Find Your App
Internal Freeday tool - introduced during onboarding as the primary monitoring dashboard for live DEs.

### What Would Make Them Love It
- Single dashboard showing all live DEs with health scores, issue counts, and volume
- Quick drill-down into any DE to see issues and scope
- Trend indicators (is this DE getting better or worse?)
- Search across all DE scopes when investigating an issue

### What Would Make Them Leave
- Stale data that doesn't reflect current state
- No way to see aggregate view - having to click into each DE individually
- Slow performance when he needs quick answers

### Willingness to Pay
Internal tool (Freeday employee) - advocates for features that make monitoring easier.

---

## Persona 5 (Negative): Erik de Vries

### Demographics
- **Name:** Erik de Vries
- **Age:** 55
- **Location:** The Hague, Netherlands
- **Occupation:** IT Director at a large enterprise (potential Freeday client)
- **Income:** EUR 145,000
- **Education:** Engineering degree, various management certifications

### Profile Picture Description
Older Dutch executive, formal suit, skeptical expression. Gray hair, reading glasses usually on forehead.

### Bio
Erik has been in IT leadership for 25 years. He's seen every technology trend come and go and is deeply skeptical of AI hype. When his CEO suggested exploring AI automation for customer service, Erik insisted on rigorous due diligence.

He's NOT a target user for the Command Center - he represents the executive buyer who wants proof of value but won't use the tool himself. His concerns need to be addressed through reporting and outcomes, not through direct product features.

### Goals
1. **Primary goal:** Protect the company from expensive failed AI projects
2. **Secondary goal:** If AI must be implemented, ensure it integrates with existing systems
3. **Hidden goal:** Not be blamed when (not if) the AI makes a mistake

### Frustrations
1. Vendors who can't explain what their AI actually does
2. Solutions that create data silos or require wholesale system changes
3. Lack of clear ROI metrics

### Why They're NOT a Target User
- Won't use the operational tool himself
- Needs are better served by sales presentations and ROI reports
- Would slow down product development with enterprise requirements that don't serve core users

### What Would Win Them Over (Without Being a Product Feature)
- Case studies with clear ROI metrics
- Enterprise integration capabilities (SSO, API access)
- Audit trails and compliance documentation

---

## Persona Summary

| Persona | Type | Primary Goal | Key Frustration | Tech Level |
|---------|------|--------------|-----------------|------------|
| Sophie | Implementation Lead | Manage 5+ DEs with minimal admin | Rewatching recordings, context-switching | 4/5 |
| Priya | Head of Implementation | Portfolio visibility, spot risks early | Learning about problems when they're crises | 4/5 |
| Thomas | Freeday Support | Monitor all live DEs, spot issues early | No single view of DE health across fleet | 3/5 |
| Marcus | Client Stakeholder | Know implementation status, verify scope | Not sure if input captured, feeling out of loop | 2/5 |
| Erik | Negative Persona | Protect company from failed AI projects | Vendors who can't explain their AI | N/A |

### Coverage Analysis
- **Internal Freeday users:**
  - Implementation management (Sophie) - Design Week workflow
  - Management oversight (Priya) - Portfolio dashboard
  - Live monitoring (Thomas) - DE health dashboard
- **External client users:**
  - Client participation (Marcus) - Read-only portal with Gantt + status
- **Not covered:**
  - Technical/engineering users (for integrations)
  - Quality assurance / UAT testers

### Key Insights Across Personas
1. **Speed matters:** Sophie needs fast context-switching between DEs; Thomas needs quick health checks
2. **Evidence is critical:** Sophie and Marcus both want to trace scope decisions back to source recordings
3. **Dashboard views vary by role:**
   - Sophie: My implementations (cards with progress/blockers)
   - Priya: Portfolio aggregate (at-risk, allocation, trends)
   - Thomas: Live DEs (health scores, issues, volume)
   - Marcus: Timeline view (Gantt, milestones, status)
4. **Auto-updates reduce admin:** Milestone-based status updates for Marcus; health scores calculated automatically

### Design Implications
- **Role-based home views** - Each persona lands on their relevant dashboard
- **Evidence linking is core** - Timestamps to recordings are essential, not nice-to-have
- **Health = automatic + override** - Calculated from metrics but manually flaggable
- **Client portal is separate** - Marcus needs simplified read-only access, not the full tool
- **Search across all scopes** - Thomas needs to investigate issues across any live DE
