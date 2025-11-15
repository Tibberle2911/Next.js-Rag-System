'use client'

/**
 * Advanced Puter RAG Client
 *
 * Implements the advanced RAG architecture (multi-query, RRF fusion,
 * decomposition, step-back, HyDE, interview formatting, claim verification)
 * but uses Puter SDK for all LLM text operations instead of Gemini/Groq.
 *
 * Retrieval stays server-side via `/api/vector-context` to satisfy Upstash
 * dense-index + secure tokens. No API keys required on the client.
 *
 * NOTE: This file is client-only and requires an authenticated Puter session.
 */

import { streamPuterAIResponse, type VectorSource } from './puter-ai-client'

// ---------- Types ----------

export interface AdvancedPuterRAGConfig {
  useMultiQuery: boolean
  useRagFusion: boolean
  useDecomposition: boolean
  useStepBack: boolean
  useHyde: boolean
  useQueryEnhancement: boolean
  useInterviewFormatting: boolean

  // Multi-query settings
  numMultiQueries: number

  // RAG-Fusion settings
  rrrKValue: number
  fusionQueries: number

  // Decomposition settings
  maxSubQuestions: number

  // HyDE settings
  hydeTemperature: number

  // Interview context
  interviewType?: 'technical' | 'behavioral' | 'executive' | 'general'

  // Precision/faithfulness
  minRelevanceScore: number
  maxContextChunks: number
  useRelevanceFiltering: boolean
  useClaimVerification: boolean
  diversityThreshold: number
}

export const DEFAULT_ADVANCED_PUTER_CONFIG: AdvancedPuterRAGConfig = {
  useMultiQuery: true,
  useRagFusion: true,
  useDecomposition: false,
  useStepBack: false,
  useHyde: false,
  useQueryEnhancement: true,
  useInterviewFormatting: true,
  numMultiQueries: 5,
  rrrKValue: 60,
  fusionQueries: 4,
  maxSubQuestions: 3,
  hydeTemperature: 0.2,
  interviewType: 'general',
  minRelevanceScore: 0.55,
  maxContextChunks: 6,
  useRelevanceFiltering: true,
  useClaimVerification: true,
  diversityThreshold: 0.8,
}

export interface AdvancedPuterRAGResult {
  answer: string
  sources: VectorSource[]
  techniquesUsed: string[]
  metadata: {
    originalQuery: string
    enhancedQuery?: string
    transformedQueries: string[]
    retrievalScores: number[]
    processingTime: number
    interviewFormatted?: boolean
    contextPrecision?: number
    faithfulnessScore?: number
    numContextsUsed?: number
  }
  error?: string
}

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true'

// ---------- Helper: Puter text completion (non-stream) ----------

async function puterComplete(
  prompt: string,
  temperature = 0.7,
  maxTokens = 5000,
  model = (process.env.NEXT_PUBLIC_PUTER_MODEL_TEXT || 'google/gemini-2.5-pro').toString().trim()
): Promise<string> {
  const puter = (window as any).puter
  if (!puter?.ai || typeof puter.ai.chat !== 'function') {
    throw new Error('Puter SDK not available or user not authenticated')
  }

  const messages = [
    { role: 'system', content: 'You are a helpful assistant. Return only what is asked.' },
    { role: 'user', content: prompt },
  ]

  try {
    const result = await puter.ai.chat(messages, {
      model,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })

    // Puter returns a single message object or a shape with .message.content
    const content: string = (result?.message?.content ?? result?.text ?? '').toString()
    if (DEBUG) console.log('📝 puterComplete len=', content.length)
    return content.trim()
  } catch (err: any) {
    const msg = err?.message || err?.toString?.() || 'Unknown Puter text error'
    if (DEBUG) console.error('Puter text error:', err)
    throw new Error(msg)
  }
}

// ---------- Helper: fetch vector sources from server ----------

async function fetchVectorSources(query: string, topK = 8): Promise<VectorSource[]> {
  const resp = await fetch('/api/vector-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: query, topK }),
  })
  if (!resp.ok) return []
  const data = await resp.json().catch(() => ({}))
  return (data?.sources ?? []) as VectorSource[]
}

// ---------- Core client ----------

export class AdvancedPuterRAGClient {
  private config: AdvancedPuterRAGConfig

  constructor(config: Partial<AdvancedPuterRAGConfig> = {}) {
    this.config = { ...DEFAULT_ADVANCED_PUTER_CONFIG, ...config }
  }

  updateConfig(newConfig: Partial<AdvancedPuterRAGConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): AdvancedPuterRAGConfig {
    return { ...this.config }
  }

  // ----- Query transformation steps (Puter-powered) -----

  private async enhanceQuery(original: string): Promise<string> {
    if (!this.config.useQueryEnhancement) return original
    const prompt = `Improve this search query for professional-profile RAG. Add synonyms/related terms, keep concise.\n\nOriginal: "${original}"\n\nReturn only the enhanced query:`
    try {
      const enhanced = await puterComplete(prompt, 0.3, 5000)
      return enhanced || original
    } catch {
      return original
    }
  }

  private async stepBackPrompting(query: string): Promise<string> {
    if (!this.config.useStepBack) return query
    const prompt = `Rewrite this question into a broader version to retrieve more comprehensive background context.\n\nQuestion: "${query}"\n\nReturn only the broader question:`
    try {
      const broader = await puterComplete(prompt, 0.3, 200)
      return broader || query
    } catch {
      return query
    }
  }

  private async decomposeQuery(query: string): Promise<string[]> {
    if (!this.config.useDecomposition) return [query]
    const prompt = `Break down this question into up to ${this.config.maxSubQuestions} specific sub-questions.\n\nQuestion: "${query}"\n\nReturn only the sub-questions, one per line:`
    try {
      const out = await puterComplete(prompt, 0.3, 300)
      const lines = out.split('\n').map(s => s.trim()).filter(Boolean)
      return lines.length ? lines.slice(0, this.config.maxSubQuestions) : [query]
    } catch {
      return [query]
    }
  }

  private async generateMultiQueries(query: string): Promise<string[]> {
    if (!this.config.useMultiQuery) return [query]
    const prompt = `Generate ${this.config.numMultiQueries} alternative phrasings of this question to capture different perspectives.\n\nQuestion: "${query}"\n\nReturn only the alternatives, one per line:`
    try {
      const out = await puterComplete(prompt, 0.6, 600)
      const lines = out.split('\n').map(s => s.trim()).filter(Boolean)
      return lines.length ? lines.slice(0, this.config.numMultiQueries) : [query]
    } catch {
      return [query]
    }
  }

  private async hydeText(query: string): Promise<string | null> {
    if (!this.config.useHyde) return null
    const prompt = `Write a detailed factual paragraph that would perfectly answer this interview-style question from a professional's own perspective.\n\nQuestion: "${query}"\n\nReturn only the paragraph:`
    try {
      const text = await puterComplete(prompt, this.config.hydeTemperature, 300)
      return text.trim() || null
    } catch {
      return null
    }
  }

  // ----- Retrieval utilities -----

  private async filterByRelevance(results: VectorSource[], query: string): Promise<VectorSource[]> {
    if (!this.config.useRelevanceFiltering || results.length === 0) return results

    let filtered = results.filter(r => (r.score ?? 0) >= this.config.minRelevanceScore)
    if (filtered.length === 0) filtered = results.slice(0, Math.min(3, results.length))

    filtered = await this.removeDuplicates(filtered)
    filtered = await this.reRankByQueryRelevance(filtered, query)
    return filtered.slice(0, this.config.maxContextChunks)
  }

  private async removeDuplicates(results: VectorSource[]): Promise<VectorSource[]> {
    if (results.length <= 1) return results
    const diverse: VectorSource[] = [results[0]]
    for (let i = 1; i < results.length; i++) {
      const c = results[i]
      let dup = false
      for (const s of diverse) {
        const sim = this.calculateTextSimilarity(c.content, s.content)
        if (sim >= this.config.diversityThreshold) { dup = true; break }
      }
      if (!dup) diverse.push(c)
    }
    return diverse
  }

  private async reRankByQueryRelevance(results: VectorSource[], query: string): Promise<VectorSource[]> {
    const scored = await Promise.all(results.map(async (r) => {
      const score = await this.scoreRelevance(r, query)
      return { ...r, score }
    }))
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  private async scoreRelevance(result: VectorSource, query: string): Promise<number> {
    const snippet = result.content.slice(0, 300)
    const prompt = `Rate the relevance (0.0 to 1.0) of the content to the question.\n\nQuestion: "${query}"\n\nContent: "${snippet}..."\n\nReturn only a decimal between 0.0 and 1.0:`
    try {
      const text = await puterComplete(prompt, 0.1, 40)
      const val = parseFloat(text)
      return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0.5
    } catch {
      return 0.5
    }
  }

  private calculateTextSimilarity(a: string, b: string): number {
    const s1 = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const s2 = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const inter = new Set([...s1].filter(x => s2.has(x)))
    const uni = new Set([...s1, ...s2])
    return uni.size ? inter.size / uni.size : 0
  }

  private applyReciprocalRankFusion(groups: VectorSource[][]): VectorSource[] {
    const k = this.config.rrrKValue
    const map = new Map<string, { r: VectorSource; score: number }>()
    for (const results of groups) {
      for (let rank = 0; rank < results.length; rank++) {
        const r = results[rank]
        const id = `${r.id}-${r.title}`
        const add = 1 / (k + rank + 1)
        const cur = map.get(id)
        if (cur) cur.score += add
        else map.set(id, { r, score: add })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.score - a.score).map(x => x.r)
  }

  // ----- Formatting & verification -----

  private getInterviewContext(): string {
    const ctx: Record<string, string> = {
      technical: 'Focus on technical skills, problem-solving, architecture, and measurable impact.',
      behavioral: 'Focus on leadership, teamwork, communication, conflict resolution, adaptability.',
      executive: 'Focus on strategy, business impact, stakeholder management, organizational leadership.',
      general: 'Focus on relevant experience, key achievements, skills, and growth.'
    }
    return ctx[this.config.interviewType || 'general']
  }

  private getInterviewGuidance(): string {
    const g: Record<string, string> = {
      technical: 'Style: detailed technical examples with metrics; demonstrate problem-solving.',
      behavioral: 'Style: cohesive story with emotional intelligence and self-awareness.',
      executive: 'Style: high-level strategic with business metrics and vision.',
      general: 'Style: balance technical depth and accessibility with specific achievements.'
    }
    return g[this.config.interviewType || 'general']
  }

  private async formatForInterview(context: VectorSource[], originalQ: string): Promise<string> {
    const ctx = context.map(r => `[${r.title}] ${r.content}`).join('\n\n')
    const guidance = this.getInterviewGuidance()
    const prompt = `Create a compelling interview response using this professional data.\n\nQuestion: "${originalQ}"\n\nProfessional Data:\n${ctx}\n\n${guidance}\n\nRules:\n- Use first-person singular only (I, my, me)\n- No explicit STAR markers\n- Natural transitions; concise (100-200 words)\n- Replace placeholders with the actual name if present\n\nInterview Response:`
    try {
      const out = await puterComplete(prompt, 0.7, 600)
      return this.removeStarMarkers(out.trim())
    } catch {
      return ctx
    }
  }

  private async verifyClaims(answer: string, context: VectorSource[]): Promise<{ verifiedAnswer: string; faithfulnessScore: number }>{
    if (!this.config.useClaimVerification) return { verifiedAnswer: answer, faithfulnessScore: 1.0 }
    const ctx = context.map(r => r.content).join('\n\n')
    const prompt = `Verify the response against the source material. Remove or rewrite unsupported claims. Return ONLY the final response.\n\nSOURCE MATERIAL:\n${ctx}\n\nRESPONSE:\n"${answer}"\n\nReturn only the verified response:`
    try {
      const verified = (await puterComplete(prompt, 0.2, 700)).trim()
      const cleaned = this.stripMarkdown(this.removeStarMarkers(verified))
      const sim = this.calculateTextSimilarity(answer, cleaned)
      const score = Math.max(0, Math.min(1, sim))
      return { verifiedAnswer: cleaned, faithfulnessScore: score }
    } catch {
      return { verifiedAnswer: answer, faithfulnessScore: 0.8 }
    }
  }

  private removeStarMarkers(text: string): string {
    let t = text
    const patterns = [
      /The result\?[\s:]/gi,
      /The situation was[:\s]/gi,
      /My task was[:\s]/gi,
      /The task was[:\s]/gi,
      /The outcome was[:\s]/gi,
      /As a result[,\s:]/gi,
    ]
    for (const p of patterns) t = t.replace(p, '')
    return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim()
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .trim()
  }

  private buildEnhancedContext(results: VectorSource[], techniques: string[]): string {
    const parts = results.slice(0, 6).map((r, i) => `[#${i + 1}] ${r.title}: ${r.content}`)
    const ctx = parts.join('\n\n')
    if (techniques.length) return `${ctx}\n\nTechniques: ${techniques.join(', ')}`
    return ctx
  }

  // ----- Orchestrator -----

  async processAdvancedQuery(question: string, canonicalName?: string): Promise<AdvancedPuterRAGResult> {
    const start = Date.now()
    const techniques: string[] = []
    const transformed: string[] = [question]
    let enhanced: string | undefined

    try {
      let q = await this.enhanceQuery(question)
      if (q !== question) { enhanced = q; techniques.push('Query Enhancement'); transformed.push(q) }

      q = await this.stepBackPrompting(q)
      if (q !== (enhanced || question)) { techniques.push('Step-Back'); transformed.push(q) }

      if (this.config.useDecomposition && this.isComplex(q)) {
        const subs = await this.decomposeQuery(q)
        techniques.push('Decomposition')
        const subResults = await Promise.all(subs.map(s => fetchVectorSources(s, 8)))
        let combined = subResults.flat()
        if (combined.length === 0) combined = await fetchVectorSources(q, 8)
        const filtered = await this.filterByRelevance(combined, question)

        const formatted = this.config.useInterviewFormatting
          ? await this.formatForInterview(filtered, question)
          : this.buildEnhancedContext(filtered, techniques)

        const verification = await this.verifyClaims(formatted, filtered)

        return {
          answer: verification.verifiedAnswer,
          sources: filtered,
          techniquesUsed: techniques,
          metadata: {
            originalQuery: question,
            enhancedQuery: enhanced,
            transformedQueries: transformed,
            retrievalScores: filtered.map(r => r.score ?? 0),
            processingTime: Date.now() - start,
            interviewFormatted: this.config.useInterviewFormatting,
            contextPrecision: filtered.length ? filtered.reduce((s, r) => s + (r.score ?? 0), 0) / filtered.length : 0,
            faithfulnessScore: verification.faithfulnessScore,
            numContextsUsed: filtered.length,
          },
        }
      }

      // Multi-query + RRF
      const queries = await this.generateMultiQueries(q)
      if (queries.length > 1) techniques.push('Multi-Query')

      const groups: VectorSource[][] = await Promise.all(
        queries.slice(0, this.config.fusionQueries).map(qi => fetchVectorSources(qi, 8))
      )

      let fused: VectorSource[] = []
      if (this.config.useRagFusion) {
        fused = this.applyReciprocalRankFusion(groups)
        techniques.push('RRF Fusion')
      } else {
        fused = groups.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      }

      // Optional HyDE augmentation (retrieve with hypothetical doc too)
      const hyde = await this.hydeText(q)
      if (hyde) {
        techniques.push('HyDE')
        const hydeResults = await fetchVectorSources(hyde, 8)
        fused = this.applyReciprocalRankFusion([fused, hydeResults])
      }

      const filtered = await this.filterByRelevance(fused, question)
      const formatted = this.config.useInterviewFormatting
        ? await this.formatForInterview(filtered, question)
        : this.buildEnhancedContext(filtered, techniques)

      const verification = await this.verifyClaims(formatted, filtered)

      return {
        answer: verification.verifiedAnswer,
        sources: filtered,
        techniquesUsed: techniques,
        metadata: {
          originalQuery: question,
          enhancedQuery: enhanced,
          transformedQueries: transformed,
          retrievalScores: filtered.map(r => r.score ?? 0),
          processingTime: Date.now() - start,
          interviewFormatted: this.config.useInterviewFormatting,
          contextPrecision: filtered.length ? filtered.reduce((s, r) => s + (r.score ?? 0), 0) / filtered.length : 0,
          faithfulnessScore: verification.faithfulnessScore,
          numContextsUsed: filtered.length,
        },
      }
    } catch (error: any) {
      if (DEBUG) console.error('Advanced Puter RAG error:', error)
      return {
        answer: '',
        sources: [],
        techniquesUsed: techniques,
        metadata: {
          originalQuery: question,
          enhancedQuery: enhanced,
          transformedQueries: transformed,
          retrievalScores: [],
          processingTime: Date.now() - Date.now(),
          interviewFormatted: false,
        },
        error: error?.message || 'Advanced Puter RAG failed',
      }
    }
  }

  private isComplex(query: string): boolean {
    const indicators = [' and ', ' also ', ' what about ', ' how do ', ' explain ', ' compare ', ' difference ', ' both ', ' either ']
    const ql = query.toLowerCase()
    return indicators.some(i => ql.includes(i)) || query.length > 100 || (query.match(/[.!?]/g) || []).length > 1
  }
}

export const advancedPuterRAGClient = new AdvancedPuterRAGClient()

// ---------- Convenience helpers ----------

export async function queryAdvancedPuterRAG(
  question: string,
  config?: Partial<AdvancedPuterRAGConfig>,
  canonicalName?: string
): Promise<AdvancedPuterRAGResult> {
  if (config) advancedPuterRAGClient.updateConfig(config)
  return await advancedPuterRAGClient.processAdvancedQuery(question, canonicalName)
}

export async function streamAdvancedPuterRAG(options: {
  question: string
  config?: Partial<AdvancedPuterRAGConfig>
  canonicalName?: string
  temperature?: number
  maxTokens?: number
  topK?: number
  onContext?: (sources: VectorSource[]) => void
  onChunk: (delta: string) => void
  onDone?: (final: string) => void
  model?: string
}): Promise<{ final: string; sources: VectorSource[] }> {
  const {
    question,
    config,
    canonicalName,
    temperature = 0.7,
    maxTokens = 1500,
    topK = 8,
    onContext,
    onChunk,
    onDone,
    model,
  } = options

  if (config) advancedPuterRAGClient.updateConfig(config)

  // Do advanced retrieval/fusion first (non-stream) to build strong context
  const result = await advancedPuterRAGClient.processAdvancedQuery(question, canonicalName)
  const sources = result.sources
  try { onContext?.(sources) } catch {}

  // Build concise top docs context for streaming generation
  const topDocs = sources.slice(0, 3).map(r => `${r.title}: ${r.content}`).join('\n\n')

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
