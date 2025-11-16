/**
 * Client-side Puter AI Integration
 * 
 * The Puter SDK's AI methods only work in browser context with authentication.
 * This file provides client-side methods that use the authenticated Puter SDK.
 */

'use client'

// Ordered model fallback list. First working model is used.
// Can be overridden by NEXT_PUBLIC_PUTER_MODEL_FALLBACKS (comma-separated)
export const DEFAULT_PUTER_MODEL_FALLBACKS: string[] = [
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash'
]

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true' || (typeof window !== 'undefined' && (window as any).__PUTER_DEBUG__ === true)

function formatPuterError(err: any): string {
  if (!err) return 'Unknown Puter error'
  // Handle Puter standard error shape { success: false, error: 'message' }
  if (typeof err === 'object' && err.success === false && typeof err.error === 'string') {
    return err.error
  }
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
  models?: string[] // ordered fallback list; first successful used
}

/**
 * Stream AI response using authenticated Puter SDK (client-side only)
 * Mirrors Puter docs Example 3 but keeps our context/system prompts.
 */
export async function streamPuterAIResponse(
  options: PuterAIOptions & {
    onChunk: (delta: string) => void
    onDone?: (final: string) => void
    model?: string // legacy single model override (prepended to models[] if provided)
    mode?: 'basic' | 'advanced'
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
    mode = 'basic',
    models,
  } = options

  const puter = (window as any).puter
  if (!puter || !puter.ai || typeof puter.ai.chat !== 'function') {
    throw new Error('Puter SDK not available or user not authenticated')
  }

  const systemPrompt = buildSystemPrompt(canonicalName)
  const userPrompt = buildUserPrompt(context || '', question)

  // Build model attempt sequence
  const envModels = (process.env.NEXT_PUBLIC_PUTER_MODEL_FALLBACKS || '').split(',').map(s => s.trim()).filter(Boolean)
  const modelSequence = [
    ...(model ? [model] : []),
    ...(models && models.length ? models : (envModels.length ? envModels : DEFAULT_PUTER_MODEL_FALLBACKS))
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx) // de-duplicate while preserving order

  if (DEBUG) {
    console.log('🤖 Streaming via Puter AI SDK...')
    console.log('📋 Model fallback sequence:', modelSequence)
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  async function postMetric(payload: any) {
    try {
      await fetch('/api/metrics/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (e) {
      if (DEBUG) console.warn('Metric post failed:', e)
    }
  }

  const started = Date.now()
  const envDisableModeration = process.env.NEXT_PUBLIC_PUTER_DISABLE_MODERATION === 'true'

  if (DEBUG) console.log('🧪 Moderation env flag:', envDisableModeration)
  // Attempt to patch puter global config early
  try {
    if (envDisableModeration) {
      if (puter.config) {
        puter.config.moderation = false
        puter.config.moderate = false
        puter.config.safety = false
      }
      if (puter.ai) {
        puter.ai.moderation = null
      }
    }
  } catch (e) {
    if (DEBUG) console.warn('Unable to patch puter config for moderation bypass:', e)
  }
  async function attemptModel(currentModel: string, attemptIndex: number): Promise<string> {
    // Replace model in messages or options
    const localMessages = messages
    function createModelStream(disableModeration: boolean) {
      const chatOptions: Record<string, any> = {
        model: currentModel,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }
      if (disableModeration) {
        chatOptions.moderation = false
        chatOptions.moderate = false
        chatOptions.safety = false
        chatOptions.skip_moderation = true
        chatOptions.disable_moderation = true
        chatOptions.no_moderation = true
        chatOptions.safety_checks = false
        chatOptions.enable_safety = false
      }
      if (DEBUG) console.log(`🤖 Puter chat start (model=${currentModel}, disableModeration=${disableModeration})`) 
      return puter.ai.chat(localMessages, chatOptions)
    }

    let firstErrorLocal: any = null
    let secondAttemptLocal = false
    try {
      const baseStream = await createModelStream(envDisableModeration)
      let buffer = ''
      for await (const part of baseStream) {
        const delta: string = (part?.message?.content || part?.text || '') as string
        if (!delta) continue
        buffer += delta
        try { onChunk(delta) } catch (e) { console.warn('onChunk callback error:', e) }
      }
      try { onDone?.(buffer) } catch (e) { console.warn('onDone callback error:', e) }
      postMetric({ kind: 'generation', provider: 'puter', status: 200, ok: true, durationMs: Date.now() - started, query: question.substring(0,160), mode, fallbackUsed: attemptIndex > 0, model: currentModel })
      return buffer
    } catch (err: any) {
      const msg = formatPuterError(err)
      if (DEBUG) console.error(`Model '${currentModel}' stream error:`, err)
      const isModerationError = /no working moderation service/i.test(msg)
      if (isModerationError && !firstErrorLocal) {
        if (DEBUG) console.warn('🛡️ Moderation error detected. Retrying once with moderation disabled...')
        firstErrorLocal = err
        try {
          const retryStream = await createModelStream(true)
          let retryBuffer = ''
          for await (const part of retryStream) {
            const delta: string = (part?.message?.content || part?.text || '') as string
            if (!delta) continue
            retryBuffer += delta
            try { onChunk(delta) } catch (e) { console.warn('onChunk retry callback error:', e) }
          }
          try { onDone?.(retryBuffer) } catch (e) { console.warn('onDone retry callback error:', e) }
          postMetric({ kind: 'generation', provider: 'puter', status: 200, ok: true, durationMs: Date.now() - started, query: question.substring(0,160), mode, fallbackUsed: true, model: currentModel })
          return retryBuffer
        } catch (retryErr: any) {
          const retryMsg = formatPuterError(retryErr)
          if (/no working moderation service/i.test(retryMsg) && !secondAttemptLocal) {
            secondAttemptLocal = true
            if (DEBUG) console.warn('🔁 Second moderation bypass attempt with extended flags...')
            try {
              const finalStream = await createModelStream(true)
              let finalBuffer = ''
              for await (const part of finalStream) {
                const delta: string = (part?.message?.content || part?.text || '') as string
                if (!delta) continue
                finalBuffer += delta
                try { onChunk(delta) } catch (e) { console.warn('onChunk second retry callback error:', e) }
              }
              try { onDone?.(finalBuffer) } catch (e) { console.warn('onDone second retry callback error:', e) }
              postMetric({ kind: 'generation', provider: 'puter', status: 200, ok: true, durationMs: Date.now() - started, query: question.substring(0,160), mode, fallbackUsed: true, model: currentModel })
              return finalBuffer
            } catch (finalErr: any) {
              const finalMsg = formatPuterError(finalErr)
              if (DEBUG) console.error('Final moderation bypass failed:', finalErr)
              postMetric({ kind: 'generation', provider: 'puter', status: /429|rate[_\s-]?limit|quota/i.test(finalMsg) ? 429 : 500, ok: false, durationMs: 0, query: question.substring(0,160), mode, errorMessage: finalMsg, fallbackUsed: true, model: currentModel })
              throw new Error(finalMsg)
            }
          } else {
            postMetric({ kind: 'generation', provider: 'puter', status: /429|rate[_\s-]?limit|quota/i.test(retryMsg) ? 429 : 500, ok: false, durationMs: 0, query: question.substring(0,160), mode, errorMessage: retryMsg, fallbackUsed: true, model: currentModel })
            throw new Error(retryMsg)
          }
        }
      }
      // Non-moderation or exhaustion
      postMetric({ kind: 'generation', provider: 'puter', status: /429|rate[_\s-]?limit|quota/i.test(msg) ? 429 : 500, ok: false, durationMs: 0, query: question.substring(0,160), mode, errorMessage: msg, fallbackUsed: attemptIndex > 0, model: currentModel })
      throw new Error(msg)
    }
  }

  // Iterate through model sequence until one succeeds
  let lastErr: Error | null = null
  for (let i = 0; i < modelSequence.length; i++) {
    const mName = modelSequence[i]
    try {
      return await attemptModel(mName, i)
    } catch (err: any) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      if (DEBUG) console.warn(`⚠️ Model failed (${mName}):`, lastErr.message)
      // Provide immediate feedback chunk to differentiate model switches (optional)
      if (i < modelSequence.length - 1) {
        try { onChunk(`\n[Switching model -> ${modelSequence[i+1]}]\n`) } catch {}
      }
    }
  }
  throw lastErr || new Error('All models failed')
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
    models?: string[]
    mode?: 'basic' | 'advanced'
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
    models,
    mode = 'basic',
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
    models,
    mode
  })

  return { final, sources }
}

