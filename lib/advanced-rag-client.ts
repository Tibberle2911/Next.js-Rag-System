/**
 * Advanced RAG Client - TypeScript Implementation
 * Implements 5 advanced query transformation techniques:
 * 1. Multi-Query Generation
 * 2. RAG-Fusion with RRF
 * 3. Query Decomposition 
 * 4. Step-Back Prompting
 * 5. HyDE (Hypothetical Document Embeddings)
 * 
 * Compatible with existing Groq/Upstash configuration
 */

import { generateResponse, getGroqClient } from "./groq-client"
import { queryVectorDatabase, generateEmbedding, VectorSearchResult } from "./rag-client"

export interface AdvancedRAGConfig {
  useMultiQuery: boolean
  useRagFusion: boolean
  useDecomposition: boolean
  useStepBack: boolean
  useHyde: boolean
  
  // Multi-query settings
  numMultiQueries: number
  
  // RAG-Fusion settings
  rrrKValue: number
  fusionQueries: number
  
  // Decomposition settings
  maxSubQuestions: number
  
  // HyDE settings
  hydeTemperature: number
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedRAGConfig = {
  useMultiQuery: true,
  useRagFusion: true,
  useDecomposition: false,
  useStepBack: false,
  useHyde: false,
  numMultiQueries: 5,
  rrrKValue: 60,
  fusionQueries: 4,
  maxSubQuestions: 3,
  hydeTemperature: 0.2
}

export interface AdvancedRAGResult {
  answer: string
  sources: VectorSearchResult[]
  techniquesUsed: string[]
  metadata: {
    originalQuery: string
    transformedQueries: string[]
    retrievalScores: number[]
    processingTime: number
  }
  error?: string
}

/**
 * Advanced RAG Query Processor
 */
export class AdvancedRAGClient {
  private config: AdvancedRAGConfig
  
  constructor(config: Partial<AdvancedRAGConfig> = {}) {
    this.config = { ...DEFAULT_ADVANCED_CONFIG, ...config }
  }

  /**
   * Process query using enabled advanced techniques
   */
  async processAdvancedQuery(
    question: string, 
    canonicalName: string = "Tylor"
  ): Promise<AdvancedRAGResult> {
    const startTime = Date.now()
    const techniquesUsed: string[] = []
    const transformedQueries: string[] = [question]
    
    try {
      console.log("🧠 Processing with advanced RAG techniques...")
      
      let finalQuery = question
      let retrievalResults: VectorSearchResult[] = []

      // 1. Step-Back Prompting (if enabled, run first)
      if (this.config.useStepBack) {
        console.log("🔄 Applying Step-Back Prompting...")
        finalQuery = await this.stepBackPrompting(question)
        transformedQueries.push(finalQuery)
        techniquesUsed.push("Step-Back Prompting")
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 2. Query Decomposition (for complex queries)
      if (this.config.useDecomposition && this.isComplexQuery(finalQuery)) {
        console.log("🔍 Decomposing complex query...")
        const subQuestions = await this.decomposeQuery(finalQuery)
        transformedQueries.push(...subQuestions)
        techniquesUsed.push("Query Decomposition")
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Process sub-questions and combine results
        const subResults = await Promise.all(
          subQuestions.map(q => queryVectorDatabase(q, 3))
        )
        retrievalResults = this.combineSubResults(subResults)
      }

      // 3. Multi-Query Generation
      if (this.config.useMultiQuery) {
        console.log("📝 Generating multiple query perspectives...")
        const multiQueries = await this.generateMultiQueries(finalQuery)
        transformedQueries.push(...multiQueries)
        techniquesUsed.push("Multi-Query Generation")
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (retrievalResults.length === 0) {
          const multiResults = await Promise.all(
            multiQueries.map(q => queryVectorDatabase(q, 5))
          )
          retrievalResults = this.combineAndRank(multiResults)
        }
      }

      // 4. RAG-Fusion with RRF
      if (this.config.useRagFusion) {
        console.log("🔀 Applying RAG-Fusion ranking...")
        const fusionQueries = transformedQueries.slice(-this.config.fusionQueries)
        const fusionResults = await Promise.all(
          fusionQueries.map(q => queryVectorDatabase(q, 8))
        )
        retrievalResults = this.applyReciprocalRankFusion(fusionResults)
        techniquesUsed.push("RAG-Fusion (RRF)")
      }

      // 5. HyDE (Hypothetical Document Embeddings)
      if (this.config.useHyde) {
        console.log("💡 Generating hypothetical documents...")
        const hydeResults = await this.hydeRetrieval(finalQuery)
        if (hydeResults.length > 0) {
          retrievalResults = [...hydeResults, ...retrievalResults].slice(0, 8)
          techniquesUsed.push("HyDE")
        }
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Fallback to basic retrieval if no results
      if (retrievalResults.length === 0) {
        console.log("📚 Falling back to basic retrieval...")
        retrievalResults = await queryVectorDatabase(finalQuery, 6)
      }

      // Generate final response
      if (retrievalResults.length === 0) {
        return {
          answer: "I don't have specific information about that topic.",
          sources: [],
          techniquesUsed,
          metadata: {
            originalQuery: question,
            transformedQueries,
            retrievalScores: [],
            processingTime: Date.now() - startTime
          }
        }
      }

      console.log("⚡ Generating enhanced response...")
      
      // Build enhanced context
      const context = this.buildEnhancedContext(retrievalResults, techniquesUsed)
      
      const answer = await generateResponse({
        question,
        context,
        canonicalName
      })

      const retrievalScores = retrievalResults.map(r => r.score)

      return {
        answer,
        sources: retrievalResults,
        techniquesUsed,
        metadata: {
          originalQuery: question,
          transformedQueries,
          retrievalScores,
          processingTime: Date.now() - startTime
        }
      }

    } catch (error) {
      console.error("Advanced RAG error:", error)
      return {
        answer: "",
        sources: [],
        techniquesUsed,
        metadata: {
          originalQuery: question,
          transformedQueries,
          retrievalScores: [],
          processingTime: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : "Advanced RAG processing failed"
      }
    }
  }

  /**
   * Generate multiple query perspectives
   */
  private async generateMultiQueries(query: string): Promise<string[]> {
    const client = getGroqClient()
    
    const prompt = `Generate ${this.config.numMultiQueries} different ways to ask the following question. Each should capture different aspects or perspectives of the original query.

Original question: "${query}"

Return only the alternative questions, one per line, without numbering or additional text:`

    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 750,
      })

      const response = completion.choices[0].message.content || ""
      return response
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .slice(0, this.config.numMultiQueries)
    } catch (error) {
      console.error("Multi-query generation error:", error)
      return [query]
    }
  }

  /**
   * Apply Reciprocal Rank Fusion to combine multiple search results
   */
  private applyReciprocalRankFusion(searchResults: VectorSearchResult[][]): VectorSearchResult[] {
    const k = this.config.rrrKValue
    const scoreMap = new Map<string, { result: VectorSearchResult; rrrScore: number }>()

    // Calculate RRF scores
    for (const results of searchResults) {
      for (let rank = 0; rank < results.length; rank++) {
        const result = results[rank]
        const rrrScore = 1 / (k + rank + 1)
        
        if (scoreMap.has(result.id)) {
          scoreMap.get(result.id)!.rrrScore += rrrScore
        } else {
          scoreMap.set(result.id, {
            result: { ...result, score: rrrScore },
            rrrScore
          })
        }
      }
    }

    // Sort by RRF score and return top results
    return Array.from(scoreMap.values())
      .sort((a, b) => b.rrrScore - a.rrrScore)
      .map(({ result }) => result)
      .slice(0, 8)
  }

  /**
   * Decompose complex queries into sub-questions
   */
  private async decomposeQuery(query: string): Promise<string[]> {
    const client = getGroqClient()
    
    const prompt = `Break down this complex question into ${this.config.maxSubQuestions} simpler, more specific sub-questions that together would fully address the original question.

Complex question: "${query}"

Return only the sub-questions, one per line, without numbering:`

    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      })

      const response = completion.choices[0].message.content || ""
      return response
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .slice(0, this.config.maxSubQuestions)
    } catch (error) {
      console.error("Query decomposition error:", error)
      return [query]
    }
  }

  /**
   * Apply step-back prompting to make queries more general
   */
  private async stepBackPrompting(query: string): Promise<string> {
    const client = getGroqClient()
    
    const prompt = `You are an expert at reformulating specific questions into broader, more general questions that would lead to better information retrieval.

Rewrite this specific question into a broader, more general version that would help retrieve more comprehensive context:

Specific question: "${query}"

Return only the broader question without additional explanation:`

    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      })

      const response = completion.choices[0].message.content?.trim() || query
      return response.length > 0 ? response : query
    } catch (error) {
      console.error("Step-back prompting error:", error)
      return query
    }
  }

  /**
   * HyDE: Generate hypothetical documents and search with them
   */
  private async hydeRetrieval(query: string): Promise<VectorSearchResult[]> {
    const client = getGroqClient()
    
    const prompt = `Write a detailed, factual paragraph that would perfectly answer this question about a professional's background:

Question: "${query}"

Write as if you are the professional describing your own experience. Be specific and detailed:`

    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: this.config.hydeTemperature,
        max_tokens: 300,
      })

      const hypotheticalDoc = completion.choices[0].message.content || ""
      
      if (hypotheticalDoc.trim().length === 0) {
        return []
      }

      // Use the hypothetical document to search for similar real documents
      const embedding = generateEmbedding(hypotheticalDoc)
      
      // Perform vector search using the hypothetical document embedding
      const token = process.env.UPSTASH_VECTOR_REST_TOKEN
      const url = process.env.UPSTASH_VECTOR_REST_URL

      if (!token || !url) {
        return []
      }

      const response = await fetch(`${url}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector: embedding,
          topK: 5,
          includeMetadata: true,
        }),
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return (data.result || []).map((r: any) => ({
        id: r.id || "",
        title: r.metadata?.title || "Information",
        content: r.metadata?.content || "",
        score: r.score || 0,
        category: r.metadata?.category || "",
        tags: r.metadata?.tags || [],
      }))
      
    } catch (error) {
      console.error("HyDE retrieval error:", error)
      return []
    }
  }

  /**
   * Check if query is complex enough for decomposition
   */
  private isComplexQuery(query: string): boolean {
    const complexIndicators = [
      'and',
      'also',
      'what about',
      'how do',
      'tell me about',
      'explain',
      'compare',
      'difference',
      'both',
      'either'
    ]
    
    const lowercaseQuery = query.toLowerCase()
    return complexIndicators.some(indicator => lowercaseQuery.includes(indicator)) ||
           query.length > 100 ||
           (query.match(/[.!?]/g) || []).length > 1
  }

  /**
   * Combine results from sub-questions
   */
  private combineSubResults(subResults: VectorSearchResult[][]): VectorSearchResult[] {
    const allResults = subResults.flat()
    const uniqueResults = new Map<string, VectorSearchResult>()
    
    for (const result of allResults) {
      if (!uniqueResults.has(result.id) || uniqueResults.get(result.id)!.score < result.score) {
        uniqueResults.set(result.id, result)
      }
    }
    
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }

  /**
   * Combine and rank results from multiple queries
   */
  private combineAndRank(multiResults: VectorSearchResult[][]): VectorSearchResult[] {
    const allResults = multiResults.flat()
    const scoreMap = new Map<string, { result: VectorSearchResult; totalScore: number; count: number }>()
    
    for (const result of allResults) {
      if (scoreMap.has(result.id)) {
        const existing = scoreMap.get(result.id)!
        existing.totalScore += result.score
        existing.count += 1
      } else {
        scoreMap.set(result.id, {
          result,
          totalScore: result.score,
          count: 1
        })
      }
    }
    
    // Calculate average score and sort
    return Array.from(scoreMap.values())
      .map(({ result, totalScore, count }) => ({
        ...result,
        score: totalScore / count
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }

  /**
   * Build enhanced context with technique metadata
   */
  private buildEnhancedContext(results: VectorSearchResult[], techniques: string[]): string {
    const contextParts = results.slice(0, 6).map((r, idx) => {
      return `[${r.title}] ${r.content}`
    })
    
    const context = contextParts.join('\n\n')
    
    // Add technique metadata as context enhancement
    if (techniques.length > 0) {
      const enhancement = `\n\n[Enhanced retrieval using: ${techniques.join(', ')}]`
      return context + enhancement
    }
    
    return context
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdvancedRAGConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): AdvancedRAGConfig {
    return { ...this.config }
  }
}

/**
 * Default advanced RAG client instance
 */
export const advancedRAGClient = new AdvancedRAGClient()

/**
 * Quick access function for advanced RAG processing
 */
export async function queryAdvancedRAG(
  question: string,
  config?: Partial<AdvancedRAGConfig>,
  canonicalName: string = "Tylor"
): Promise<AdvancedRAGResult> {
  if (config) {
    advancedRAGClient.updateConfig(config)
  }
  
  return await advancedRAGClient.processAdvancedQuery(question, canonicalName)
}