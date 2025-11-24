"use server"

import { queryRAG as queryBasicRAG, queryVectorDatabase, sanitizeText, isPIIRequest, isBehavioralQuery, limitWords } from "@/lib/rag-client"
import { generateResponse } from "@/lib/groq-client"
import { queryAdvancedRAG, AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"
import { getCanonicalName } from "@/lib/canonical-name"
import { logAIGeneration, logFallback } from "@/lib/metrics-logger"

export type RAGMode = "basic" | "advanced"

interface RAGQueryResult {
  answer: string
  sources: Array<{
    id: string
    title: string
    content: string
    score: number
    category: string
  }>
  metadata?: {
    mode: RAGMode
    techniquesUsed?: string[]
    processingTime?: number
    transformedQueries?: string[]
  }
  error?: string
}

interface RAGContextResult {
  context: string
  sources: Array<{
    id: string
    title: string
    content: string
    score: number
    category: string
  }>
  canonicalName?: string
  error?: string
}

/**
 * Main RAG query server action
 * Retrieves relevant documents and generates LLM response
 * Now supports both basic and advanced RAG modes
 */
export async function ragQuery(
  question: string, 
  mode: RAGMode = "basic",
  advancedConfig?: Partial<AdvancedRAGConfig>,
  authToken?: string
): Promise<RAGQueryResult> {
  if (!question || !question.trim()) {
    return {
      answer: "",
      sources: [],
      error: "Please enter a question",
    }
  }

  // Check for PII requests
  if (isPIIRequest(question)) {
    return {
      answer:
        "I can discuss my professional experience and skills, but I don't share personal contact or identification details.",
      sources: [],
    }
  }

  try {
    if (mode === "advanced") {
      // Use advanced RAG processing with fallback to basic
      const started = Date.now()
      let advancedResult
      let usedBasicFallback = false
      
      try {
        advancedResult = await queryAdvancedRAG(question, advancedConfig, getCanonicalName())
        
        if (advancedResult.error) {
          throw new Error(advancedResult.error)
        }
      } catch (advancedError) {
        // Advanced RAG failed, fallback to basic RAG
        console.warn('⚠️ Advanced RAG failed, falling back to basic RAG:', advancedError)
        const errorMessage = advancedError instanceof Error ? advancedError.message : String(advancedError)
        const isRateLimit = /429|rate[_\s-]?limit|quota/i.test(errorMessage)
        
        // Log fallback event
        logFallback({
          from: 'advanced_rag',
          to: 'basic_rag',
          reason: isRateLimit ? 'rate_limit' : 'error',
          query: question.substring(0, 512),
          originalStatus: isRateLimit ? 429 : 500,
          message: errorMessage.substring(0, 256)
        }).catch(()=>{})
        
        // Execute basic RAG as fallback
        usedBasicFallback = true
        const basicAnswer = await queryBasicRAG(question, authToken)
        const basicSources = await queryVectorDatabase(question, 8)
        
        logAIGeneration({
          status: 200,
          ok: true,
          durationMs: Date.now() - started,
          provider: 'pipeline',
          query: question.substring(0,160),
          mode: 'basic',
          fallbackUsed: true
        }).catch(()=>{})
        
        return {
          answer: limitWords(sanitizeText(basicAnswer), 50, 250),
          sources: basicSources.map((r) => ({
            id: r.id,
            title: r.title,
            content: sanitizeText(r.content),
            score: r.score,
            category: r.category,
          })),
          metadata: {
            mode: "basic",
            techniquesUsed: ['Basic RAG (Advanced fallback)'],
            processingTime: Date.now() - started
          }
        }
      }
      
      if (!advancedResult) {
        throw new Error('Advanced RAG returned no result')
      }

      // Limit response length and sanitize
      const limitedAnswer = limitWords(sanitizeText(advancedResult.answer), 50, 250)
      logAIGeneration({
        status: advancedResult.error ? 500 : 200,
        ok: !advancedResult.error,
        durationMs: Date.now() - started,
        provider: 'pipeline',
        query: question.substring(0,160),
        mode: 'advanced',
        errorMessage: advancedResult.error || undefined,
        fallbackUsed: false
      }).catch(()=>{})
      
      return {
        answer: limitedAnswer,
        sources: advancedResult.sources.map((r) => ({
          id: r.id,
          title: r.title,
          content: sanitizeText(r.content),
          score: r.score,
          category: r.category,
        })),
        metadata: {
          mode: "advanced",
          techniquesUsed: advancedResult.techniquesUsed,
          processingTime: advancedResult.metadata.processingTime,
          transformedQueries: advancedResult.metadata.transformedQueries
        }
      }
    } else {
      // Use basic RAG processing with Puter AI integration
      console.log('🚀 Using Basic RAG with Puter AI...')
      const started = Date.now()
      
      // Call the Puter-integrated queryRAG function with auth token
      const answer = await queryBasicRAG(question, authToken)
      
      // Also get sources for UI display
      let results = await queryVectorDatabase(question, 15) // Increased from 8 for richer context

      // Prioritize STAR/behavioral results if question is behavioral
      if (isBehavioralQuery(question)) {
        const starResults = results.filter((r) => r.tags?.includes("star"))
        if (starResults.length > 0) {
          results = [...starResults, ...results.filter((r) => !r.tags?.includes("star"))].slice(0, 8)
        }
      }

      if (results.length === 0) {
        return {
          answer: "I don't have specific information about that topic.",
          sources: [],
          metadata: { mode: "basic" }
        }
      }

      // Limit response length
      const limitedAnswer = limitWords(sanitizeText(answer), 50, 200)
      logAIGeneration({
        status: 200,
        ok: true,
        durationMs: Date.now() - started,
        provider: 'pipeline',
        query: question.substring(0,160),
        mode: 'basic',
        fallbackUsed: false
      }).catch(()=>{})

      return {
        answer: limitedAnswer,
        sources: results.map((r) => ({
          id: r.id,
          title: r.title,
          content: r.content,
          score: r.score,
          category: r.category,
        })),
        metadata: { mode: "basic" }
      }
    }
  } catch (error) {
    console.error("RAG query error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Log the error
    logAIGeneration({
      status: 500,
      ok: false,
      durationMs: 0,
      provider: 'pipeline',
      query: question.substring(0,160),
      mode,
      errorMessage,
      fallbackUsed: false
    }).catch(()=>{})
    
    // If advanced mode failed, log fallback event (even though we're returning error)
    if (mode === 'advanced') {
      logFallback({
        from: 'advanced',
        to: 'error',
        reason: 'error',
        query: question.substring(0, 512),
        originalStatus: 500,
        message: errorMessage.substring(0, 256)
      }).catch(()=>{})
    }
    
    return {
      answer: "",
      sources: [],
      metadata: { mode },
      error: error instanceof Error ? error.message : "An error occurred processing your question",
    }
  }
}

/**
 * Get RAG context without generating AI response
 * Returns vector search results that can be used for client-side AI generation
 */
export async function ragQueryWithContext(
  question: string,
  mode: RAGMode = "basic",
  advancedConfig?: Partial<AdvancedRAGConfig>
): Promise<RAGContextResult> {
  if (!question || !question.trim()) {
    return {
      context: "",
      sources: [],
      error: "Please enter a question",
    }
  }

  // Check for PII requests
  if (isPIIRequest(question)) {
    return {
      context: "I can discuss my professional experience and skills, but I don't share personal contact or identification details.",
      sources: [],
    }
  }

  try {
    console.log('🔍 Searching vector database for context...')
    
    // Get results from vector database
    let results = await queryVectorDatabase(question, 8)

    // Prioritize STAR/behavioral results if question is behavioral
    if (isBehavioralQuery(question)) {
      const starResults = results.filter((r) => r.tags?.includes("star"))
      if (starResults.length > 0) {
        results = [...starResults, ...results.filter((r) => !r.tags?.includes("star"))].slice(0, 8)
      }
    }

    if (results.length === 0) {
      return {
        context: "",
        sources: [],
        error: "No relevant information found in the database"
      }
    }

    // Build context from search results (top 3 most relevant)
    const topDocs = results
      .slice(0, 3)
      .map(result => `${result.title}: ${result.content}`)
      .join("\n\n")

    console.log(`✅ Found ${results.length} results, using top 3 for context`)

    return {
      context: topDocs,
      sources: results.map((r) => ({
        id: r.id,
        title: r.title,
        content: sanitizeText(r.content),
        score: r.score,
        category: r.category,
      })),
      canonicalName: getCanonicalName(),
    }
  } catch (error) {
    console.error("Context retrieval error:", error)
    return {
      context: "",
      sources: [],
      error: error instanceof Error ? error.message : "An error occurred retrieving context",
    }
  }
}
