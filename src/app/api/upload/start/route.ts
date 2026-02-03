import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { getMimeType } from '@/lib/gemini'
import { runExtractionPipeline } from '@/lib/pipeline'
import type { StageProgress, ExtractionMode, ExtractionOptions } from '@/lib/pipeline'
import { validateId, ExtractionModeSchema } from '@/lib/validation'

export const maxDuration = 300 // 5 minutes for long processing

// Allowed file types for upload (server-side validation)
const ALLOWED_MIME_TYPES = new Set([
  // Audio
  'audio/mpeg',        // .mp3
  'audio/mp4',         // .m4a
  'audio/wav',         // .wav
  'audio/webm',        // .webm audio
  'audio/ogg',         // .ogg
  // Video
  'video/mp4',         // .mp4
  'video/webm',        // .webm video
  'video/quicktime',   // .mov
  // Documents
  'application/pdf',   // .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',        // .txt
])

const ALLOWED_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.wav', '.webm', '.ogg',
  '.mp4', '.mov',
  '.pdf', '.docx', '.pptx', '.txt',
])

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024

/**
 * Validate file type using both extension and magic bytes
 */
function validateFileType(filename: string, mimeType: string, buffer: Buffer): { valid: boolean; error?: string } {
  // Check extension
  const ext = '.' + filename.toLowerCase().split('.').pop()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type ${ext} is not allowed` }
  }

  // Check MIME type (from Content-Type or derived from extension)
  const derivedMimeType = getMimeType(filename)
  if (!ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_MIME_TYPES.has(derivedMimeType)) {
    return { valid: false, error: `MIME type ${mimeType} is not allowed` }
  }

  // Magic bytes validation for common file types
  const magicBytes = buffer.subarray(0, 12)

  // PDF: starts with %PDF
  if (ext === '.pdf') {
    if (magicBytes.toString('ascii', 0, 4) !== '%PDF') {
      return { valid: false, error: 'Invalid PDF file' }
    }
  }

  // MP3: starts with ID3 or 0xFF 0xFB
  if (ext === '.mp3') {
    const isId3 = magicBytes.toString('ascii', 0, 3) === 'ID3'
    const isMpegFrame = magicBytes[0] === 0xFF && (magicBytes[1] & 0xE0) === 0xE0
    if (!isId3 && !isMpegFrame) {
      return { valid: false, error: 'Invalid MP3 file' }
    }
  }

  // MP4/M4A: check for ftyp box
  if (ext === '.mp4' || ext === '.m4a' || ext === '.mov') {
    const ftyp = magicBytes.toString('ascii', 4, 8)
    if (ftyp !== 'ftyp') {
      return { valid: false, error: 'Invalid video/audio file' }
    }
  }

  // DOCX/PPTX: ZIP format (PK header)
  if (ext === '.docx' || ext === '.pptx') {
    if (magicBytes[0] !== 0x50 || magicBytes[1] !== 0x4B) {
      return { valid: false, error: 'Invalid Office document' }
    }
  }

  return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal and special characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || 'file'
  // Remove null bytes and control characters
  const cleaned = basename.replace(/[\x00-\x1f\x7f]/g, '')
  // Only allow safe characters
  const safe = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Prevent hidden files
  return safe.startsWith('.') ? '_' + safe : safe
}

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
    const extractionModeRaw = formData.get('extractionMode') as string | null

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

    // Validate designWeekId format
    const idValidation = validateId(designWeekId)
    if (!idValidation.success) {
      return idValidation.response
    }

    // Validate extraction mode
    const modeValidation = ExtractionModeSchema.safeParse(extractionModeRaw || 'standard')
    if (!modeValidation.success) {
      return NextResponse.json(
        { error: 'Invalid extraction mode' },
        { status: 400 }
      )
    }
    const extractionMode = modeValidation.data

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Sanitize filename
    const filename = sanitizeFilename(file.name)

    // Validate file type (server-side, don't trust client MIME type)
    const fileValidation = validateFileType(filename, file.type, fileBuffer)
    if (!fileValidation.valid) {
      console.warn('[Security] Blocked invalid file upload:', fileValidation.error, file.name)
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      )
    }

    // Use server-derived MIME type, not client-provided
    const mimeType = getMimeType(filename)

    // Verify design week exists
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: idValidation.id },
    })

    if (!designWeek) {
      return NextResponse.json(
        { error: 'Design week not found' },
        { status: 404 }
      )
    }

    // Upload file to storage
    const uploadResult = await uploadFile(fileBuffer, filename, `design-weeks/${idValidation.id}`)

    // Create upload job
    const job = await prisma.uploadJob.create({
      data: {
        designWeekId: idValidation.id,
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
    runPipelineInBackground(job.id, idValidation.id, fileBuffer, filename, mimeType, uploadResult.path, extractionOptions)

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
