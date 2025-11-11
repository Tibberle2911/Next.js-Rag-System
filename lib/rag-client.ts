/**
 * Digital Twin RAG Application
 * Based on Binal's production implementation
 * - Upstash Vector: Dense vector storage with client-side embeddings
 * - Groq: Ultra-fast LLM inference
 */
import { generateResponse } from "./groq-client"

/**
 * Generate dense vector embeddings from text
 * Creates consistent 1024-dimensional vectors using deterministic hashing
 * Required for Upstash Vector indexes that need dense vectors
 */
export function generateEmbedding(text: string): number[] {
  const dimension = 1024 // Standard dimension for most embedding models
  const vector: number[] = []
  
  // Create a deterministic hash from the text
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Generate consistent vector using multiple hash seeds
  for (let i = 0; i < dimension; i++) {
    const seed1 = hash + i
    const seed2 = hash * (i + 1)
    const seed3 = hash ^ (i * 37)
    
    // Combine multiple deterministic random sources for better distribution
    const val1 = Math.sin(seed1) * 10000
    const val2 = Math.cos(seed2) * 10000
    const val3 = Math.sin(seed3 * 0.7) * 10000
    
    const combined = (val1 + val2 + val3) / 3
    vector.push((combined - Math.floor(combined)) * 2 - 1) // Normalize to [-1, 1]
  }
  
  // Normalize the vector to unit length (common for embedding models)
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  }
  
  return vector
}

export interface VectorSearchResult {
  id: string
  title: string
  content: string
  score: number
  category: string
  tags: string[]
}

export interface RAGResponse {
  answer: string
  sources: VectorSearchResult[]
  error?: string
  loading?: boolean
}

/**
 * Perform RAG query using Upstash Vector + Groq
 * Matches the Python working implementation exactly
 */
export async function queryRAG(question: string): Promise<string> {
  try {
    console.log("🧠 Searching your professional profile...")
    const vectorResults = await queryVectorDatabase(question, 3)
    
    if (vectorResults.length === 0) {
      console.log("📚 No relevant information found")
      return "I don't have specific information about that topic."
    }

    console.log(`📊 Found ${vectorResults.length} relevant sources`)
    
    // Log what we found (like the Python version)
    const topDocs: string[] = []
    vectorResults.forEach(result => {
      console.log(`🔹 Found: ${result.title} (Relevance: ${result.score.toFixed(3)})`)
      if (result.content) {
        topDocs.push(`${result.title}: ${result.content}`)
      }
    })
    
    if (topDocs.length === 0) {
      return "I found some information but couldn't extract details."
    }

    console.log("⚡ Generating personalized response...")
    
    // Build context from search results (matching Python pattern)
    const context = topDocs.join("\n\n")
    
    // Generate response using Groq with retrieved context (matching Python pattern)
    const response = await generateResponse({
      question: question,
      context: context
    })
    return response
    
  } catch (error) {
    console.error("RAG query error:", error)
    return `❌ Error during query: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * Query Upstash Vector Database using built-in text search
 * Matches Python working pattern exactly
 */
export async function queryVectorDatabase(question: string, topK = 3): Promise<VectorSearchResult[]> {
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN
  const url = process.env.UPSTASH_VECTOR_REST_URL

  if (!token || !url) {
    console.error('Missing Upstash Vector environment variables:', {
      hasToken: !!token,
      hasUrl: !!url,
      nodeEnv: process.env.NODE_ENV
    })
    throw new Error("Upstash Vector database configuration is missing. Please check environment variables.")
  }

  try {
    // Generate dense vector embedding from the question text
    const queryVector = generateEmbedding(question)
    console.log(`Generated ${queryVector.length}D vector for query: "${question}"`)
    
    // Query using dense vector (required by this index)
    const response = await fetch(`${url}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      console.error('Upstash Vector API error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: errText
      })
      throw new Error(`Vector DB error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ""}`)
    }

    const data = await response.json()
    const results: VectorSearchResult[] = (data.result || []).map((r: any) => ({
      id: r.id || "",
      title: r.metadata?.title || "Information", 
      content: r.metadata?.content || "",
      score: r.score || 0,
      category: r.metadata?.category || "",
      tags: r.metadata?.tags || [],
    }))
    
    console.log(`Found ${results.length} vector matches`)

    return results
  } catch (error) {
    console.error("Vector search error:", error)
    throw error
  }
}

/**
 * Sanitize text by masking email and phone patterns
 */
export function sanitizeText(text: string): string {
  if (!text) return text

  // Mask emails
  let masked = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted email]")

  // Mask phone-like patterns (international + optional country/area code)
  // Previous regex contained invalid tokens ($$?) causing runtime errors.
  masked = masked.replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g, "[redacted phone]")

  return masked
}

/**
 * Limit text to word count range and ensure sentence boundary
 */
export function limitWords(text: string, minWords = 50, maxWords = 200): string {
  if (!text) return text

  const words = text.split(/\s+/)
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(" ")
  }

  // Ensure text ends at sentence boundary
  const lastSentenceMatch = text.match(/[.!?](?:['""])?\s*$/)
  if (!lastSentenceMatch) {
    const matches = text.match(/[.!?](?:['""])?/g)
    if (matches && matches.length > 0) {
      const lastIdx = text.lastIndexOf(matches[matches.length - 1])
      text = text.substring(0, lastIdx + 1)
    }
  }

  return text.trim()
}

/**
 * Check if question is asking for PII
 */
export function isPIIRequest(question: string): boolean {
  if (!question) return false

  const q = question.toLowerCase()
  const piiTerms = [
    "email",
    "phone",
    "telephone",
    "mobile",
    "address",
    "home address",
    "dob",
    "date of birth",
    "id number",
    "passport",
    "driver",
    "license",
    "ssn",
    "social security",
    "bank",
    "account number",
  ]

  return piiTerms.some((term) => q.includes(term))
}

/**
 * Check if question is behavioral/STAR style
 */
export function isBehavioralQuery(question: string): boolean {
  if (!question) return false

  const q = question.toLowerCase()
  const triggers = [
    "tell me about a time",
    "situation where",
    "how did you handle",
    "what did you do",
    "example",
    "challenge",
    "overcom",
    "handle",
    "solv",
    "result",
    "impact",
    "ownership",
    "production issue",
    "incident",
    "outage",
    "trade-off",
    "deadline",
    "conflict",
    "star",
    "situation",
    "task",
    "action",
  ]

  return triggers.some((t) => q.includes(t))
}
