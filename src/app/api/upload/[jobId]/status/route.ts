import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/upload/[jobId]/status
 *
 * Server-Sent Events (SSE) endpoint for real-time progress updates.
 * Streams pipeline progress until completion or failure.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const idCheck = validateId(jobId)
  if (!idCheck.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid ID format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Verify job exists
  const initialJob = await prisma.uploadJob.findUnique({
    where: { id: jobId },
  })

  if (!initialJob) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let lastProgress: string | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Send initial status
      sendEvent({
        jobId,
        status: initialJob.status,
        stage: initialJob.currentStage,
        progress: initialJob.stageProgress,
      })

      // Poll for updates until complete or failed
      const pollInterval = setInterval(async () => {
        try {
          const job = await prisma.uploadJob.findUnique({
            where: { id: jobId },
          })

          if (!job) {
            sendEvent({ error: 'Job not found' })
            clearInterval(pollInterval)
            controller.close()
            return
          }

          // Check if progress changed
          const progressStr = JSON.stringify(job.stageProgress)
          const hasProgressChange = progressStr !== lastProgress
          const hasStatusChange = job.status !== initialJob.status

          if (hasProgressChange || hasStatusChange) {
            lastProgress = progressStr

            sendEvent({
              jobId,
              status: job.status,
              stage: job.currentStage,
              progress: job.stageProgress,
              classification: job.classificationResult,
              population: job.populationResult,
              error: job.error,
            })
          }

          // Check for completion or failure
          if (job.status === 'COMPLETE' || job.status === 'FAILED') {
            // Send final state
            sendEvent({
              jobId,
              status: job.status,
              stage: job.currentStage,
              progress: job.stageProgress,
              classification: job.classificationResult,
              population: job.populationResult,
              error: job.error,
              rawExtractionId: job.rawExtractionId,
              completedAt: job.completedAt?.toISOString(),
            })

            clearInterval(pollInterval)
            controller.close()
          }
        } catch (error) {
          console.error('SSE poll error:', error)
          sendEvent({ error: 'Failed to fetch job status' })
          clearInterval(pollInterval)
          controller.close()
        }
      }, 1000) // Poll every second

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
