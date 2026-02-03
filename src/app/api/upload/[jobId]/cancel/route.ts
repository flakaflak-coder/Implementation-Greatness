import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/upload/[jobId]/cancel
 *
 * Cancels an in-progress upload job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    // Get the current job status
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Only cancel if the job is still in progress
    if (job.status === 'COMPLETE' || job.status === 'FAILED') {
      return NextResponse.json({
        success: true,
        message: 'Job already finished',
        status: job.status,
      })
    }

    // Mark the job as cancelled (using FAILED status with a specific error message)
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Job cancelled',
    })
  } catch (error) {
    console.error('Cancel job error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Cancel failed: ${message}` },
      { status: 500 }
    )
  }
}
