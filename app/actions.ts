"use server"

import { queryRAG as queryBasicRAG, queryVectorDatabase, sanitizeText, isPIIRequest, isBehavioralQuery, limitWords } from "@/lib/rag-client"
import { generateResponse } from "@/lib/groq-client"
import { queryAdvancedRAG, AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"
import { getCanonicalName } from "@/lib/canonical-name"

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
      // Use advanced RAG processing
      const advancedResult = await queryAdvancedRAG(question, advancedConfig, getCanonicalName())
      
      if (advancedResult.error) {
        return {
          answer: "",
          sources: [],
          metadata: {
            mode: "advanced",
            techniquesUsed: advancedResult.techniquesUsed,
            processingTime: advancedResult.metadata.processingTime
          },
          error: advancedResult.error
        }
      }

      // Limit response length and sanitize
      const limitedAnswer = limitWords(sanitizeText(advancedResult.answer), 50, 250)
      
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
      
      // Call the Puter-integrated queryRAG function with auth token
      const answer = await queryBasicRAG(question, authToken)
      
      // Also get sources for UI display
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
          answer: "I don't have specific information about that topic.",
          sources: [],
          metadata: { mode: "basic" }
        }
      }

      // Limit response length
      const limitedAnswer = limitWords(sanitizeText(answer), 50, 200)

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
