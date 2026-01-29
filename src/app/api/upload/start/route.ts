import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { getMimeType } from '@/lib/gemini'
import { runExtractionPipeline } from '@/lib/pipeline'
import type { StageProgress, ExtractionMode, ExtractionOptions } from '@/lib/pipeline'

export const maxDuration = 300 // 5 minutes for long processing

/**
 * POST /api/upload/start
 *
 * Starts the unified upload pipeline:
 * 1. Receives file upload
 * 2. Creates UploadJob record
 * 3. Triggers 3-stage extraction pipeline
 * 4. Returns job ID for progress tracking
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const designWeekId = formData.get('designWeekId') as string | null
    const extractionMode = (formData.get('extractionMode') as ExtractionMode) || 'standard'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!designWeekId) {
      return NextResponse.json(
        { error: 'No designWeekId provided' },
        { status: 400 }
      )
    }

    // Verify design week exists
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
    })

    if (!designWeek) {
      return NextResponse.json(
        { error: 'Design week not found' },
        { status: 404 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const filename = file.name
    const mimeType = file.type || getMimeType(filename)

    // Upload file to storage
    const uploadResult = await uploadFile(fileBuffer, filename, `design-weeks/${designWeekId}`)

    // Create upload job
    const job = await prisma.uploadJob.create({
      data: {
        designWeekId,
        filename,
        mimeType,
        fileUrl: uploadResult.path,
        fileSize: uploadResult.size,
        status: 'QUEUED',
        currentStage: 'CLASSIFICATION',
      },
    })

    // Build extraction options
    const extractionOptions: ExtractionOptions = {
      mode: extractionMode,
      models: extractionMode === 'multi-model' ? ['gemini', 'claude'] : undefined,
      secondPassEnabled: extractionMode === 'two-pass',
    }

    console.log(`[Upload] Starting pipeline with extraction mode: ${extractionMode}`)

    // Start pipeline in background (don't await)
    runPipelineInBackground(job.id, designWeekId, fileBuffer, filename, mimeType, uploadResult.path, extractionOptions)

    return NextResponse.json({
      jobId: job.id,
      status: 'QUEUED',
      message: 'Upload started. Use /api/upload/{jobId}/status to track progress.',
    })
  } catch (error) {
    console.error('Upload start error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * Run the pipeline in background without blocking the response
 */
async function runPipelineInBackground(
  jobId: string,
  designWeekId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  fileUrl: string,
  extractionOptions?: ExtractionOptions
) {
  try {
    // Progress callback that updates the job record
    const onProgress = async (progress: StageProgress) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          stageProgress: progress as object,
        },
      })
    }

    await runExtractionPipeline({
      jobId,
      designWeekId,
      fileBuffer,
      filename,
      mimeType,
      fileUrl,
      onProgress,
      extractionOptions,
    })
  } catch (error) {
    console.error('Pipeline background error:', error)
    // Error handling is done within the pipeline
  }
}
