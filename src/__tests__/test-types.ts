/**
 * Common types for test mocks
 * These provide better type safety in tests without being too strict
 */

import type { Prisma } from '@prisma/client'

// Mock response types
export interface MockJsonResponse {
  json: () => Promise<unknown>
  ok: boolean
  status: number
}

// Common mock entity shapes (partial, for testing)
export interface MockCompany {
  id: string
  name: string
  industry?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface MockDigitalEmployee {
  id: string
  name: string
  description?: string | null
  status: string
  companyId: string
  company?: MockCompany
  channels?: string[]
}

export interface MockDesignWeek {
  id: string
  status: string
  currentPhase: number
  digitalEmployeeId: string
  digitalEmployee?: MockDigitalEmployee
  sessions?: MockSession[]
  scopeItems?: MockScopeItem[]
  kpis?: MockKpi[]
  escalationRules?: MockEscalationRule[]
}

export interface MockSession {
  id: string
  phase: number
  sessionNumber: number
  date: Date
  processingStatus: string
  designWeekId: string
  extractedItems?: MockExtractedItem[]
}

export interface MockScopeItem {
  id: string
  statement: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string | null
  status: string
}

export interface MockExtractedItem {
  id: string
  itemType: string
  content: string
  status: string
  sessionId: string
  confidence?: number
}

export interface MockKpi {
  id: string
  name: string
  targetValue: string
  designWeekId: string
}

export interface MockEscalationRule {
  id: string
  trigger: string
  action: string
  designWeekId: string
}

export interface MockChannel {
  id: string
  name: string
  type: string
  volumePercentage?: number
  sla?: string
}

export interface MockGuardrails {
  never?: string[]
  always?: string[]
  financialLimits?: Array<{
    type: string
    amount: number
    currency?: string
  }>
}

export interface MockSkill {
  name: string
  type: string
  description?: string
}

export interface MockBusinessProfile {
  channels?: MockChannel[]
  guardrails?: MockGuardrails
  skills?: {
    skills?: MockSkill[]
  }
  businessContext?: {
    volumePerMonth?: number
    costPerCase?: number
  }
}

export interface MockTechnicalProfile {
  systems?: Array<{
    name: string
    type: string
    purpose?: string
  }>
  dataFields?: Array<{
    name: string
    source: string
    required?: boolean
  }>
}

// Prisma mock types
export type MockPrismaClient = {
  [K in keyof Prisma.TypeMap['model']]?: {
    findUnique?: ReturnType<typeof vi.fn>
    findFirst?: ReturnType<typeof vi.fn>
    findMany?: ReturnType<typeof vi.fn>
    create?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
    delete?: ReturnType<typeof vi.fn>
    count?: ReturnType<typeof vi.fn>
  }
}

// Import vi for the type
import { vi } from 'vitest'
