# Code Style Rules

## TypeScript
- Use strict TypeScript with explicit types for function parameters and returns
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation at API boundaries
- Avoid `any` - use `unknown` with type guards when necessary

## React/Next.js
- Use Server Components by default, add `'use client'` only when needed
- Prefer named exports over default exports
- Colocate components with their pages when page-specific
- Use the `(global)` route group for main app routes

## Imports
- Absolute imports via `@/` prefix (maps to `src/`)
- Order: React → Next → external libs → internal modules → relative imports
- Destructure Lucide icons in imports

## Naming
- Components: PascalCase (`DeWorkspace.tsx`)
- Files: kebab-case for non-components (`generate-document.ts`)
- API routes: kebab-case directories (`/api/design-weeks/`)
- Database models: PascalCase in Prisma, mapped to snake_case tables

## Styling
- Tailwind CSS for all styling
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Radix UI primitives for accessible components
- Card-based layouts preferred over tables for dashboards
