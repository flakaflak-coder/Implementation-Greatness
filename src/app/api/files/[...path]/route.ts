import { NextRequest, NextResponse } from 'next/server'
import { getFile } from '@/lib/storage'
import { getMimeType } from '@/lib/gemini'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const storagePath = process.env.STORAGE_PATH || '/data/uploads'
    const fullPath = path.join(storagePath, filePath)

    const buffer = await getFile(fullPath)
    const filename = pathSegments[pathSegments.length - 1]
    const mimeType = getMimeType(filename)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }
}
