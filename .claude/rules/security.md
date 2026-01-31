# Security Rules

## Secrets Management
- Never commit API keys, tokens, or credentials
- All secrets in environment variables (`.env`, `.env.local`)
- Use `.env.example` for documenting required variables (without values)
- Never log secrets or include in error messages

## API Routes
- Validate all input with Zod schemas
- Use parameterized queries (Prisma handles this)
- Return appropriate HTTP status codes
- Don't expose internal error details to clients

## File Uploads
- Validate file types server-side (don't trust client MIME types)
- Store uploads in `/uploads/` directory or S3
- Sanitize filenames before storage
- Set appropriate size limits

## Database
- Use Prisma for all database access (prevents SQL injection)
- Never construct raw SQL from user input
- Validate IDs and references before queries

## AI/LLM Security
- Sanitize user content before including in prompts
- Don't expose system prompts to end users
- Validate and sanitize AI-generated content before use
- Log AI interactions for audit purposes

## Client Portal (Future)
- Implement row-level security for client data
- Users can only access their own company's data
- Verify company ownership on every request
