#!/usr/bin/env tsx
/**
 * Generate a bcrypt password hash for the ADMIN_PASSWORD_HASH environment variable.
 *
 * Usage:
 *   npx tsx scripts/generate-password-hash.ts "your-password"
 *   npm run generate-password-hash "your-password"
 */

import { hash } from 'bcryptjs'

async function main() {
  const password = process.argv[2]

  if (!password) {
    console.error('Usage: npx tsx scripts/generate-password-hash.ts "your-password"')
    console.error('')
    console.error('Example:')
    console.error('  npx tsx scripts/generate-password-hash.ts "SecurePassword123!"')
    process.exit(1)
  }

  console.log('Generating bcrypt hash...')
  console.log('')

  const passwordHash = await hash(password, 12)

  console.log('Add this to your .env file:')
  console.log('')
  console.log(`ADMIN_PASSWORD_HASH="${passwordHash}"`)
  console.log('')
  console.log('⚠️  Keep this hash secure and never commit it to version control!')
}

main().catch(console.error)
