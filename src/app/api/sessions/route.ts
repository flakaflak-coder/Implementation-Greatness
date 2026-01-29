import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { processSession } from '@/lib/processing'
import { getMimeType } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const designWeekId = formData.get('designWeekId') as string
    const phase = parseInt(formData.get('phase') as string, 10) || 1
    const recordingUrl = formData.get('recordingUrl') as string | null
    const files = formData.getAll('files') as File[]

    if (!designWeekId) {
      return NextResponse.json(
        { error: 'Design week ID is required' },
        { status: 400 }
      )
    }

    // Get the next session number for this design week
    const existingSessions = await prisma.session.count({
      where: { designWeekId },
    })

    // Create the session
    const session = await prisma.session.create({
      data: {
        designWeekId,
        phase,
        sessionNumber: existingSessions + 1,
        date: new Date(),
        recordingUrl,
        processingStatus: 'PENDING',
        topicsCovered: [],
      },
    })

    // Process uploaded files
    const uploadedFiles: Array<{ path: string; name: string; type: 'RECORDING' | 'DOCUMENT' }> = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadFile(buffer, file.name, `sessions/${session.id}`)

      const mimeType = getMimeType(file.name)
      const isRecording = mimeType.startsWith('audio/') || mimeType.startsWith('video/')

      // Create material record
      await prisma.material.create({
        data: {
          sessionId: session.id,
          type: isRecording ? 'RECORDING' : 'DOCUMENT',
          filename: file.name,
          url: result.url,
          mimeType,
          processed: false,
        },
      })

      uploadedFiles.push({
        path: result.path,
        name: file.name,
        type: isRecording ? 'RECORDING' : 'DOCUMENT',
      })
    }

    // If we have uploaded files, process them
    if (uploadedFiles.length > 0) {
      // Start processing in background (in production, use a job queue)
      const primaryFile = uploadedFiles.find(f => f.type === 'RECORDING') || uploadedFiles[0]

      // Update session with file info
      await prisma.session.update({
        where: { id: session.id },
        data: {
          recordingUrl: primaryFile.path,
        },
      })

      // Process asynchronously
      processSession({
        sessionId: session.id,
        filePath: primaryFile.path,
        filename: primaryFile.name,
        sourceType: primaryFile.type,
      }).catch(error => {
        console.error('Background processing failed:', error)
      })
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designWeekId = searchParams.get('designWeekId')

    const where = designWeekId ? { designWeekId } : {}

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        materials: true,
        _count: {
          select: {
            extractions: true,
            transcript: true,
          },
        },
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
