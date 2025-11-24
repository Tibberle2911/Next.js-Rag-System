/**
 * Digital Twin RAG Application
 * Based on Binal's production implementation
 * - Upstash Vector: Dense vector storage with client-side embeddings
 * - Puter AI: Free AI services (primary, with fallback to Gemini/Groq)
 * - Embeddings: HuggingFace BAAI/bge-large-en-v1.5 (1024D)
 */
import { generateResponse } from "./groq-client"
import { logVectorQuery, logAIGeneration } from './metrics-logger'
import { GoogleGenAI } from "@google/genai"
// Puter client-side generation removed from server RAG layer to avoid window usage

// Feature flag to use Puter AI (enabled by default for basic RAG)
const USE_PUTER_AI = process.env.USE_PUTER_AI !== 'false' // Default: true

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

/**
 * Generate dense vector embeddings from text
 * Primary: Gemini text-embedding-004 (fast and reliable)
 * Note: Puter/HuggingFace embeddings disabled due to sharp module issues
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Skip Puter/HuggingFace embeddings - sharp module causes issues in Next.js
  // USE_PUTER_AI flag disabled for embeddings only
  
  // Use Gemini embeddings (reliable and fast)
  const client = getGeminiClient()
  const embeddingModelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004"
  const result = await client.models.embedContent({
    model: embeddingModelName,
    contents: text,
  })
  
  if (!result.embeddings || !result.embeddings[0]?.values) {
    throw new Error("Failed to generate embedding: Invalid response from Gemini API")
  }
  
  let embedding = result.embeddings[0].values
  
  // Upstash Vector DB expects 1024D vectors, but text-embedding-004 produces 768D
  // Pad with zeros if necessary
  const expectedDimension = 1024
  if (embedding.length < expectedDimension) {
    const padding = new Array(expectedDimension - embedding.length).fill(0)
    embedding = [...embedding, ...padding]
    console.log(`Padded embedding from ${result.embeddings[0].values.length}D to ${expectedDimension}D`)
  }
  
  return embedding
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
 * Perform RAG query using Upstash Vector + Puter AI (with fallback)
 * Matches the Python working implementation exactly
 */
export async function queryRAG(question: string, authToken?: string): Promise<string> {
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
    
    // Client-side Puter AI streaming removed here: server layer should not call window-based SDK.
    // If Puter AI is desired, perform only context retrieval server-side and handle generation in client.
    if (USE_PUTER_AI && authToken) {
      console.log("ℹ️ Puter AI generation is skipped in server RAG; handled client-side.")
    }
    
    // Fallback: Generate response using Groq/Gemini with retrieved context
    console.log("🔄 Using provider (Gemini/Groq) for server-side generation...")
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
 * Includes retry logic for connection resets
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

  // Retry logic for ECONNRESET errors
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate dense vector embedding from the question text
      const queryVector = await generateEmbedding(question);
      console.log(`Generated ${queryVector.length}D vector for query: "${question}"`)
      
      // Query using dense vector (required by this index) with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const started = Date.now()
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
          signal: controller.signal,
        })

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => "")
          console.error('Upstash Vector API error:', {
            status: response.status,
            statusText: response.statusText,
            url: url,
            error: errText
          })
          await logVectorQuery({
            status: response.status,
            ok: false,
            durationMs: Date.now() - started,
            query: question,
            errorMessage: errText || response.statusText
          })
          throw new Error(`Vector DB error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ""}`)
        }

        const data = await response.json()
        const results: VectorSearchResult[] = (data.result || []).map((r: any) => ({
          id: r.id || "",
          title: r.metadata?.title || r.metadata?.topic || "Information", 
          content: r.data || r.metadata?.content || "", // Check r.data first (raw vector data), then r.metadata.content
          score: r.score || 0,
          category: r.metadata?.category || r.metadata?.type || "",
          tags: r.metadata?.tags || [],
        }))
        
        console.log(`Found ${results.length} vector matches for query: "${question}"`)
        if (results.length > 0) {
          console.log('Top 3 results:')
          results.slice(0, 3).forEach((r, i) => {
            console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.id} - ${r.title} (${r.category})`)
            console.log(`     Content preview: "${r.content.substring(0, 100)}..."`)
          })
        }
        
        await logVectorQuery({
          status: 200,
          ok: true,
          durationMs: Date.now() - started,
          query: question
        })

        return results
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a connection reset error
      const isConnectionError = lastError.message.includes('ECONNRESET') || 
                                 lastError.message.includes('fetch failed') ||
                                 lastError.message.includes('aborted');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`⚠️ Vector query attempt ${attempt}/${maxRetries} failed (${lastError.message}), retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Exponential backoff
        continue;
      }
      
      console.error("Vector search error:", error)
      await logVectorQuery({
        status: 400,
        ok: false,
        durationMs: 0,
        query: question,
        errorMessage: lastError.message
      })
      throw lastError;
    }
  }
  
  throw lastError || new Error("Vector query failed after retries");
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
