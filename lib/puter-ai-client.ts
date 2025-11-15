/**
 * Client-side Puter AI Integration
 * 
 * The Puter SDK's AI methods only work in browser context with authentication.
 * This file provides client-side methods that use the authenticated Puter SDK.
 */

'use client'

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true' || (typeof window !== 'undefined' && (window as any).__PUTER_DEBUG__ === true)

function formatPuterError(err: any): string {
  if (!err) return 'Unknown Puter error'
  if (typeof err === 'string') return err
  if (typeof err.message === 'string' && err.message.length) return err.message
  if (err.error && typeof err.error.message === 'string') return err.error.message
  if (err.data && typeof err.data.message === 'string') return err.data.message
  try {
    const json = JSON.stringify(err)
    if (json && json !== '{}') return json
  } catch {}
  try {
    const s = err.toString?.()
    if (s && s !== '[object Object]') return s
  } catch {}
  return 'Unknown Puter error'
}

function buildSystemPrompt(canonicalName?: string) {
  const lines = [
    'You are an AI digital twin responding in first person.',
    "Answer directly without preambles like 'Here is' or 'Of course'.",
    'Use only the provided context unless general knowledge is trivial.',
    'Do not provide personal contact or sensitive information.',
    'Write concise, recruiter-ready answers between 50 and 500 words.',
    'Use ONLY first-person singular (I, my, me) - NEVER we, our, us.',
    "NO explicit STAR markers like 'The result?' or 'My task was'.",
    'Create natural flowing responses.',
    'Start your response immediately with the actual answer.',
  ]
  if (canonicalName) lines.push(`Always use the correct name: ${canonicalName}. If variants are used, respond with the canonical spelling.`)
  return lines.join(' ')
}

function buildUserPrompt(context: string, question: string) {
  return `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`
}

export interface PuterAIOptions {
  question: string
  context?: string
  canonicalName?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Stream AI response using authenticated Puter SDK (client-side only)
 * Mirrors Puter docs Example 3 but keeps our context/system prompts.
 */
export async function streamPuterAIResponse(
  options: PuterAIOptions & {
    onChunk: (delta: string) => void
    onDone?: (final: string) => void
    model?: string
  }
): Promise<string> {
  const {
    question,
    context,
    canonicalName,
    temperature = 0.7,
    maxTokens = 5000,
    onChunk,
    onDone,
    model,
  } = options

  const puter = (window as any).puter
  if (!puter || !puter.ai || typeof puter.ai.chat !== 'function') {
    throw new Error('Puter SDK not available or user not authenticated')
  }

  const systemPrompt = buildSystemPrompt(canonicalName)
  const userPrompt = buildUserPrompt(context || '', question)

  const useModel = (model || process.env.NEXT_PUBLIC_PUTER_MODEL_STREAM || 'google/gemini-2.5-pro').toString().trim()
  if (DEBUG) {
    console.log('🤖 Streaming via Puter AI SDK...')
    console.log('📋 Model (stream):', useModel)
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    const stream = await puter.ai.chat(messages, {
      model: useModel,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    let buffer = ''
    for await (const part of stream) {
      const delta: string = (part?.message?.content || part?.text || '') as string
      if (!delta) continue
      buffer += delta
      try {
        onChunk(delta)
      } catch (e) {
        console.warn('onChunk callback error:', e)
      }
    }

    try {
      onDone?.(buffer)
    } catch (e) {
      console.warn('onDone callback error:', e)
    }

    return buffer
  } catch (err: any) {
    const msg = formatPuterError(err)
    if (DEBUG) console.error('Puter stream error:', err)
    throw new Error(msg)
  }
}

// ---- Integrated Retrieval + Streaming (Basic RAG in one pipeline) ----

// NOTE: Client-side vector embedding removed (transformers.js heavy & index requires dense vectors).
// Retrieval now delegated to server route `/api/vector-context`.

export interface VectorSource {
  id: string
  title: string
  content: string
  score: number
  category: string
  tags?: string[]
}

export async function streamPuterAIWithRetrieval(
  options: Omit<PuterAIOptions, 'context'> & {
    onChunk: (delta: string) => void
    onDone?: (final: string) => void
    onContext?: (sources: VectorSource[]) => void
    topK?: number
    model?: string
  }
): Promise<{ final: string; sources: VectorSource[] }> {
  const {
    question,
    canonicalName,
    temperature = 0.7,
    maxTokens = 1500,
    onChunk,
    onDone,
    onContext,
    topK = 8,
    model,
  } = options

  // SERVER RETRIEVAL (dense vectors): fetch context & sources
  if (DEBUG) console.log('🔎 Fetching dense vector context from /api/vector-context ...')
  let sources: VectorSource[] = []
  let context = ''
  try {
    const resp = await fetch('/api/vector-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, topK })
    })
    if (resp.ok) {
      const data = await resp.json()
      sources = (data.sources || []) as VectorSource[]
      context = data.context || ''
      if (DEBUG) console.log(`📊 Received ${sources.length} sources; context length=${context.length}`)
    } else {
      const errText = await resp.text().catch(() => '')
      console.warn('Context route error:', resp.status, errText)
    }
  } catch (e) {
    console.warn('Context fetch failed:', e)
  }

  // Notify UI
  try { onContext?.(sources) } catch (_) {}

  const topDocs = context || sources.slice(0, 3).map(r => `${r.title}: ${r.content}`).join('\n\n')

  // 4) Stream response with Puter using built context
  const final = await streamPuterAIResponse({
    question,
    context: topDocs,
    canonicalName,
    temperature,
    maxTokens,
    onChunk,
    onDone,
    model,
  })

  return { final, sources }
}

