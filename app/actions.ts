"use server"

import { queryVectorDatabase, sanitizeText, isPIIRequest, isBehavioralQuery, limitWords } from "@/lib/rag-client"
import { generateResponse } from "@/lib/groq-client"
import { queryAdvancedRAG, AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"

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

/**
 * Main RAG query server action
 * Retrieves relevant documents and generates LLM response
 * Now supports both basic and advanced RAG modes
 */
export async function ragQuery(
  question: string, 
  mode: RAGMode = "basic",
  advancedConfig?: Partial<AdvancedRAGConfig>
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
      const advancedResult = await queryAdvancedRAG(question, advancedConfig, "Tylor")
      
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
      // Use basic RAG processing (existing logic)
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

      // Build context from retrieved documents
      const contextParts = results.slice(0, 6).map((r) => `[${r.title}] ${r.content}`)

      const rawContext = contextParts.join("\n\n")
      const context = sanitizeText(rawContext)

      // Generate response using Groq
      const answer = await generateResponse({
        question,
        context,
        canonicalName: "Tylor",
      })

      // Limit response length
      const limitedAnswer = limitWords(answer, 50, 200)

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
