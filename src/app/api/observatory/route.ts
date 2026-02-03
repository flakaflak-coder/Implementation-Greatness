import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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

    // Calculate health metrics from feature registry
    const healthMetrics = {
      overall: featureSummary.broken > 0 ? 'unhealthy' : featureSummary.degraded > 0 ? 'degraded' : 'healthy',
      features: {
        healthy: featureSummary.healthy,
        degraded: featureSummary.degraded,
        broken: featureSummary.broken,
        unknown: featureSummary.total - featureSummary.healthy - featureSummary.degraded - featureSummary.broken,
      },
    }

    // Query real usage data from database
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get usage event counts
    const [dailyEvents, weeklyEvents, totalEvents] = await Promise.all([
      prisma.observatoryEvent.count({
        where: { timestamp: { gte: oneDayAgo } },
      }),
      prisma.observatoryEvent.count({
        where: { timestamp: { gte: oneWeekAgo } },
      }),
      prisma.observatoryEvent.count(),
    ])

    // Get unique users (from sessionId or userId)
    const [dailyActiveUsers, weeklyActiveUsers] = await Promise.all([
      prisma.observatoryEvent.findMany({
        where: {
          timestamp: { gte: oneDayAgo },
          OR: [{ userId: { not: null } }, { sessionId: { not: null } }],
        },
        select: { userId: true, sessionId: true },
        distinct: ['userId', 'sessionId'],
      }),
      prisma.observatoryEvent.findMany({
        where: {
          timestamp: { gte: oneWeekAgo },
          OR: [{ userId: { not: null } }, { sessionId: { not: null } }],
        },
        select: { userId: true, sessionId: true },
        distinct: ['userId', 'sessionId'],
      }),
    ])

    // Get top features by usage
    const topFeaturesRaw = await prisma.observatoryEvent.groupBy({
      by: ['featureId'],
      where: {
        featureId: { not: null },
        timestamp: { gte: oneWeekAgo },
      },
      _count: { featureId: true },
      orderBy: { _count: { featureId: 'desc' } },
      take: 5,
    })

    const topFeatures = topFeaturesRaw.map((f) => ({
      featureId: f.featureId,
      count: f._count.featureId,
    }))

    // Get recent activity
    const recentActivity = await prisma.observatoryEvent.findMany({
      where: { type: 'FEATURE_USAGE' },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        featureId: true,
        type: true,
        timestamp: true,
        success: true,
      },
    })

    const usageMetrics = {
      dailyActiveUsers: dailyActiveUsers.length,
      weeklyActiveUsers: weeklyActiveUsers.length,
      totalEvents,
      dailyEvents,
      weeklyEvents,
      topFeatures,
      recentActivity,
    }

    // Query real error data from database
    const [newErrors, investigatingErrors, resolvedErrors, totalErrors] = await Promise.all([
      prisma.observatoryError.count({ where: { status: 'NEW' } }),
      prisma.observatoryError.count({ where: { status: 'INVESTIGATING' } }),
      prisma.observatoryError.count({ where: { status: 'RESOLVED' } }),
      prisma.observatoryError.count(),
    ])

    const recentErrors = await prisma.observatoryError.findMany({
      where: { status: { in: ['NEW', 'INVESTIGATING'] } },
      orderBy: { lastSeen: 'desc' },
      take: 10,
      select: {
        id: true,
        message: true,
        featureId: true,
        endpoint: true,
        count: true,
        status: true,
        firstSeen: true,
        lastSeen: true,
      },
    })

    const errorMetrics = {
      total: totalErrors,
      new: newErrors,
      investigating: investigatingErrors,
      resolved: resolvedErrors,
      recentErrors,
    }

    // Query real feedback data from database
    const [newFeedback, totalFeedback] = await Promise.all([
      prisma.observatoryFeedback.count({ where: { status: 'NEW' } }),
      prisma.observatoryFeedback.count(),
    ])

    // Calculate average NPS
    const npsScores = await prisma.observatoryFeedback.findMany({
      where: { npsScore: { not: null } },
      select: { npsScore: true },
    })
    const averageNPS =
      npsScores.length > 0
        ? npsScores.reduce((sum, f) => sum + (f.npsScore || 0), 0) / npsScores.length
        : null

    const recentFeedback = await prisma.observatoryFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        content: true,
        featureId: true,
        npsScore: true,
        status: true,
        createdAt: true,
      },
    })

    const feedbackMetrics = {
      total: totalFeedback,
      new: newFeedback,
      averageNPS,
      recentFeedback,
    }

    // Query real LLM metrics from database
    const [llmOperations, successfulOps, failedOps] = await Promise.all([
      prisma.observatoryLLMOperation.findMany({
        where: { timestamp: { gte: oneWeekAgo } },
        select: {
          pipelineName: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          latencyMs: true,
          cost: true,
          success: true,
        },
      }),
      prisma.observatoryLLMOperation.count({
        where: { timestamp: { gte: oneWeekAgo }, success: true },
      }),
      prisma.observatoryLLMOperation.count({
        where: { timestamp: { gte: oneWeekAgo }, success: false },
      }),
    ])

    // Calculate LLM metrics
    const totalOperations = llmOperations.length
    const totalLatency = llmOperations.reduce((sum, op) => sum + op.latencyMs, 0)
    const averageLatency = totalOperations > 0 ? Math.round(totalLatency / totalOperations) : 0
    const totalCost = llmOperations.reduce((sum, op) => sum + (op.cost || 0), 0)
    const successRate = totalOperations > 0 ? Math.round((successfulOps / totalOperations) * 100) : 100
    const totalInputTokens = llmOperations.reduce((sum, op) => sum + op.inputTokens, 0)
    const totalOutputTokens = llmOperations.reduce((sum, op) => sum + op.outputTokens, 0)

    // Group by pipeline
    const operationsByPipeline = llmOperations.reduce(
      (acc, op) => {
        if (!acc[op.pipelineName]) {
          acc[op.pipelineName] = { count: 0, totalLatency: 0, totalTokens: 0 }
        }
        acc[op.pipelineName].count++
        acc[op.pipelineName].totalLatency += op.latencyMs
        acc[op.pipelineName].totalTokens += op.inputTokens + op.outputTokens
        return acc
      },
      {} as Record<string, { count: number; totalLatency: number; totalTokens: number }>
    )

    // Get recent LLM operations
    const recentLLMOperations = await prisma.observatoryLLMOperation.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        id: true,
        pipelineName: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        latencyMs: true,
        cost: true,
        success: true,
        errorMessage: true,
        timestamp: true,
      },
    })

    const llmMetrics = {
      totalOperations,
      averageLatency,
      totalCost: Math.round(totalCost * 100) / 100,
      successRate,
      failedOperations: failedOps,
      totalInputTokens,
      totalOutputTokens,
      operationsByPipeline,
      recentOperations: recentLLMOperations,
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
