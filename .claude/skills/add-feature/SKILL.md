---
name: add-feature
description: Add a new feature following OCC patterns and conventions.
---

# /add-feature [feature-description]

Add a new feature to Onboarding Command Center:

1. Clarify requirements and affected personas
2. Plan the implementation approach
3. Check existing patterns in similar features
4. Implement following project conventions:
   - Use Server Components by default
   - Card-based layouts for dashboards
   - Auto-calculate status where possible
   - Maintain evidence/audit trails
5. Add tests for new functionality
6. Run `npm run test:run` and `npm run lint`
7. Create a PR with clear description

## Before You Start

Review the relevant sections in CLAUDE.md:
- User Roles - who benefits from this feature?
- Design Week Phases - if related to implementation workflow
- Development Guidelines - current phase priorities
- UI Patterns - consistent user experience
