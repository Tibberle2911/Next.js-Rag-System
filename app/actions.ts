"use server"

import { queryVectorDatabase, sanitizeText, isPIIRequest, isBehavioralQuery, limitWords } from "@/lib/rag-client"
import { generateResponse } from "@/lib/groq-client"

interface RAGQueryResult {
  answer: string
  sources: Array<{
    id: string
    title: string
    content: string
    score: number
    category: string
  }>
  error?: string
}

/**
 * Main RAG query server action
 * Retrieves relevant documents and generates LLM response
 */
export async function ragQuery(question: string): Promise<RAGQueryResult> {
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
    // Query vector database
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
    }
  } catch (error) {
    console.error("RAG query error:", error)
    return {
      answer: "",
      sources: [],
      error: error instanceof Error ? error.message : "An error occurred processing your question",
    }
  }
}
