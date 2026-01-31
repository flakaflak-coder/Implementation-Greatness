---
name: fix-issue
description: Fix a GitHub issue by number. Reads the issue, implements a fix, and creates a PR.
---

# /fix-issue [issue-number]

Fix GitHub issue #[issue-number]:

1. Read the issue with `gh issue view [issue-number]`
2. Understand the problem by exploring relevant code
3. Implement a fix following project conventions in CLAUDE.md
4. Write tests that verify the fix
5. Run the test suite with `npm run test:run`
6. Run lint with `npm run lint`
7. Create a descriptive commit following the project's commit conventions
8. Create a PR referencing the issue with `gh pr create`

## Guidelines

- Check which persona this issue affects (Sophie, Priya, Thomas, or Marcus)
- Consider auto-status and auto-coverage implications
- Ensure evidence/audit trail for any scope changes
- Follow the card-based UI pattern for dashboard changes
