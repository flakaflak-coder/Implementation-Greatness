# Use Node 22 for Prisma compatibility
FROM node:22-alpine AS base

# Upgrade npm to match local dev (lockfileVersion 3 + peer dep resolution)
RUN npm install -g npm@11

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create public dir if missing (Next.js standalone expects it)
RUN mkdir -p public

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install prisma CLI in isolated directory (separate from app node_modules)
RUN mkdir -p /opt/prisma
COPY --from=deps /app/node_modules/prisma /opt/prisma/node_modules/prisma
COPY --from=deps /app/node_modules/@prisma /opt/prisma/node_modules/@prisma
COPY --from=deps /app/node_modules/.prisma /opt/prisma/node_modules/.prisma
COPY --from=deps /app/node_modules/dotenv /opt/prisma/node_modules/dotenv

# Set the correct permission for prerender cache
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Copy standalone build output (includes its own node_modules with @prisma/client)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema, migrations, and config for running migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Create uploads directory for file storage
RUN mkdir -p uploads && chown nextjs:nodejs uploads

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script that waits for DB before running migrations
CMD ["sh", "docker-entrypoint.sh"]
