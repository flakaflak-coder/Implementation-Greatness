import { NextRequest, NextResponse } from 'next/server'
import { getFile } from '@/lib/storage'
import { getMimeType } from '@/lib/gemini'
import path from 'path'

/**
 * Validate that a path is safe and within the allowed storage directory.
 * Prevents path traversal attacks (e.g., ../../../etc/passwd)
 */
function isPathSafe(requestedPath: string, basePath: string): boolean {
  // Resolve to absolute paths
  const resolvedBase = path.resolve(basePath)
  const resolvedFull = path.resolve(basePath, requestedPath)

  // Ensure the resolved path starts with the base path
  // This prevents ../ traversal attacks
  return resolvedFull.startsWith(resolvedBase + path.sep) || resolvedFull === resolvedBase
}

/**
 * Validate filename to prevent malicious file names
 */
function isFilenameSafe(filename: string): boolean {
  // Block null bytes, control characters, and path separators in filename
  if (/[\x00-\x1f\x7f]/.test(filename)) return false
  if (filename.includes('..')) return false
  if (filename.startsWith('.')) return false // Block hidden files
  // Only allow alphanumeric, dash, underscore, and single dots
  return /^[\w\-.][\w\-. ]*$/.test(filename)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Validate each path segment
    for (const segment of pathSegments) {
      if (!segment || segment === '.' || segment === '..' || segment.includes('\0')) {
        console.warn('[Security] Blocked path traversal attempt:', pathSegments)
        return NextResponse.json(
          { error: 'Invalid path' },
          { status: 400 }
        )
      }
    }

    const filePath = pathSegments.join('/')
    const storagePath = process.env.STORAGE_PATH || '/app/uploads'

    // Validate path is within storage directory
    if (!isPathSafe(filePath, storagePath)) {
      console.warn('[Security] Blocked path traversal attempt:', filePath)
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const filename = pathSegments[pathSegments.length - 1]

    // Validate filename
    if (!isFilenameSafe(filename)) {
      console.warn('[Security] Blocked invalid filename:', filename)
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    const fullPath = path.join(storagePath, filePath)
    const buffer = await getFile(fullPath)
    const mimeType = getMimeType(filename)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
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
