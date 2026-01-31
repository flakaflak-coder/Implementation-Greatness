# Testing Rules

## Test Runner
- **Framework**: Vitest with jsdom environment
- **Libraries**: @testing-library/react, @testing-library/jest-dom

## Commands
```bash
npm run test          # Watch mode during development
npm run test:run      # Single run (CI)
npm run test:coverage # With coverage report
```

## File Naming
- Test files: `*.test.ts` or `*.test.tsx`
- Colocate with source: `src/lib/feature.ts` → `src/lib/feature.test.ts`
- API route tests: `src/__tests__/api/*.test.ts`

## Test Structure
```typescript
import { describe, it, expect, vi } from 'vitest'

describe('FeatureName', () => {
  it('should describe expected behavior', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

## Mocking
- Use `vi.mock()` for module mocking
- Mock Prisma client for database tests
- Mock AI SDKs (Gemini, Claude) for extraction tests

## Coverage Expectations
- Focus on business logic and API routes
- UI component tests for complex interactions only
- Don't test framework behavior
