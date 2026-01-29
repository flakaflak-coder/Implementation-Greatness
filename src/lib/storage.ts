import { promises as fs } from 'fs'
import path from 'path'

export interface StorageConfig {
  type: 'volume' | 's3'
  volumePath?: string
  s3Bucket?: string
  s3Region?: string
}

const config: StorageConfig = {
  type: (process.env.STORAGE_TYPE as 'volume' | 's3') || 'volume',
  volumePath: process.env.STORAGE_PATH || '/data/uploads',
  s3Bucket: process.env.AWS_S3_BUCKET,
  s3Region: process.env.AWS_REGION,
}

export interface UploadResult {
  id: string
  path: string
  url: string
  size: number
}

// Generate a unique file ID
function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const fileId = generateFileId()
  const ext = path.extname(filename)
  const storedFilename = `${fileId}${ext}`

  if (config.type === 'volume') {
    return uploadToVolume(buffer, storedFilename, folder)
  } else {
    return uploadToS3(buffer, storedFilename, folder)
  }
}

async function uploadToVolume(
  buffer: Buffer,
  filename: string,
  folder: string
): Promise<UploadResult> {
  const uploadDir = path.join(config.volumePath!, folder)

  // Ensure directory exists
  await fs.mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, filename)
  await fs.writeFile(filePath, buffer)

  const stats = await fs.stat(filePath)

  return {
    id: filename.split('.')[0],
    path: filePath,
    url: `/api/files/${folder}/${filename}`,
    size: stats.size,
  }
}

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  folder: string
): Promise<UploadResult> {
  // Dynamically import AWS SDK only when needed
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

  const s3Client = new S3Client({
    region: config.s3Region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  const key = `${folder}/${filename}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: buffer,
    })
  )

  return {
    id: filename.split('.')[0],
    path: key,
    url: `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`,
    size: buffer.length,
  }
}

export async function getFile(filepath: string): Promise<Buffer> {
  if (config.type === 'volume') {
    return fs.readFile(filepath)
  } else {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')

    const s3Client = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: filepath,
      })
    )

    const stream = response.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    return Buffer.concat(chunks)
  }
}

export async function deleteFile(filepath: string): Promise<void> {
  if (config.type === 'volume') {
    await fs.unlink(filepath)
  } else {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')

    const s3Client = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3Bucket,
        Key: filepath,
      })
    )
  }
}
