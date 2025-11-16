/**
 * Gemini Integration - LLM Response Generation
 * Primary: Uses Gemini models (gemini-2.0-flash-lite by default)
 * Fallback: Groq SDK available but Gemini is preferred
 * Enhanced with rate limiting and token usage monitoring
 */

import Groq from "groq-sdk"
import { GoogleGenAI } from "@google/genai"
import { logAIGeneration, logFallback } from './metrics-logger'

let groqClient: Groq | null = null

// Gemini is the primary provider (USE_GEMINI defaults to true)
const USE_GEMINI = process.env.USE_GEMINI !== 'false' // Default to Gemini unless explicitly disabled
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Rate limiting configuration
interface RateLimitConfig {
  tokensPerMinute: number
  maxRetries: number
  baseDelayMs: number
  currentUsage: number
  lastResetTime: number
  requestQueue: Array<() => Promise<any>>
  isProcessing: boolean
}

// Initialize rate limiting config based on Groq's limits
const rateLimitConfig: RateLimitConfig = {
  tokensPerMinute: 5500, // Conservative limit (below the 6000 limit)
  maxRetries: 5,
  baseDelayMs: 3000, // 3 seconds base delay
  currentUsage: 0,
  lastResetTime: Date.now(),
  requestQueue: [],
  isProcessing: false
}

// Token usage estimation
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY not set. Groq client only used as fallback when Gemini fails.')
      throw new Error("GROQ_API_KEY not configured. Using Gemini as primary provider.")
    }
    groqClient = new Groq({ apiKey })
  }
  return groqClient
}

/**
 * Clean and format LLM response
 */
export function formatResponse(text: string): string {
  if (!text) return text

  let content = text.trim()

  // Remove surrounding quotes if present
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1).trim()
  }

  // Normalize bullet points
  content = content.replace(/^\s*[•*-]\s+/gm, "- ")

  // Remove markdown formatting
  content = content.replace(/\*\*(.+?)\*\*/g, "$1")
  content = content.replace(/\*(.+?)\*/g, "$1")
  content = content.replace(/__(.+?)__/g, "$1")
  content = content.replace(/_(.+?)_/g, "$1")
  content = content.replace(/`([^`]*)`/g, "$1")

  // Remove decorative prefixes
  const prefixes = ["Elevator Pitch:", "Behavioral Questions:", "Company Research:"]
  for (const prefix of prefixes) {
    const regex = new RegExp(`^\\s*${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "im")
    content = content.replace(regex, "")
  }

  // Remove generic meta disclaimers
  const metaPrefixes = [
    /^Here\s+are\s+the\s+answers/i,
    /^In\s+the\s+format\s+requested/i,
    /^Sure[,\s]/i,
    /^Certainly[,\s]/i,
  ]

  for (const regex of metaPrefixes) {
    content = content.replace(regex, "")
  }

  // Collapse multiple blank lines
  content = content.replace(/\n{3,}/g, "\n\n")

  // Ensure ends with punctuation
  if (!/[.!?](?:['""])?\s*$/.test(content)) {
    content += "."
  }

  return content.trim()
}

export interface GenerateResponseOptions {
  question: string
  context: string
  canonicalName?: string
  // Optional provider hint: 'gemini' to force Gemini, 'groq' to force Groq SDK
  provider?: 'gemini' | 'groq'
}

/**
 * Generate response using Gemini (primary) with Groq fallback
 */
export async function generateResponse(options: GenerateResponseOptions): Promise<string> {
  // Gemini is now the primary provider (unless explicitly set to use Groq)
  const shouldUseGemini = options.provider !== 'groq' && USE_GEMINI
  const started = Date.now()
  let geminiFailed = false
  
  if (shouldUseGemini) {
    const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
    if (!GEMINI_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not set; falling back to Groq provider')
    } else {
      try {
        console.log('🤖 Using Gemini API for text generation...')
        const geminiStart = Date.now()
        const out = await geminiGenerate(options, GEMINI_KEY)
        logAIGeneration({
          status: 200,
          ok: true,
          durationMs: Date.now() - geminiStart,
          provider: 'gemini',
          query: options.question.substring(0,160),
          mode: options.provider === 'gemini' ? 'advanced' : undefined,
          fallbackUsed: false
        }).catch(()=>{})
        return out
      } catch (err) {
        // Log and continue to fallback to Groq
        console.error('❌ Gemini generation failed, falling back to Groq:', err)
        geminiFailed = true
        const message = err instanceof Error ? err.message : String(err)
        const isRateLimit = /429|rate[_\s-]?limit|quota/i.test(message)
        logAIGeneration({
          status: isRateLimit ? 429 : 500,
          ok: false,
          durationMs: Date.now() - started,
          provider: 'gemini',
          query: options.question.substring(0,160),
          mode: options.provider === 'gemini' ? 'advanced' : undefined,
          errorMessage: message,
          fallbackUsed: true
        }).catch(()=>{})
        
        // Log fallback event to database
        logFallback({
          from: 'gemini',
          to: 'groq',
          reason: isRateLimit ? 'rate_limit' : 'error',
          query: options.question.substring(0, 512),
          originalStatus: isRateLimit ? 429 : 500,
          message: message.substring(0, 256)
        }).catch(()=>{})
      }
    }
    // If no API key or geminiGenerate failed, continue to Groq path below
  }

  return new Promise((resolve, reject) => {
    // Add request to queue
    rateLimitConfig.requestQueue.push(async () => {
      try {
        const result = await executeGroqRequest(options)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
    
    // Process queue
    processRequestQueue()
  })
}

/**
 * Gemini text generation via Google's Generative API (simple wrapper)
 * This runs when `USE_GEMINI=true` and reads the API key from `GEMINI_API_KEY` or `GROQ_API_KEY`.
 * Note: This implementation uses the HTTP REST endpoint and a simple prompt-based generate call.
 */
async function geminiGenerate(options: GenerateResponseOptions, apiKey: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'

  // Build a compact prompt following existing system guidance
  const systemInstructions = `You are an AI digital twin responding in first person. Use only the provided context unless general knowledge is trivial. Do not provide personal contact or sensitive information. Write concise, recruiter-ready answers. Keep answers between 50 and 200 words. CRITICAL RULES: (1) Use ONLY first-person singular ("I", "my", "me") - NEVER "we", "our", "us". (2) NO explicit STAR markers like "The result?", "My task was", "The situation was" - create natural flowing responses instead. (3) If context contains "My name is [Your Name]" or similar, extract and use the ACTUAL name naturally (e.g., "My name is John" → "I'm John").`
  const promptText = `${systemInstructions}\n\nContext:\n${options.context}\n\nQuestion: ${options.question}\n\nProvide a helpful, professional, conversational response:`

  try {
    const client = new GoogleGenAI({ apiKey })
    const modelName = model
    
    // Use the SDK's generateContent API with proper parameters
    const resp: any = await client.models.generateContent({
      model: modelName,
      contents: promptText
    })

    // Extract text from response
    const text = resp?.text || resp?.output?.[0]?.content || resp?.candidates?.[0]?.content || ''
    return formatResponse(String(text || ''))
  } catch (err: any) {
    console.error('❌ Gemini generation failed (SDK):', err)
    throw err
  }
}

/**
 * Process queued requests with rate limiting
 */
async function processRequestQueue(): Promise<void> {
  if (rateLimitConfig.isProcessing || rateLimitConfig.requestQueue.length === 0) {
    return
  }
  
  rateLimitConfig.isProcessing = true
  
  while (rateLimitConfig.requestQueue.length > 0) {
    // Reset usage counter every minute
    const now = Date.now()
    if (now - rateLimitConfig.lastResetTime > 60000) {
      rateLimitConfig.currentUsage = 0
      rateLimitConfig.lastResetTime = now
      console.log('🔄 Token usage reset for new minute')
    }
    
    // Check if we're approaching the limit
    if (rateLimitConfig.currentUsage > rateLimitConfig.tokensPerMinute * 0.8) {
      const waitTime = 60000 - (now - rateLimitConfig.lastResetTime)
      console.log(`⏳ Approaching rate limit (${rateLimitConfig.currentUsage}/${rateLimitConfig.tokensPerMinute}), waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      rateLimitConfig.currentUsage = 0
      rateLimitConfig.lastResetTime = Date.now()
    }
    
    const request = rateLimitConfig.requestQueue.shift()
    if (request) {
      await request()
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  rateLimitConfig.isProcessing = false
}

/**
 * Execute actual Groq API request with retry logic
 */
async function executeGroqRequest(options: GenerateResponseOptions): Promise<string> {
  const client = getGroqClient()
  const chatModel = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant"
  const started = Date.now()

  const systemLines = [
    "You are an AI digital twin responding in first person. Use only the provided context unless general knowledge is trivial.",
    "Do not provide personal contact or sensitive information (email, phone, address, DOB, IDs, bank details).",
    "Write concise, recruiter-ready answers. Prefer bullet points when listing items.",
    "Keep answers between 50 and 200 words. Include quantified outcomes when available.",
    "Never include your thought process or internal reasoning in the response.",
  ]

  if (options.canonicalName) {
    systemLines.push(
      `Always use the correct name: ${options.canonicalName}. If variants are used, respond with the canonical spelling.`,
    )
  }

  const prompt = `Based on the following professional information, answer the question in first person.

Context:
${options.context}

Question: ${options.question}

IMPORTANT RULES:
1. Use ONLY first-person singular ("I", "my", "me") - NEVER "we", "our", "us"
2. NO explicit STAR format markers (avoid "The result?", "My task was", "The situation was")
3. Create natural, flowing responses that tell a cohesive story
4. Focus on individual contributions and achievements
5. If the context contains "My name is [Your Name]" or similar, extract and use the ACTUAL name naturally
6. Replace placeholder text like "[Your Name]" with the real name from the context

Provide a helpful, professional, conversational response:`

  // Estimate token usage for this request
  const systemContent = systemLines.join(" ")
  const estimatedTokens = estimateTokens(systemContent + prompt) + 200 // Add buffer for response
  
  console.log(`🔍 Estimated tokens for request: ${estimatedTokens}, Current usage: ${rateLimitConfig.currentUsage}/${rateLimitConfig.tokensPerMinute}`)

  // Enhanced retry logic with exponential backoff
  for (let attempt = 0; attempt < rateLimitConfig.maxRetries; attempt++) {
    try {
      // Add progressive delay for retries
      if (attempt > 0) {
        const delayTime = rateLimitConfig.baseDelayMs * Math.pow(2, attempt - 1)
        console.log(`⏳ Rate limit retry ${attempt}/${rateLimitConfig.maxRetries}, waiting ${delayTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayTime))
      }

      const completion = await client.chat.completions.create({
        model: chatModel,
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: options.question.includes('metrics') || options.question.includes('Evaluate') ? 0.1 : 0.7, // Lower temperature for evaluations
        max_tokens: options.question.includes('metrics') || options.question.includes('Evaluate') ? 300 : 200, // More tokens for evaluations
        response_format: options.question.includes('ONLY valid JSON') ? { "type": "json_object" } : undefined,
      })

      // Update token usage tracking
      const actualTokens = completion.usage?.total_tokens || estimatedTokens
      rateLimitConfig.currentUsage += actualTokens
      console.log(`✅ Request completed. Tokens used: ${actualTokens}, Total usage: ${rateLimitConfig.currentUsage}/${rateLimitConfig.tokensPerMinute}`)

      const responseText = completion.choices[0].message.content || ""
      const formatted = formatResponse(responseText)
      logAIGeneration({
        status: 200,
        ok: true,
        durationMs: Date.now() - started,
        provider: 'groq',
        query: options.question.substring(0,160),
        mode: options.provider === 'groq' ? 'basic' : undefined,
        fallbackUsed: false
      }).catch(()=>{})
      return formatted
      
    } catch (error: any) {
      console.error(`Groq API error (attempt ${attempt + 1}):`, {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      })
      
      // Enhanced rate limit detection
      const isRateLimit = error?.message?.includes('429') || 
                         error?.status === 429 || 
                         error?.message?.includes('rate_limit') ||
                         error?.code === 'rate_limit_exceeded' ||
                         error?.type === 'tokens'
      
      if (isRateLimit) {
        // For rate limits, wait longer and reset usage tracking
        if (attempt < rateLimitConfig.maxRetries - 1) {
          const waitTime = Math.max(5000, rateLimitConfig.baseDelayMs * Math.pow(2, attempt))
          console.log(`🚫 Rate limit hit! Waiting ${waitTime}ms before retry...`)
          
          // Reset usage and wait for next minute
          rateLimitConfig.currentUsage = rateLimitConfig.tokensPerMinute
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      } else if (attempt < rateLimitConfig.maxRetries - 1) {
        // For other errors, shorter retry delay
        const shortDelay = 1000 * (attempt + 1)
        console.log(`🔄 Non-rate-limit error, retrying in ${shortDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, shortDelay))
        continue
      }
      
      // Max retries exceeded or non-retryable error
      const message = `Groq API failed after ${attempt + 1} attempts: ${error.message}`
      logAIGeneration({
        status: isRateLimit ? 429 : 500,
        ok: false,
        durationMs: Date.now() - started,
        provider: 'groq',
        query: options.question.substring(0,160),
        mode: options.provider === 'groq' ? 'basic' : undefined,
        errorMessage: message,
        fallbackUsed: false
      }).catch(()=>{})
      throw new Error(message)
    }
  }

  throw new Error(`Failed after ${rateLimitConfig.maxRetries} attempts`)
}
