/**
 * Unified AI Client with Gemini → Claude Fallback
 *
 * Provides a consistent interface for AI operations with automatic
 * fallback from Gemini to Claude when rate-limited (429 errors).
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import { extractText } from 'unpdf'

// Configuration
const GEMINI_MODEL = 'gemini-3-pro-preview'
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000
const DEFAULT_MAX_TOKENS = 16384 // Max without requiring streaming

// Lazy-load clients to avoid initialization issues in tests
let _gemini: GoogleGenerativeAI | null = null
let _anthropic: Anthropic | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) {
    _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  }
  return _gemini
}

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return _anthropic
}

// MIME types that Claude can handle via PDF/image support
const CLAUDE_SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/html',
  'text/csv',
]

// MIME types that are multimodal (audio/video) - Gemini only
const MULTIMODAL_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

export interface AIGenerateOptions {
  prompt: string
  fileBuffer?: Buffer
  mimeType?: string
  maxTokens?: number
  temperature?: number
}

export interface AIGenerateResult {
  text: string
  provider: 'gemini' | 'claude'
  tokensUsed?: {
    input: number
    output: number
  }
  truncated?: boolean // True if response was cut off due to max tokens
}

/**
 * Extract text from PDF buffer
 * This dramatically reduces token usage compared to sending raw PDF bytes
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const result = await extractText(new Uint8Array(buffer))
    const { text, totalPages } = result

    // unpdf returns text as array of strings (one per page) - join them
    const fullText = Array.isArray(text) ? text.join('\n\n') : text
    console.log(`[AI Client] Extracted text from ${totalPages} PDF pages (${fullText.length} chars)`)

    // Debug: show preview if text seems too short
    if (fullText.length < 100) {
      console.log(`[AI Client] Warning: Very short text extracted. Preview: "${fullText.substring(0, 200)}"`)
      console.log(`[AI Client] Result keys:`, Object.keys(result))
    }

    return fullText
  } catch (error) {
    console.error('[AI Client] PDF text extraction failed:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('resource exhausted') ||
      message.includes('too many requests')
    )
  }
  return false
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate content using Gemini
 */
async function generateWithGemini(options: AIGenerateOptions): Promise<AIGenerateResult> {
  console.log('[Gemini] Starting generation...')

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      maxOutputTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    },
  })

  const parts: (string | Part)[] = []

  // Handle file content
  if (options.fileBuffer && options.mimeType) {
    console.log(`[Gemini] Processing file: ${options.mimeType}, size: ${options.fileBuffer.length} bytes`)

    if (options.mimeType === 'application/pdf') {
      // Extract text from PDF to reduce token usage
      console.log('[Gemini] Extracting text from PDF...')
      const pdfText = await extractTextFromPDF(options.fileBuffer)
      console.log(`[Gemini] Extracted ${pdfText.length} chars from PDF`)
      parts.push(`PDF DOCUMENT CONTENT:\n${pdfText}\n\n---\n\n`)
    } else {
      // For other file types, send as inline data
      parts.push({
        inlineData: {
          data: options.fileBuffer.toString('base64'),
          mimeType: options.mimeType,
        },
      })
    }
  }

  // Add prompt after file content
  parts.push(options.prompt)
  console.log(`[Gemini] Prompt length: ${options.prompt.length} chars`)

  try {
    console.log('[Gemini] Calling API...')
    const result = await model.generateContent(parts)
    const response = result.response
    const text = response.text()

    // Check for truncation - Gemini uses finishReason
    const finishReason = response.candidates?.[0]?.finishReason
    const truncated = finishReason === 'MAX_TOKENS'
    if (truncated) {
      console.warn('[Gemini] Response was truncated due to max tokens limit')
    }

    console.log(`[Gemini] Success! Response: ${text.length} chars, tokens: ${response.usageMetadata?.promptTokenCount || 0} in / ${response.usageMetadata?.candidatesTokenCount || 0} out, finishReason: ${finishReason}`)

    return {
      text,
      provider: 'gemini',
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
      },
      truncated,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Gemini] API Error: ${errorMsg}`)
    throw error
  }
}

/**
 * Generate content using Claude
 */
async function generateWithClaude(options: AIGenerateOptions): Promise<AIGenerateResult> {
  console.log('[Claude] Starting generation...')

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const anthropic = getAnthropicClient()

  // Build message content
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  // Add file content if supported
  if (options.fileBuffer && options.mimeType) {
    console.log(`[Claude] Processing file: ${options.mimeType}, size: ${options.fileBuffer.length} bytes`)

    if (options.mimeType === 'application/pdf') {
      // Extract text from PDF to reduce token usage by ~90%
      console.log('[Claude] Extracting text from PDF...')
      const pdfText = await extractTextFromPDF(options.fileBuffer)
      console.log(`[Claude] Extracted ${pdfText.length} chars from PDF`)
      content.push({
        type: 'text',
        text: `PDF DOCUMENT CONTENT:\n${pdfText}\n\n---\n\n`,
      })
    } else if (options.mimeType.startsWith('image/')) {
      const mediaType = options.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: options.fileBuffer.toString('base64'),
        },
      })
    } else if (options.mimeType.startsWith('text/')) {
      // For text files, include as text content
      content.push({
        type: 'text',
        text: `FILE CONTENT:\n${options.fileBuffer.toString('utf-8')}\n\n---\n\n`,
      })
    }
  }

  // Add the prompt
  content.push({
    type: 'text',
    text: options.prompt,
  })

  console.log(`[Claude] Prompt length: ${options.prompt.length} chars`)

  try {
    console.log('[Claude] Calling API...')
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    const text = textContent?.type === 'text' ? textContent.text : ''

    // Check for truncation - Claude uses stop_reason
    const truncated = response.stop_reason === 'max_tokens'
    if (truncated) {
      console.warn('[Claude] Response was truncated due to max tokens limit')
    }

    console.log(`[Claude] Success! Response: ${text.length} chars, tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out, stop_reason: ${response.stop_reason}`)

    return {
      text,
      provider: 'claude',
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      truncated,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Claude] API Error: ${errorMsg}`)
    throw error
  }
}

/**
 * Check if Claude can handle a given MIME type
 */
export function claudeCanHandle(mimeType: string): boolean {
  return (
    CLAUDE_SUPPORTED_MIME_TYPES.includes(mimeType) ||
    mimeType.startsWith('text/') ||
    mimeType.startsWith('image/')
  )
}

/**
 * Check if a MIME type is multimodal (audio/video)
 */
export function isMultimodalContent(mimeType: string): boolean {
  return MULTIMODAL_MIME_TYPES.some((type) => mimeType.startsWith(type.split('/')[0] + '/'))
}

/**
 * Generate content with Gemini primary, Claude fallback
 *
 * Uses Gemini first (larger rate limits, 1M context window).
 * Falls back to Claude on rate limit errors (429).
 */
export async function generateWithFallback(
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  // For multimodal content (audio/video), only Gemini can handle it
  if (options.mimeType && isMultimodalContent(options.mimeType)) {
    console.log('[AI Client] Using Gemini (multimodal content)')
    return await generateWithGemini(options)
  }

  // Try Gemini first (better rate limits)
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI Client] Using Gemini (attempt ${attempt + 1})`)
      return await generateWithGemini(options)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (isRateLimitError(error)) {
        console.log(`[AI Client] Gemini rate limited, attempt ${attempt + 1}/${MAX_RETRIES + 1}`)

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1))
          continue
        }

        // Fall back to Claude if it can handle this content
        if (!options.mimeType || claudeCanHandle(options.mimeType)) {
          console.log('[AI Client] Falling back to Claude')
          return await generateWithClaude(options)
        }
      }

      // Non-rate-limit error, throw immediately
      throw error
    }
  }

  throw lastError || new Error('AI generation failed')
}

/**
 * Attempt to repair common JSON issues from AI responses
 */
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr.trim()

  // Count brackets to detect truncation
  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Fix truncated strings - if ends with unclosed quote, close it
  if ((repaired.match(/"/g) || []).length % 2 !== 0) {
    // Find last quote and check if it's an unclosed string
    const lastQuoteIdx = repaired.lastIndexOf('"')
    const afterLastQuote = repaired.substring(lastQuoteIdx + 1)
    // If nothing meaningful after quote, it's likely truncated mid-string
    if (!/[":,\[\]{}]/.test(afterLastQuote.trim())) {
      repaired = repaired.substring(0, lastQuoteIdx + 1) + '"'
      console.log('[JSON Repair] Fixed unclosed string')
    }
  }

  // Add missing closing brackets/braces for truncated responses
  const missingBraces = openBraces - closeBraces
  const missingBrackets = openBrackets - closeBrackets

  if (missingBraces > 0 || missingBrackets > 0) {
    console.log(`[JSON Repair] Detected truncation: missing ${missingBrackets} ] and ${missingBraces} }`)

    // Try to close arrays first, then objects (common nesting pattern)
    // Remove any trailing partial content that might be incomplete
    repaired = repaired.replace(/,\s*"[^"]*$/, '') // Remove trailing incomplete key
    repaired = repaired.replace(/,\s*$/, '') // Remove trailing comma
    repaired = repaired.replace(/:\s*$/, ': null') // Fix trailing colon

    // Add closing brackets
    for (let i = 0; i < missingBrackets; i++) {
      repaired += ']'
    }
    for (let i = 0; i < missingBraces; i++) {
      repaired += '}'
    }
  }

  return repaired
}

/**
 * Parse JSON from AI response text
 */
export function parseJSONFromResponse(text: string): unknown {
  console.log(`[JSON Parser] Parsing response (${text.length} chars)...`)

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[JSON Parser] No JSON found in response')
    console.error('[JSON Parser] Response preview:', text.substring(0, 500))
    throw new Error('Failed to parse JSON from AI response - no JSON block found')
  }

  let jsonStr = jsonMatch[1] || jsonMatch[0]
  console.log(`[JSON Parser] Found JSON block (${jsonStr.length} chars)`)

  // First attempt: parse as-is
  try {
    const parsed = JSON.parse(jsonStr)
    console.log('[JSON Parser] Successfully parsed JSON')
    return parsed
  } catch (firstError) {
    const firstErrorMsg = firstError instanceof Error ? firstError.message : String(firstError)
    console.log(`[JSON Parser] First parse attempt failed: ${firstErrorMsg}`)
    console.log('[JSON Parser] Attempting JSON repair...')

    // Second attempt: try to repair the JSON
    try {
      const repairedJson = repairJSON(jsonStr)
      const parsed = JSON.parse(repairedJson)
      console.log('[JSON Parser] Successfully parsed repaired JSON')
      return parsed
    } catch (repairError) {
      const parseError = repairError instanceof Error ? repairError.message : String(repairError)
      console.error(`[JSON Parser] Repair failed: ${parseError}`)
      console.error('[JSON Parser] JSON preview (start):', jsonStr.substring(0, 500))
      console.error('[JSON Parser] JSON preview (end):', jsonStr.substring(Math.max(0, jsonStr.length - 500)))
      throw new Error(`Failed to parse JSON: ${firstErrorMsg}`)
    }
  }
}
