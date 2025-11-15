/**
 * Puter AI Integration - Free AI API Alternative
 * Uses Puter's free AI services to avoid rate limiting
 * Model: google/gemini-2.0-flash-exp (via Puter)
 * Embeddings: qwen/qwen3-embedding-0.6b (via HuggingFace Transformers.js)
 * 
 * NOTE: Puter API requires authentication via their SDK methods
 * The SDK handles auth headers automatically when using puter.ai methods
 */

import type { FeatureExtractionPipeline } from '@xenova/transformers'

// Dynamic imports to avoid build-time issues
let embeddingPipeline: FeatureExtractionPipeline | null = null

/**
 * Puter AI HTTP API Configuration
 * 
 * IMPORTANT: Puter's HTTP API authentication is complex.
 * The auth token from the browser SDK may not work directly with HTTP API.
 * 
 * Alternative: Use client-side SDK methods (see puter-ai-client.ts)
 */
const PUTER_API_BASE = 'https://api.puter.com/drivers/call'
const PUTER_AI_MODEL = 'google/gemini-2.5-pro'

/**
 * Get Puter auth token from headers (passed from client)
 */
function getPuterAuthToken(): string | null {
  // In a real implementation, this would come from the request headers
  // For now, we'll handle it through the generatePuterResponse options
  return null
}

/**
 * Initialize HuggingFace embedding pipeline (lazy load)
 * Model: qwen/qwen3-embedding-0.6b (1024 dimensions)
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    console.log('🤖 Loading qwen/qwen3-embedding-0.6b embedding model...')
    try {
      // Dynamic import to avoid build issues with sharp dependency
      const { pipeline } = await import('@xenova/transformers')
      
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'qwen/qwen3-embedding-0.6b',
        { 
          quantized: true, // Use quantized model for faster inference
        }
      ) as FeatureExtractionPipeline
      console.log('✅ Embedding model loaded successfully')
    } catch (error) {
      console.error('Failed to load embedding model:', error)
      throw new Error(`Failed to load embedding model: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return embeddingPipeline
}

/**
 * Generate embeddings using HuggingFace Transformers.js
 * Model: qwen/qwen3-embedding-0.6b (outputs 1024D vectors natively)
 */
export async function generatePuterEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getEmbeddingPipeline()
    
    // Generate embeddings
    const output = await extractor(text, { 
      pooling: 'mean',
      normalize: true 
    })
    
    // Extract the embedding array
    let embedding: number[]
    if (Array.isArray(output)) {
      embedding = output
    } else if (output?.data) {
      embedding = Array.from(output.data as Float32Array)
    } else {
      throw new Error('Unexpected embedding output format')
    }
    
    console.log(`Generated ${embedding.length}D embedding using qwen/qwen3-embedding-0.6b`)
    
    // qwen/qwen3-embedding-0.6b outputs 1024D vectors natively
    const expectedDimension = 1024
    if (embedding.length !== expectedDimension) {
      console.warn(`Warning: Expected ${expectedDimension}D, got ${embedding.length}D`)
      
      // Pad or truncate to match Upstash Vector DB expectations
      if (embedding.length < expectedDimension) {
        const padding = new Array(expectedDimension - embedding.length).fill(0)
        embedding = [...embedding, ...padding]
        console.log(`Padded embedding to ${expectedDimension}D`)
      } else {
        embedding = embedding.slice(0, expectedDimension)
        console.log(`Truncated embedding to ${expectedDimension}D`)
      }
    }
    
    return embedding
  } catch (error) {
    console.error('Embedding generation error:', error)
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export interface PuterGenerateOptions {
  question: string
  context: string
  canonicalName?: string
  temperature?: number
  maxTokens?: number
  authToken?: string // Puter authentication token from client
}

/**
 * Generate response using Puter AI HTTP API
 * Model: google/gemini-2.0-flash-exp (via Puter's free API)
 */
// export async function generatePuterResponse(options: PuterGenerateOptions): Promise<string> {
//   const {
//     question,
//     context,
//     canonicalName,
//     temperature = 0.7,
//     maxTokens = 300,
//     authToken
//   } = options

//   try {
//     console.log('🤖 Generating response with Puter AI HTTP API...')
    
//     // Check if we have an auth token
//     if (!authToken) {
//       console.warn('⚠️ No Puter auth token provided, API call may fail')
//       throw new Error('Puter authentication required - please sign in')
//     }
    
//     console.log('🔑 Using auth token:', authToken.substring(0, 20) + '...' + authToken.substring(authToken.length - 10))
    
//     // Build system instructions
//     const systemInstructions = [
//       "You are an AI digital twin responding in first person.",
//       "Use only the provided context unless general knowledge is trivial.",
//       "Do not provide personal contact or sensitive information.",
//       "Write concise, recruiter-ready answers between 50 and 200 words.",
//       "Use ONLY first-person singular (I, my, me) - NEVER we, our, us.",
//       "NO explicit STAR markers like 'The result?' or 'My task was'.",
//       "Create natural flowing responses.",
//     ]

//     if (canonicalName) {
//       systemInstructions.push(
//         `Always use the correct name: ${canonicalName}. If variants are used, respond with the canonical spelling.`
//       )
//     }

//     const systemPrompt = systemInstructions.join(' ')
    
//     const userPrompt = `Context: ${context}\n\nQuestion: ${question}\n\nProvide a helpful, professional, conversational response:`

//     // Call Puter HTTP API with authentication
//     // Try different auth header formats
//     const headers: Record<string, string> = {
//       'Content-Type': 'application/json',
//     }
    
//     // Try multiple authentication formats
//     // Format 1: Standard Bearer token
//     headers['Authorization'] = `Bearer ${authToken}`
//     // Format 2: Puter-specific token header
//     headers['X-Puter-Auth'] = authToken
//     // Format 3: Direct token header
//     headers['token'] = authToken
    
//     console.log('🔑 Request headers (auth-related):', { 
//       Authorization: headers['Authorization'].substring(0, 30) + '...',
//       'X-Puter-Auth': authToken.substring(0, 20) + '...',
//       token: authToken.substring(0, 20) + '...'
//     })
    
//     const response = await fetch(PUTER_API_BASE, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify({
//         interface: 'puter-chat-completion',
//         driver: 'openai',
//         method: 'complete',
//         // Include auth token in body as well (some APIs expect it here)
//         token: authToken,
//         authToken: authToken,
//         args: {
//           messages: [
//             { role: 'system', content: systemPrompt },
//             { role: 'user', content: userPrompt }
//           ],
//           model: PUTER_AI_MODEL,
//           temperature: temperature,
//           max_tokens: maxTokens,
//         }
//       })
//     })

//     console.log('📡 Puter API response status:', response.status)
//     console.log('📡 Puter API response headers:', Object.fromEntries(response.headers.entries()))

//     if (!response.ok) {
//       const errorText = await response.text()
//       console.error('❌ Puter API error response:', errorText)
//       console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()))
//       throw new Error(`Puter API error: ${response.status} ${response.statusText} - ${errorText}`)
//     }

//     const data = await response.json()
    
//     // Extract the answer from the response
//     let answer: string
//     if (data?.result?.choices?.[0]?.message?.content) {
//       answer = data.result.choices[0].message.content
//     } else if (data?.message) {
//       answer = data.message
//     } else if (data?.text) {
//       answer = data.text
//     } else {
//       throw new Error('Unexpected Puter API response format')
//     }

//     console.log('✅ Puter AI response generated successfully')
    
//     // Clean and format response
//     const cleanedResponse = formatPuterResponse(answer)
//     return cleanedResponse
    
//   } catch (error: any) {
//     console.error('Puter AI generation error:', error)
    
//     // Check if it's a rate limit or quota error
//     if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('rate')) {
//       throw new Error('PUTER_RATE_LIMIT')
//     }
    
//     throw new Error(`Puter AI generation failed: ${error.message || String(error)}`)
//   }
// }

/**
 * Clean and format Puter AI response
 */
function formatPuterResponse(text: string): string {
  if (!text) return text

  let content = text.trim()

  // Remove surrounding quotes
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1).trim()
  }

  // Normalize bullet points
  content = content.replace(/^\s*[•*-]\s+/gm, '- ')

  // Remove markdown formatting
  content = content.replace(/\*\*(.+?)\*\*/g, '$1')
  content = content.replace(/\*(.+?)\*/g, '$1')
  content = content.replace(/__(.+?)__/g, '$1')
  content = content.replace(/_(.+?)_/g, '$1')
  content = content.replace(/`([^`]*)`/g, '$1')

  // Remove STAR markers
  const starMarkers = [
    /The result\?[\s:]/gi,
    /The situation was[:\s]/gi,
    /My task was[:\s]/gi,
    /The task was[:\s]/gi,
  ]

  for (const pattern of starMarkers) {
    content = content.replace(pattern, '')
  }

  // Collapse multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n')

  // Ensure ends with punctuation
  if (!/[.!?](?:['""])?\s*$/.test(content)) {
    content += '.'
  }

  return content.trim()
}

/**
 * Check if Puter AI is available
 * Tests API endpoint with a simple request
 */
export async function isPuterAvailable(): Promise<boolean> {
  try {
    console.log('🔍 Testing Puter API endpoint...')
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(PUTER_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interface: 'puter-chat-completion',
        driver: 'openai',
        method: 'complete',
        args: {
          messages: [{ role: 'user', content: 'test' }],
          model: PUTER_AI_MODEL,
          max_tokens: 5
        }
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    console.log(`Puter API response status: ${response.status}`)
    
    // Consider 200-299 as available, 401/403 as available but need auth
    const isAvailable = response.status >= 200 && response.status < 500
    console.log(`Puter API available: ${isAvailable}`)
    
    return isAvailable
  } catch (error) {
    if (error instanceof Error) {
      console.error('Puter API check failed:', error.message)
    }
    return false
  }
}
