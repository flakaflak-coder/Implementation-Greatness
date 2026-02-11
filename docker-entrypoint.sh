#!/bin/sh
set -e

# Wait for the database to be reachable before running migrations
MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

echo "Waiting for database to be reachable..."

until npx prisma migrate deploy 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not reachable after $MAX_RETRIES attempts ($((MAX_RETRIES * RETRY_INTERVAL))s). Starting server anyway..."
    break
  fi
  echo "Database not ready (attempt $RETRIES/$MAX_RETRIES). Retrying in ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
  echo "Migrations applied successfully. Pushing schema..."
  npx prisma db push || echo "WARNING: prisma db push failed, continuing..."
fi

echo "Starting Next.js server..."
exec node server.js
