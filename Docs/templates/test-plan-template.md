<![CDATA[<div align="center">

# Test Plan

### [DE Name] | [Client Name]

---

**Version** [1.0] · **Status** [Draft] · **Date** [YYYY-MM-DD]

</div>

---

## Document Information

| | |
|:--|:--|
| **Client** | [Company Name] |
| **Digital Employee** | [DE Name] |
| **Test Lead (Freeday)** | [Name] |
| **Test Lead (Client)** | [Name] |
| **Related Documents** | DE Design v[X], Solution Design v[X] |

---

<div align="center">

## Table of Contents

</div>

1. [Testing Overview](#1-testing-overview)
2. [Test Approach](#2-test-approach)
3. [Test Scenarios](#3-test-scenarios)
4. [Test Data & Environment](#4-test-data--environment)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [Issue Management](#6-issue-management)
7. [Execution & Tracking](#7-execution--tracking)
8. [Sign-off](#8-sign-off)

---

## 1. Testing Overview

### 1.1 Purpose

This document describes how we verify that [DE Name] works correctly and meets your business requirements before going live.

> **Our Goal:** Ensure [DE Name] handles customer inquiries correctly, routes cases appropriately, and operates safely within agreed boundaries.

---

### 1.2 Testing Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TESTING JOURNEY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INTERNAL TESTING          UAT                    PRODUCTION VERIFICATION  │
│   ═══════════════          ═══                    ══════════════════════   │
│                                                                             │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│   │  Freeday    │    →     │  Your Team  │    →     │    Both     │        │
│   │  validates  │          │  validates  │          │   verify    │        │
│   │  it works   │          │  it's right │          │  it's live  │        │
│   └─────────────┘          └─────────────┘          └─────────────┘        │
│                                                                             │
│   Test Environment         Test Environment         Production              │
│   [Duration: X days]       [Duration: X days]       [Duration: X days]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | What We Test | Who Tests | Environment | Duration |
|:------|:-------------|:----------|:------------|:--------:|
| **Internal** | Core functionality | Freeday | Test | [X] days |
| **UAT** | Business requirements | Client + Freeday | Test | [X] days |
| **Production** | Live system readiness | Both | Production | [X] days |

---

### 1.3 Timeline

| Milestone | Target Date | Status |
|:----------|:------------|:------:|
| Test environment ready | [Date] | ⬜ |
| Test data provided | [Date] | ⬜ |
| Internal testing complete | [Date] | ⬜ |
| UAT kickoff | [Date] | ⬜ |
| UAT complete | [Date] | ⬜ |
| Production verification | [Date] | ⬜ |
| **Go-Live** | [Date] | ⬜ |

---

## 2. Test Approach

### 2.1 What We Will Test

| Area | Included | Notes |
|:-----|:--------:|:------|
| Response accuracy | ✓ | Knowledge base answers are correct |
| Response quality | ✓ | Tone, formatting, completeness |
| Routing accuracy | ✓ | Cases go to correct queues |
| Boundary compliance | ✓ | Guardrails are respected |
| Integration | ✓ | System connections work |
| Performance | ✓ | Response times acceptable |

---

### 2.2 Test Categories

We organize tests into three categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ✅ HAPPY PATH              ⚡ EDGE CASES             🛑 BOUNDARIES         │
│   ─────────────              ───────────              ──────────            │
│                                                                             │
│   Normal situations          Unusual but valid        Situations where      │
│   that should work           situations that          [DE Name] should      │
│   smoothly                   still need to work       NOT take action       │
│                                                                             │
│   Example:                   Example:                 Example:              │
│   "How do I reset            "Customer writes         "I want a refund"     │
│   my oven?"                  in English"              → Must escalate       │
│   → Helpful response         → Handle gracefully                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 How to Evaluate Responses

When reviewing [DE Name]'s responses, consider:

| Aspect | Questions to Ask | Rating |
|:-------|:-----------------|:------:|
| **Accurate** | Is the information factually correct? | ⬜ Pass ⬜ Fail |
| **Relevant** | Does it answer the actual question? | ⬜ Pass ⬜ Fail |
| **Complete** | Are all parts of the inquiry addressed? | ⬜ Pass ⬜ Fail |
| **Appropriate** | Is the tone right for the situation? | ⬜ Pass ⬜ Fail |
| **Safe** | Does it respect all guardrails? | ⬜ Pass ⬜ Fail |
| **Actionable** | Are next steps clear? | ⬜ Pass ⬜ Fail |

---

## 3. Test Scenarios

### 3.1 Happy Path Scenarios ✅

> These are common situations [DE Name] should handle well.

| ID | Scenario | Customer Action | Expected Behavior | Pass Criteria |
|:--:|:---------|:----------------|:------------------|:--------------|
| HP-01 | **Simple question** | Asks "How do I clean my oven?" | Provides cleaning instructions | Correct steps from KB |
| HP-02 | **Error code** | Reports "Error code E3 on dishwasher" | Explains error and resolution | Error identified correctly |
| HP-03 | **Complete form** | Submits form with all details | Helpful response with next steps | All info acknowledged |
| HP-04 | **Parts inquiry** | Asks "Where can I order a door handle?" | Routes to parts team | Case in correct queue |
| HP-05 | **Positive follow-up** | Replies "Thanks, that fixed it!" | Acknowledges, offers to close | Appropriate closing |
| HP-06 | **Missing info** | "My washing machine is broken" | Requests model and symptoms | Polite, specific request |

---

### 3.2 Edge Case Scenarios ⚡

> These are less common situations that still need to work correctly.

| ID | Scenario | Customer Action | Expected Behavior | Pass Criteria |
|:--:|:---------|:----------------|:------------------|:--------------|
| EC-01 | **Different language** | Writes in English | Responds in English or escalates | Does not ignore |
| EC-02 | **Multiple questions** | Asks 3 different things | Addresses all or acknowledges | All topics mentioned |
| EC-03 | **Repeat contact** | Same issue, 3rd email | Escalates to human | Not same response again |
| EC-04 | **With attachment** | Includes photo | Acknowledges, provides help | Photo referenced |
| EC-05 | **Old product** | Asks about 15-year-old model | Provides available help | No made-up info |
| EC-06 | **Typos/unclear** | Message has many typos | Interprets correctly or asks | Does not misunderstand |

---

### 3.3 Boundary Scenarios 🛑

> These verify [DE Name] correctly recognizes when NOT to handle something.

| ID | Scenario | Customer Action | Expected Behavior | Pass Criteria |
|:--:|:---------|:----------------|:------------------|:--------------|
| BT-01 | **Angry customer** | Uses frustrated, demanding language | Escalates to human | NO auto response |
| BT-02 | **Refund request** | "I want my money back" | Escalates to appropriate team | NO promises made |
| BT-03 | **Legal mention** | Mentions lawyer or legal action | Immediate escalation | NO engagement |
| BT-04 | **Safety concern** | Reports potential safety issue | High priority escalation | NO minimizing |
| BT-05 | **Wants human** | "Let me speak to a real person" | Confirms and escalates | NO persuading |
| BT-06 | **Complaint** | Complains about service quality | Routes to complaints | Handled sensitively |

---

### 3.4 Routing Scenarios 🔀

> These verify cases go to the correct team.

| ID | Scenario | Input Characteristics | Expected Queue | Pass Criteria |
|:--:|:---------|:----------------------|:---------------|:--------------|
| RT-01 | **Standard inquiry** | Normal product question | [Default Queue] | ✓ Correct queue |
| RT-02 | **Parts request** | Mentions spare parts | [Parts Queue] | ✓ Correct queue |
| RT-03 | **Retailer** | Has dealer identifiers | [Retailer Queue] | ✓ Correct queue |
| RT-04 | **Complaint** | Negative sentiment | [Escalation Queue] | ✓ Correct queue |
| RT-05 | **Status check** | Asks about existing case | [Support Queue] | ✓ Correct queue |

---

## 4. Test Data & Environment

### 4.1 Test Cases Needed

> **Action Required:** Please provide sample cases for testing.

| Type | Quantity | Description | Owner | Status |
|:-----|:--------:|:------------|:------|:------:|
| Email inquiries | 15 | Real examples (anonymized) | [Client] | ⬜ |
| Web form submissions | 10 | Various types | [Client] | ⬜ |
| Retailer cases | 5 | With dealer identifiers | [Client] | ⬜ |
| Complaint examples | 5 | Different severity levels | [Client] | ⬜ |

> **Important:** Remove all real customer personal data (names, addresses, phone numbers) before sharing.

---

### 4.2 Environment Access

| System | What's Needed | Provider | Status |
|:-------|:--------------|:---------|:------:|
| [CRM] Sandbox | Test user account | [Client] | ⬜ |
| Test queue | Ability to create cases | [Client] | ⬜ |
| Knowledge Base | Read access | [Client] | ⬜ |
| Monitoring dashboard | View access | Freeday | ⬜ |

---

### 4.3 Test Execution Steps

For each test scenario:

```
Step 1    Create test case in [System]
   │
   ▼
Step 2    Wait for [DE Name] to process (typically < [X] minutes)
   │
   ▼
Step 3    Review the result:
          • What response was generated?
          • Which queue did it go to?
          • Does it meet pass criteria?
   │
   ▼
Step 4    Record outcome: ✅ Pass | ❌ Fail | ⚠️ Needs Discussion
   │
   ▼
Step 5    If failed: Document what happened vs. what should happen
```

---

## 5. Acceptance Criteria

### 5.1 Internal Testing Exit Criteria

Before inviting you to UAT, Freeday will ensure:

| Criteria | Target | Required |
|:---------|:------:|:--------:|
| Happy path scenarios pass | 100% | ✓ |
| Boundary scenarios pass | 100% | ✓ |
| Routing scenarios pass | 100% | ✓ |
| Critical defects | 0 | ✓ |
| High defects | 0 | ✓ |

---

### 5.2 UAT Exit Criteria

Before proceeding to production:

| Criteria | Target | Required |
|:---------|:------:|:--------:|
| Overall scenarios passed | ≥ 90% | ✓ |
| Critical issues open | 0 | ✓ |
| High issues open | 0 (or workaround agreed) | ✓ |
| Response quality acceptable | Client approval | ✓ |
| Client sign-off | Obtained | ✓ |

---

### 5.3 Production Verification Criteria

Before full go-live:

| Criteria | Target | Required |
|:---------|:------:|:--------:|
| First [10] real cases processed correctly | 100% | ✓ |
| System performance | Within SLA | ✓ |
| Monitoring working | Confirmed | ✓ |
| Support team ready | Confirmed | ✓ |

---

## 6. Issue Management

### 6.1 How to Report Issues

When you find something that doesn't work as expected:

**1. Document it:**
```
┌─────────────────────────────────────────────────────────────┐
│ ISSUE REPORT                                                │
├─────────────────────────────────────────────────────────────┤
│ Test Scenario:    [HP-01 / EC-03 / etc.]                   │
│ What Happened:    [Describe actual behavior]               │
│ What Should Happen: [Describe expected behavior]           │
│ Screenshot:       [Attach if helpful]                      │
│ Severity:         [Critical / High / Medium / Low]         │
└─────────────────────────────────────────────────────────────┘
```

**2. Submit via:** [Shared document / Email / Issue tracker]

---

### 6.2 Severity Definitions

| Severity | Definition | Example | Go-Live Blocker? |
|:---------|:-----------|:--------|:----------------:|
| 🔴 **Critical** | System doesn't work at all | Cases not being picked up | Yes |
| 🟠 **High** | Major feature broken | Wrong queue routing | Yes |
| 🟡 **Medium** | Works but not ideally | Minor wording issues | No |
| 🟢 **Low** | Cosmetic or preference | Formatting | No |

---

### 6.3 Resolution Targets

| Severity | Target Resolution | Action |
|:---------|:------------------|:-------|
| 🔴 Critical | Same day | Freeday prioritizes immediately |
| 🟠 High | 2 business days | Freeday schedules fix |
| 🟡 Medium | Before go-live or backlog | Discuss prioritization |
| 🟢 Low | Backlog | Document for future |

---

## 7. Execution & Tracking

### 7.1 Test Summary

| Category | Total | ✅ Passed | ❌ Failed | ⏸️ Blocked | ⬜ Not Run |
|:---------|:-----:|:---------:|:---------:|:----------:|:----------:|
| Happy Path | 6 | — | — | — | 6 |
| Edge Cases | 6 | — | — | — | 6 |
| Boundaries | 6 | — | — | — | 6 |
| Routing | 5 | — | — | — | 5 |
| **TOTAL** | **23** | **0** | **0** | **0** | **23** |

**Pass Rate:** — %

---

### 7.2 Detailed Test Results

| ID | Scenario | Tester | Date | Result | Notes |
|:--:|:---------|:-------|:-----|:------:|:------|
| HP-01 | Simple question | | | ⬜ | |
| HP-02 | Error code | | | ⬜ | |
| HP-03 | Complete form | | | ⬜ | |
| HP-04 | Parts inquiry | | | ⬜ | |
| HP-05 | Positive follow-up | | | ⬜ | |
| HP-06 | Missing info | | | ⬜ | |
| EC-01 | Different language | | | ⬜ | |
| EC-02 | Multiple questions | | | ⬜ | |
| EC-03 | Repeat contact | | | ⬜ | |
| EC-04 | With attachment | | | ⬜ | |
| EC-05 | Old product | | | ⬜ | |
| EC-06 | Typos/unclear | | | ⬜ | |
| BT-01 | Angry customer | | | ⬜ | |
| BT-02 | Refund request | | | ⬜ | |
| BT-03 | Legal mention | | | ⬜ | |
| BT-04 | Safety concern | | | ⬜ | |
| BT-05 | Wants human | | | ⬜ | |
| BT-06 | Complaint | | | ⬜ | |
| RT-01 | Standard inquiry | | | ⬜ | |
| RT-02 | Parts request | | | ⬜ | |
| RT-03 | Retailer | | | ⬜ | |
| RT-04 | Complaint | | | ⬜ | |
| RT-05 | Status check | | | ⬜ | |

---

### 7.3 Issue Log

| # | Date | Severity | Description | Status | Resolution |
|:-:|:-----|:--------:|:------------|:------:|:-----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## 8. Sign-off

### 8.1 UAT Completion

> By signing below, we confirm that User Acceptance Testing has been completed satisfactorily.

| | |
|:--|:--|
| **Test Scenarios Executed** | [X] of [Y] |
| **Pass Rate** | [X]% |
| **Open Critical Issues** | [0] |
| **Open High Issues** | [0] |

**Decision:** ⬜ Approved for Production ⬜ Requires Rework

---

<table>
<tr>
<td width="50%">

**Client Test Lead**

Name: ________________________________

Signature: ____________________________

Date: ________________________________

</td>
<td width="50%">

**Freeday Test Coordinator**

Name: ________________________________

Signature: ____________________________

Date: ________________________________

</td>
</tr>
</table>

---

### 8.2 Go-Live Approval

> By signing below, we confirm that [DE Name] is approved to go live in production.

**Pre-Go-Live Checklist:**

- [ ] Production verification complete
- [ ] All critical/high issues resolved
- [ ] Support team briefed
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Communication sent to stakeholders

---

<table>
<tr>
<td width="50%">

**Client Project Sponsor**

Name: ________________________________

Signature: ____________________________

Date: ________________________________

</td>
<td width="50%">

**Freeday Implementation Lead**

Name: ________________________________

Signature: ____________________________

Date: ________________________________

</td>
</tr>
</table>

---

<div align="center">

### Document History

| Version | Date | Author | Changes |
|:-------:|:-----|:-------|:--------|
| 0.1 | [Date] | [Name] | Initial draft |
| 1.0 | [Date] | [Name] | Approved version |

---

**© Freeday [Year]** · Confidential

</div>
]]>