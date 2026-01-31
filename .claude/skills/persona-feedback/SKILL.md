---
name: persona-feedback
description: Run a focus group with all personas for aggregated feedback. Use for comprehensive user perspective on features or product.
---

# /persona-feedback

Get aggregated feedback from all personas on the current state of your app.

## Usage

```
/persona-feedback [app or feature to evaluate]
```

## Instructions

Conduct a "focus group" with all defined personas, gathering their perspectives on the application. This provides a comprehensive view of how different user types perceive and would use your product.

### Phase 1: Individual Feedback

For each persona, provide:

```markdown
## Feedback Session

### [Persona 1 Name] - [Their Role/Type]

**First Impression:**
> "[What they'd say upon first seeing the app]"

**What They Love:**
1. [Feature/aspect] - "[Why in their words]"
2. [Feature/aspect] - "[Why]"

**What Frustrates Them:**
1. [Issue] - "[Complaint in their voice]"
2. [Issue] - "[Complaint]"

**What's Missing for Them:**
> "[I wish it could...]"

**Would They Recommend It?**
[Yes/Maybe/No] - "[Explanation in their voice]"

**Net Promoter Score:** [0-10]
- [0-6 Detractor, 7-8 Passive, 9-10 Promoter]

---

### [Persona 2 Name] - [Their Role/Type]
...
```

### Phase 2: Feature-by-Feature Analysis

```markdown
## Feature Reception

| Feature | [Persona 1] | [Persona 2] | [Persona 3] | Average |
|---------|-------------|-------------|-------------|---------|
| [Feature 1] | [👍/👎/🤷] | [👍/👎/🤷] | [👍/👎/🤷] | [Score] |
| [Feature 2] | [👍/👎/🤷] | [👍/👎/🤷] | [👍/👎/🤷] | [Score] |
| [Feature 3] | [👍/👎/🤷] | [👍/👎/🤷] | [👍/👎/🤷] | [Score] |

### Universally Loved
[Features that all personas appreciate]

### Polarizing
[Features some love, others hate - and why]

### Universally Problematic
[Features that need work for everyone]
```

### Phase 3: Focus Group Discussion

Simulate a group discussion:

```markdown
## Focus Group Highlights

### Topic: [Key aspect of the app]

**Moderator:** "What's your overall impression of [app]?"

**[Persona 1]:** "[Their take]"

**[Persona 2]:** "[Agreeing or disagreeing with Persona 1]"

**[Persona 3]:** "[Adding different perspective]"

---

### Topic: [Another key aspect]

**Moderator:** "What would make you use this every day?"

**[Persona 1]:** "[Response]"

**[Persona 2]:** "[Response]"

---

### The Heated Moment
[Where personas disagreed most strongly]

**[Persona X]:** "[Strong opinion]"

**[Persona Y]:** "[Counterpoint]"

**Insight:** [What this disagreement reveals about product decisions]
```

### Phase 4: Synthesis

```markdown
## Feedback Synthesis

### Overall Sentiment
```
[Persona 1]: ████████░░ 8/10
[Persona 2]: ██████░░░░ 6/10
[Persona 3]: █████████░ 9/10
Average:     ███████░░░ 7.7/10
```

### Key Themes

#### 1. [Theme]
Mentioned by: [Personas]
> Representative quote

**Implication:** [What to do about it]

#### 2. [Theme]
...

### Priority Matrix

```
                    High Impact
                        │
        ┌───────────────┼───────────────┐
        │    Quick      │   Strategic   │
        │    Wins       │   Priorities  │
Low ────┼───────────────┼───────────────┼──── High
Effort  │    Low        │   Major       │    Effort
        │    Priority   │   Projects    │
        └───────────────┼───────────────┘
                        │
                    Low Impact
```

**Quick Wins:**
- [Item] - addresses [persona] concern

**Strategic Priorities:**
- [Item] - benefits [personas]

**Low Priority:**
- [Item] - nice to have

**Major Projects:**
- [Item] - high effort but high value

### Recommended Actions

1. **Immediate:** [Action that addresses universal pain]
2. **This week:** [Action for largest user segment]
3. **This month:** [Larger improvement]
4. **Consider:** [Longer-term strategic change]

### Segments to Prioritize
Based on feedback, focus on: [Persona type]
Because: [Reasoning]

### Warning Signs
[Red flags that emerged - potential churn risks]
```

### Feedback Categories

Structure feedback around:

1. **Onboarding** - First-time experience
2. **Core workflow** - Main use case
3. **Edge cases** - Unusual but important scenarios
4. **Value perception** - Is it worth their time/money?
5. **Competition** - How does it compare to alternatives?

### Guidelines

1. **Distinct voices** - Each persona should sound different
2. **Realistic expectations** - Not everyone will love everything
3. **Constructive criticism** - Focus on actionable feedback
4. **Represent the quiet** - Include feedback users might not voice directly
5. **Quantify when possible** - Scores help prioritize
