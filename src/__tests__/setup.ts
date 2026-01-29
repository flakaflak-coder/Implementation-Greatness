import '@testing-library/jest-dom'
import { vi, type Mock } from 'vitest'

// Type helper for mocked Prisma methods
type MockedPrismaMethod = Mock

// Create typed mock object with all models needed for tests
const createMockPrisma = () => ({
  company: {
    findMany: vi.fn() as MockedPrismaMethod,
    findUnique: vi.fn() as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    delete: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  digitalEmployee: {
    findMany: vi.fn() as MockedPrismaMethod,
    findUnique: vi.fn() as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    delete: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  designWeek: {
    findMany: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
    findUnique: vi.fn() as MockedPrismaMethod,
    findFirst: vi.fn().mockResolvedValue(null) as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  session: {
    findMany: vi.fn() as MockedPrismaMethod,
    findUnique: vi.fn() as MockedPrismaMethod,
    findFirst: vi.fn().mockResolvedValue(null) as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  scopeItem: {
    findUnique: vi.fn() as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  scenario: {
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  kPI: {
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  integration: {
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  escalationRule: {
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  material: {
    create: vi.fn() as MockedPrismaMethod,
  },
  promptTemplate: {
    findMany: vi.fn() as MockedPrismaMethod,
    findFirst: vi.fn() as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    updateMany: vi.fn() as MockedPrismaMethod,
  },
  extractedItem: {
    findMany: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
    createMany: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
    groupBy: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
  },
  // Additional models needed for extraction pipeline tests
  rawExtraction: {
    findMany: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
    findFirst: vi.fn().mockResolvedValue(null) as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
    groupBy: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
  },
  uploadJob: {
    findMany: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
    findFirst: vi.fn().mockResolvedValue(null) as MockedPrismaMethod,
    findUnique: vi.fn() as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    update: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
    groupBy: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
  },
  generatedDocument: {
    findMany: vi.fn().mockResolvedValue([]) as MockedPrismaMethod,
    create: vi.fn() as MockedPrismaMethod,
    count: vi.fn().mockResolvedValue(0) as MockedPrismaMethod,
  },
  $queryRaw: vi.fn().mockResolvedValue([{ test: 1 }]) as MockedPrismaMethod,
})

// Export the mock for use in test files
export const mockPrisma = createMockPrisma()

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.STORAGE_TYPE = 'volume'
process.env.STORAGE_PATH = '/tmp/test-storage'
