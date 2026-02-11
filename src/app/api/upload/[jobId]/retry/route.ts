import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PipelineStage } from '@prisma/client'
import { retryPipeline } from '@/lib/pipeline'
import { validateId } from '@/lib/validation'

const MAX_RETRY_ATTEMPTS = 3

/**
 * POST /api/upload/[jobId]/retry
 *
 * Retries a failed upload job from a specific stage.
 * Limited to MAX_RETRY_ATTEMPTS retries to prevent infinite retry loops.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const idCheck = validateId(jobId)
    if (!idCheck.success) return idCheck.response

    // Get request body
    let fromStage: PipelineStage | undefined
    try {
      const body = await request.json()
      fromStage = body.fromStage as PipelineStage
    } catch {
      // No body provided, will use job's current stage
    }

    // Verify job exists
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Can only retry failed jobs' },
        { status: 400 }
      )
    }

    if (job.retryCount >= MAX_RETRY_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Maximum retry attempts (3) reached. Please upload the file again.' },
        { status: 400 }
      )
    }

    // Increment retry count
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { retryCount: { increment: 1 } },
    })

    // Use current stage if not specified
    const retryStage = fromStage || job.currentStage

    // Start retry in background
    retryPipelineInBackground(jobId, retryStage)

    return NextResponse.json({
      jobId,
      status: 'QUEUED',
      retryingFrom: retryStage,
      retryCount: job.retryCount + 1,
      maxRetries: MAX_RETRY_ATTEMPTS,
      message: 'Retry started. Use /api/upload/{jobId}/status to track progress.',
    })
  } catch (error) {
    console.error('Retry error:', error)
    return NextResponse.json(
      { error: 'Retry failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Run retry in background without blocking the response
 */
async function retryPipelineInBackground(
  jobId: string,
  fromStage: PipelineStage
) {
  try {
    await retryPipeline(jobId, fromStage)
  } catch (error) {
    console.error('Retry background error:', error)
    // Error handling is done within the pipeline
  }
}
