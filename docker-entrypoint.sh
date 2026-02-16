#!/bin/sh
set -e

# Wait for the database to be reachable before running migrations
MAX_RETRIES=45
RETRY_INTERVAL=3
RETRIES=0

echo "Waiting for database to be reachable..."

# First, wait for basic TCP connectivity using node (no extra dependencies)
until node -e "
const url = new URL(process.env.DATABASE_URL);
const net = require('net');
const sock = net.connect({host: url.hostname, port: url.port || 5432, timeout: 3000});
sock.on('connect', () => { sock.destroy(); process.exit(0); });
sock.on('error', () => process.exit(1));
sock.on('timeout', () => { sock.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not reachable after $MAX_RETRIES attempts. Starting server anyway..."
    break
  fi
  echo "Database not ready (attempt $RETRIES/$MAX_RETRIES). Retrying in ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

# Now run migrations (use globally installed prisma to avoid node_modules conflicts)
if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
  echo "Database is reachable. Running migrations..."
  prisma migrate deploy 2>&1 || echo "WARNING: prisma migrate deploy failed, continuing..."
fi

echo "Starting Next.js server..."
exec node server.js
