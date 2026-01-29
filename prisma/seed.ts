import { PrismaClient, ProcessingStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a test company
  const company = await prisma.company.upsert({
    where: { id: 'test-company-1' },
    update: {},
    create: {
      id: 'test-company-1',
      name: 'Acme Insurance',
      industry: 'Insurance',
      contactName: 'Marcus Chen',
      contactEmail: 'marcus@acme-insurance.com',
    },
  })
  console.log('✅ Created company:', company.name)

  // Create a Digital Employee
  const digitalEmployee = await prisma.digitalEmployee.upsert({
    where: { id: 'test-de-1' },
    update: {},
    create: {
      id: 'test-de-1',
      companyId: company.id,
      name: 'Claims Intake Assistant',
      description: 'Automates claims intake from email, phone, and web portal',
      status: 'DESIGN',
      currentJourneyPhase: 'DESIGN_WEEK',
    },
  })
  console.log('✅ Created Digital Employee:', digitalEmployee.name)

  // Create a Design Week
  const designWeek = await prisma.designWeek.upsert({
    where: { id: 'test-dw-1' },
    update: {},
    create: {
      id: 'test-dw-1',
      digitalEmployeeId: digitalEmployee.id,
      status: 'IN_PROGRESS',
      currentPhase: 1,
      startedAt: new Date(),
    },
  })
  console.log('✅ Created Design Week')

  // Create sessions for each phase
  const sessions: { id: string; phase: number; sessionNumber: number; status: ProcessingStatus }[] = [
    { id: 'session-kickoff-1', phase: 1, sessionNumber: 1, status: ProcessingStatus.PENDING },
    { id: 'session-process-1', phase: 2, sessionNumber: 1, status: ProcessingStatus.PENDING },
    { id: 'session-process-2', phase: 2, sessionNumber: 2, status: ProcessingStatus.PENDING },
    { id: 'session-technical-1', phase: 3, sessionNumber: 1, status: ProcessingStatus.PENDING },
    { id: 'session-technical-2', phase: 3, sessionNumber: 2, status: ProcessingStatus.PENDING },
    { id: 'session-signoff-1', phase: 4, sessionNumber: 1, status: ProcessingStatus.PENDING },
  ]

  for (const session of sessions) {
    await prisma.session.upsert({
      where: { id: session.id },
      update: {},
      create: {
        id: session.id,
        designWeekId: designWeek.id,
        phase: session.phase,
        sessionNumber: session.sessionNumber,
        date: new Date(),
        processingStatus: session.status,
        topicsCovered: [],
      },
    })
  }
  console.log('✅ Created', sessions.length, 'sessions')

  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('Test URLs:')
  console.log(`  Dashboard: http://localhost:3001`)
  console.log(`  Company:   http://localhost:3001/companies/${company.id}`)
  console.log(`  DE Detail: http://localhost:3001/companies/${company.id}/digital-employees/${digitalEmployee.id}`)
  console.log('')
  console.log('To test extraction, use one of these session IDs:')
  sessions.forEach(s => {
    const phaseNames = { 1: 'kickoff', 2: 'process', 3: 'technical', 4: 'signoff' }
    console.log(`  ${s.id} (${phaseNames[s.phase as keyof typeof phaseNames]})`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
