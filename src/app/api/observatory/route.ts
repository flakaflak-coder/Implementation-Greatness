import { NextResponse } from 'next/server'
import { FEATURES, getFeatureSummary } from '@/lib/observatory/features'

// GET /api/observatory - Get observatory metrics
export async function GET() {
  try {
    const featureSummary = getFeatureSummary()

    // Group features by category
    const featuresByCategory = FEATURES.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = []
      }
      acc[feature.category].push(feature)
      return acc
    }, {} as Record<string, typeof FEATURES>)

    // Calculate health metrics
    const healthMetrics = {
      overall: featureSummary.broken > 0 ? 'unhealthy' : featureSummary.degraded > 0 ? 'degraded' : 'healthy',
      features: {
        healthy: featureSummary.healthy,
        degraded: featureSummary.degraded,
        broken: featureSummary.broken,
        unknown: featureSummary.total - featureSummary.healthy - featureSummary.degraded - featureSummary.broken,
      },
    }

    // Mock usage data (in production, query from database)
    const usageMetrics = {
      dailyActiveUsers: 0, // No real users yet
      weeklyActiveUsers: 0,
      totalEvents: 0,
      topFeatures: [],
      recentActivity: [],
    }

    // Mock error data (in production, query from database)
    const errorMetrics = {
      total: 0,
      new: 0,
      investigating: 0,
      resolved: 0,
      recentErrors: [],
    }

    // Mock feedback data (in production, query from database)
    const feedbackMetrics = {
      total: 0,
      new: 0,
      averageNPS: null,
      recentFeedback: [],
    }

    // LLM metrics (in production, query from database)
    const llmMetrics = {
      totalOperations: 0,
      averageLatency: 0,
      totalCost: 0,
      successRate: 100,
      operationsByPipeline: {},
    }

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        features: {
          summary: featureSummary,
          byCategory: featuresByCategory,
          list: FEATURES,
        },
        health: healthMetrics,
        usage: usageMetrics,
        errors: errorMetrics,
        feedback: feedbackMetrics,
        llm: llmMetrics,
      },
    })
  } catch (error) {
    console.error('Error fetching observatory data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch observatory data' },
      { status: 500 }
    )
  }
}
