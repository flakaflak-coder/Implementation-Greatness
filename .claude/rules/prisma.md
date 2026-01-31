# Prisma Rules

## Schema Location
- `prisma/schema.prisma` - main schema file
- `prisma/seed.ts` - seed data for development

## Commands
```bash
npx prisma migrate dev    # Create and run migrations
npx prisma generate       # Regenerate client after schema changes
npx prisma studio         # GUI for database exploration
npm run db:seed           # Seed development data
```

## Conventions
- Model names: PascalCase (`DigitalEmployee`)
- Field names: camelCase (`designWeekId`)
- Table mapping: snake_case via `@@map("table_name")`
- Enums: SCREAMING_SNAKE_CASE values

## Relationships
- Always define both sides of relations
- Use `@relation` for explicit naming
- Cascade deletes where appropriate for child records

## Client Usage
- Import from `@/lib/db` (singleton client)
- Use `include` for eager loading related data
- Prefer `select` when only specific fields needed
- Use transactions for multi-table operations
