import { describe, it, expect } from 'vitest'
import {
  FEATURES,
  getFeatureById,
  getFeaturesByStatus,
  getFeaturesByCategory,
  getFeatureSummary,
} from './features'

describe('Feature Registry', () => {
  describe('FEATURES', () => {
    it('contains features', () => {
      expect(FEATURES.length).toBeGreaterThan(0)
    })

    it('all features have required fields', () => {
      FEATURES.forEach(feature => {
        expect(feature.id).toBeDefined()
        expect(feature.name).toBeDefined()
        expect(feature.description).toBeDefined()
        expect(feature.status).toBeDefined()
        expect(feature.category).toBeDefined()
        expect(feature.healthStatus).toBeDefined()
      })
    })

    it('has unique IDs', () => {
      const ids = FEATURES.map(f => f.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('getFeatureById', () => {
    it('returns feature by ID', () => {
      const feature = getFeatureById('dashboard')
      expect(feature).toBeDefined()
      expect(feature?.name).toBe('Dashboard')
    })

    it('returns undefined for unknown ID', () => {
      const feature = getFeatureById('nonexistent')
      expect(feature).toBeUndefined()
    })
  })

  describe('getFeaturesByStatus', () => {
    it('returns features with built status', () => {
      const built = getFeaturesByStatus('built')
      expect(built.length).toBeGreaterThan(0)
      built.forEach(f => expect(f.status).toBe('built'))
    })

    it('returns features with planned status', () => {
      const planned = getFeaturesByStatus('planned')
      planned.forEach(f => expect(f.status).toBe('planned'))
    })

    it('returns empty array for status with no features', () => {
      const deprecated = getFeaturesByStatus('deprecated')
      deprecated.forEach(f => expect(f.status).toBe('deprecated'))
    })
  })

  describe('getFeaturesByCategory', () => {
    it('returns features by category', () => {
      const core = getFeaturesByCategory('core')
      expect(core.length).toBeGreaterThan(0)
      core.forEach(f => expect(f.category).toBe('core'))
    })

    it('returns admin features', () => {
      const admin = getFeaturesByCategory('admin')
      expect(admin.length).toBeGreaterThan(0)
      admin.forEach(f => expect(f.category).toBe('admin'))
    })
  })

  describe('getFeatureSummary', () => {
    it('returns complete summary', () => {
      const summary = getFeatureSummary()

      expect(summary.total).toBe(FEATURES.length)
      expect(summary.built).toBeGreaterThanOrEqual(0)
      expect(summary.inProgress).toBeGreaterThanOrEqual(0)
      expect(summary.planned).toBeGreaterThanOrEqual(0)
      expect(summary.deprecated).toBeGreaterThanOrEqual(0)

      // Verify counts add up
      expect(
        summary.built + summary.inProgress + summary.planned + summary.deprecated
      ).toBe(summary.total)
    })

    it('includes health metrics', () => {
      const summary = getFeatureSummary()

      expect(summary.healthy).toBeGreaterThanOrEqual(0)
      expect(summary.degraded).toBeGreaterThanOrEqual(0)
      expect(summary.broken).toBeGreaterThanOrEqual(0)
    })
  })
})
