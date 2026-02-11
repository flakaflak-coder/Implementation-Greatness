/**
 * Unified AI Client with Gemini → Claude Fallback
 *
 * Provides a consistent interface for AI operations with automatic
 * fallback from Gemini to Claude when rate-limited (429 errors).
 */

import { GoogleGenAI, type Part } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { extractText } from 'unpdf'

// Configuration
const GEMINI_MODEL = 'gemini-3-pro-preview'
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000
const DEFAULT_MAX_TOKENS = 16384 // Max without requiring streaming

// Lazy-load clients to avoid initialization issues in tests
let _gemini: GoogleGenAI | null = null
let _anthropic: Anthropic | null = null

function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
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
 * Categorized AI API error with user-friendly messaging
 */
interface AIApiError {
  type: 'rate_limit' | 'auth' | 'timeout' | 'server' | 'unknown'
  userMessage: string
  retryable: boolean
  retryAfterMs?: number
}

/**
 * Classify an error from an AI API call into a structured category.
 * Never exposes raw API keys or internal URLs in the user message.
 */
function classifyAIError(error: unknown): AIApiError {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      userMessage: 'An unexpected error occurred while communicating with the AI service.',
      retryable: false,
    }
  }

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Rate limit (429)
  if (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('resource exhausted') ||
    message.includes('too many requests') ||
    message.includes('quota')
  ) {
    // Try to extract retry-after from the error message
    const retryAfterMatch = error.message.match(/retry[- ]?after[:\s]*(\d+)/i)
    const retryAfterMs = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : 60000

    return {
      type: 'rate_limit',
      userMessage: `AI service rate limit reached. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before retrying.`,
      retryable: true,
      retryAfterMs,
    }
  }

  // Authentication / authorization (401 / 403)
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('invalid api key') ||
    message.includes('permission denied')
  ) {
    return {
      type: 'auth',
      userMessage: 'AI service authentication failed. Please check the API key configuration.',
      retryable: false,
    }
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline exceeded') ||
    name.includes('timeout') ||
    message.includes('econnaborted') ||
    message.includes('socket hang up')
  ) {
    return {
      type: 'timeout',
      userMessage: 'AI service request timed out. The file may be too large or the service is under heavy load. Please try again.',
      retryable: true,
    }
  }

  // Server errors (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server error') ||
    message.includes('service unavailable') ||
    message.includes('bad gateway')
  ) {
    return {
      type: 'server',
      userMessage: 'The AI service is temporarily unavailable. Please try again in a few minutes.',
      retryable: true,
    }
  }

  // Fallback: strip any potential credentials or URLs from the message
  let sanitized = error.message
    .replace(/(?:key|token|api[_-]?key)[=:\s]+\S+/gi, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '[service-url]')

  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...'
  }

  return {
    type: 'unknown',
    userMessage: `AI processing error: ${sanitized}`,
    retryable: false,
  }
}

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  return classifyAIError(error).type === 'rate_limit'
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

  const ai = getGeminiClient()

  const parts: Part[] = []

  // Handle file content
  if (options.fileBuffer && options.mimeType) {
    console.log(`[Gemini] Processing file: ${options.mimeType}, size: ${options.fileBuffer.length} bytes`)

    if (options.mimeType === 'application/pdf') {
      // Extract text from PDF to reduce token usage
      console.log('[Gemini] Extracting text from PDF...')
      const pdfText = await extractTextFromPDF(options.fileBuffer)
      console.log(`[Gemini] Extracted ${pdfText.length} chars from PDF`)
      parts.push({ text: `PDF DOCUMENT CONTENT:\n${pdfText}\n\n---\n\n` })
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
  parts.push({ text: options.prompt })
  console.log(`[Gemini] Prompt length: ${options.prompt.length} chars`)

  try {
    console.log('[Gemini] Calling API...')
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        maxOutputTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      },
    })

    const text = response.text ?? ''

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
    const classified = classifyAIError(error)
    console.error(`[Gemini] API Error (${classified.type}): ${classified.userMessage}`)
    // Throw a new error with the user-safe message but preserve the type for retry logic
    const wrappedError = new Error(classified.userMessage)
    wrappedError.name = `GeminiError_${classified.type}`
    throw wrappedError
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
    const classified = classifyAIError(error)
    console.error(`[Claude] API Error (${classified.type}): ${classified.userMessage}`)
    const wrappedError = new Error(classified.userMessage)
    wrappedError.name = `ClaudeError_${classified.type}`
    throw wrappedError
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
      const classified = classifyAIError(error)

      if (classified.type === 'rate_limit') {
        const delayMs = classified.retryAfterMs
          ? Math.min(classified.retryAfterMs, RETRY_DELAY_MS * (attempt + 1))
          : RETRY_DELAY_MS * (attempt + 1)

        console.log(`[AI Client] Gemini rate limited, attempt ${attempt + 1}/${MAX_RETRIES + 1}, retrying in ${delayMs}ms`)

        if (attempt < MAX_RETRIES) {
          await sleep(delayMs)
          continue
        }

        // Fall back to Claude if it can handle this content
        if (!options.mimeType || claudeCanHandle(options.mimeType)) {
          console.log('[AI Client] Falling back to Claude after Gemini rate limit')
          try {
            return await generateWithClaude(options)
          } catch (claudeError) {
            const claudeClassified = classifyAIError(claudeError)
            console.error(`[AI Client] Claude fallback also failed (${claudeClassified.type}): ${claudeClassified.userMessage}`)
            throw new Error(claudeClassified.userMessage)
          }
        }
      }

      // Auth errors should fail immediately with a clear message
      if (classified.type === 'auth') {
        throw new Error(classified.userMessage)
      }

      // Timeout errors: retry once before giving up
      if (classified.type === 'timeout' && attempt < MAX_RETRIES) {
        console.log(`[AI Client] Gemini timed out, retrying (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      // Non-retryable or exhausted retries: throw with user-safe message
      throw new Error(classified.userMessage)
    }
  }

  throw lastError || new Error('AI generation failed after all retry attempts.')
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
    if (!/[":,[\]{}]/.test(afterLastQuote.trim())) {
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
