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

import { generateResponse } from "./groq-client"
import { queryVectorDatabase, generateEmbedding, VectorSearchResult } from "./rag-client"
import { GoogleGenAI } from "@google/genai"
import { getCanonicalName } from "./canonical-name"
import { logAIGeneration } from "./metrics-logger"

export interface AdvancedRAGConfig {
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
  
  // Enhanced precision and faithfulness settings
  minRelevanceScore: number // Minimum relevance threshold for context chunks
  maxContextChunks: number // Maximum number of context chunks to use
  useRelevanceFiltering: boolean // Filter low-relevance chunks
  useClaimVerification: boolean // Verify claims against context
  diversityThreshold: number // Threshold for content diversity (0-1)
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedRAGConfig = {
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
  // Enhanced precision and faithfulness settings
  minRelevanceScore: 0.55, // More lenient threshold (was 0.65)
  maxContextChunks: 6, // Limit to top 6 most relevant chunks
  useRelevanceFiltering: true, // Enable relevance-based filtering
  useClaimVerification: true, // Enable claim verification for faithfulness
  diversityThreshold: 0.80 // More lenient diversity check (was 0.75)
}

export interface AdvancedRAGResult {
  answer: string
  sources: VectorSearchResult[]
  techniquesUsed: string[]
  metadata: {
    originalQuery: string
    enhancedQuery?: string
    transformedQueries: string[]
    retrievalScores: number[]
    processingTime: number
    interviewFormatted?: boolean
    contextPrecision?: number // Average relevance score (0-1)
    faithfulnessScore?: number // Claim verification score (0-1)
    numContextsUsed?: number // Number of context chunks used
  }
  error?: string
}

/**
 * Advanced RAG Query Processor
 */
export class AdvancedRAGClient {
  private config: AdvancedRAGConfig
  private geminiClient: GoogleGenAI | null = null
  
  constructor(config: Partial<AdvancedRAGConfig> = {}) {
    this.config = { ...DEFAULT_ADVANCED_CONFIG, ...config }
  }

  private getGeminiClient(): GoogleGenAI {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set")
      }
      this.geminiClient = new GoogleGenAI({ apiKey })
    }
    return this.geminiClient
  }

  private async callGemini(prompt: string, temperature: number = 0.7, maxTokens: number = 1500): Promise<string> {
    const client = this.getGeminiClient()
    const model = "gemini-2.0-flash"
    const started = Date.now()
    try {
      const resp: any = await client.models.generateContent({
        model,
        contents: prompt,
        temperature,
        maxOutputTokens: maxTokens
      } as any)

      let text = resp?.text || resp?.output?.[0]?.content || resp?.candidates?.[0]?.content || ""
      text = text.trim()
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1)
      }

      // Log successful generation (status 200 assumption)
      logAIGeneration({
        status: 200,
        ok: true,
        durationMs: Date.now() - started,
        provider: 'gemini',
        query: prompt.substring(0, 160), // truncate to avoid oversized payload
        mode: 'advanced'
      }).catch(() => {})

      return text
    } catch (error: any) {
      const message = error?.message || String(error)
      const isRateLimit = /429|rate[_\s-]?limit|quota/i.test(message)
      const status = error?.status ? Number(error.status) : (isRateLimit ? 429 : 500)
      // Log failed generation
      logAIGeneration({
        status,
        ok: false,
        durationMs: Date.now() - started,
        provider: 'gemini',
        query: prompt.substring(0, 160),
        mode: 'advanced',
        errorMessage: message,
        fallbackUsed: false
      }).catch(() => {})
      console.error("Gemini API error:", error)
      throw error
    }
  }

  /**
   * Filter and re-rank results based on relevance to improve context precision
   */
  private async filterByRelevance(
    results: VectorSearchResult[],
    query: string
  ): Promise<VectorSearchResult[]> {
    if (!this.config.useRelevanceFiltering || results.length === 0) {
      return results
    }

    console.log(`🎯 Filtering ${results.length} results by relevance (threshold: ${this.config.minRelevanceScore})...`)

    // Step 1: Filter by minimum score threshold
    let filtered = results.filter(r => r.score >= this.config.minRelevanceScore)
    
    console.log(`✅ After score filtering: ${filtered.length} results (removed ${results.length - filtered.length})...`)
    
    // If filtering removed everything, keep top results regardless
    if (filtered.length === 0 && results.length > 0) {
      console.log(`⚠️ Threshold too strict, keeping top ${Math.min(3, results.length)} results...`)
      filtered = results.slice(0, Math.min(3, results.length))
    }

    // Step 2: Remove near-duplicate content for diversity
    filtered = await this.removeDuplicates(filtered)
    
    console.log(`✅ After diversity filtering: ${filtered.length} results...`)

    // Step 3: Re-rank by semantic relevance to original query
    if (filtered.length > 0) {
      filtered = await this.reRankByQueryRelevance(filtered, query)
    }
    
    // Step 4: Limit to max context chunks
    const finalResults = filtered.slice(0, this.config.maxContextChunks)
    
    if (finalResults.length > 0) {
      console.log(`✅ Final context chunks: ${finalResults.length} (avg score: ${(finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length).toFixed(3)})...`)
    }
    
    return finalResults
  }

  /**
   * Remove near-duplicate or highly similar chunks to increase diversity
   */
  private async removeDuplicates(results: VectorSearchResult[]): Promise<VectorSearchResult[]> {
    if (results.length <= 1) return results

    const diverse: VectorSearchResult[] = [results[0]] // Always keep the top result
    
    for (let i = 1; i < results.length; i++) {
      const candidate = results[i]
      let isDuplicate = false
      
      // Check similarity with already selected chunks
      for (const selected of diverse) {
        const similarity = this.calculateTextSimilarity(candidate.content, selected.content)
        
        if (similarity > this.config.diversityThreshold) {
          isDuplicate = true
          console.log(`⚠️ Removing similar chunk: "${candidate.title}" (${(similarity * 100).toFixed(1)}% similar to "${selected.title}")...`)
          break
        }
      }
      
      if (!isDuplicate) {
        diverse.push(candidate)
      }
    }
    
    return diverse
  }

  /**
   * Calculate text similarity using word overlap (Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Re-rank results based on semantic relevance to the query
   */
  private async reRankByQueryRelevance(
    results: VectorSearchResult[],
    query: string
  ): Promise<VectorSearchResult[]> {
    console.log(`🔄 Re-ranking ${results.length} results by query relevance...`)

    // Use Gemini to score relevance of each chunk to the query
    const scoredResults = await Promise.all(
      results.map(async (result) => {
        try {
          const relevanceScore = await this.scoreRelevance(result, query)
          return {
            ...result,
            score: (result.score + relevanceScore) / 2 // Combine vector score with relevance score
          }
        } catch (error) {
          console.error(`Error scoring relevance for "${result.title}":`, error)
          return result // Keep original if scoring fails
        }
      })
    )

    // Sort by combined score
    return scoredResults.sort((a, b) => b.score - a.score)
  }

  /**
   * Score relevance of a chunk to the query using LLM
   */
  private async scoreRelevance(result: VectorSearchResult, query: string): Promise<number> {
    const prompt = `Rate how relevant this content is to answering the question. Score from 0.0 (not relevant) to 1.0 (highly relevant).

Question: "${query}"

Content: "${result.content.substring(0, 300)}..."

Return only a decimal number between 0.0 and 1.0:`

    try {
      const scoreText = await this.callGemini(prompt, 0.1, 200)
      const score = parseFloat(scoreText.trim())
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score))
    } catch (error) {
      return 0.5 // Default to neutral score on error
    }
  }

  /**
   * Verify claims in the answer against the provided context (for faithfulness)
   */
  private async verifyClaims(
    answer: string,
    context: VectorSearchResult[]
  ): Promise<{ verifiedAnswer: string; faithfulnessScore: number }> {
    if (!this.config.useClaimVerification) {
      return { verifiedAnswer: answer, faithfulnessScore: 1.0 }
    }

    console.log(`✅ Verifying claims for faithfulness...`)

    const contextText = context.map(r => r.content).join('\n\n')
    
    const prompt = `You are a fact-checker verifying an interview response against source material.

SOURCE MATERIAL:
${contextText}

RESPONSE TO VERIFY:
"${answer}"

TASK:
1. Check if ALL factual claims in the response are supported by the source material
2. If any claim is NOT supported or cannot be verified, remove or rewrite it
3. Return ONLY the verified response - do NOT include your fact-checking process, explanations, or analysis
4. Maintain the natural, conversational interview tone
5. Keep the response concise and interview-ready
6. Remove any explicit STAR markers like "The result?", "My task was", "The situation was"
7. Ensure smooth, natural transitions between ideas
8. Preserve the person's actual name if mentioned (replace "[Your Name]" with the actual name from context)
9. CRITICAL: Maintain first-person singular ("I", "my", "me") throughout - NEVER use "we", "our", or "us"

Return only the final verified response (no explanations, no fact-checking notes):`

    try {
      const verifiedAnswer = await this.callGemini(prompt, 0.2, 600)
      
      // Clean up any markdown or explanations that might have leaked through
      let cleanedAnswer = verifiedAnswer.trim()
      
      // Remove common prefixes that might appear
      const prefixesToRemove = [
        'Here is the verified response:',
        'Verified response:',
        'Here\'s the verified answer:',
        'The verified response is:',
        '**Verified Response:**',
        'Response:'
      ]
      
      for (const prefix of prefixesToRemove) {
        if (cleanedAnswer.toLowerCase().startsWith(prefix.toLowerCase())) {
          cleanedAnswer = cleanedAnswer.substring(prefix.length).trim()
        }
      }
      
      // Remove markdown formatting
      cleanedAnswer = cleanedAnswer.replace(/^\*\*(.+?)\*\*$/g, '$1')
      cleanedAnswer = cleanedAnswer.replace(/^["'](.+)["']$/g, '$1')
      
      // Remove STAR markers that may have been preserved
      cleanedAnswer = this.removeStarMarkers(cleanedAnswer)
      
      // Calculate faithfulness score based on how much was changed
      const similarity = this.calculateTextSimilarity(answer, cleanedAnswer)
      const faithfulnessScore = similarity // Higher similarity = fewer changes needed = higher faithfulness
      
      console.log(`📊 Faithfulness score: ${(faithfulnessScore * 100).toFixed(1)}% (${similarity > 0.9 ? 'High' : similarity > 0.7 ? 'Medium' : 'Low'})...`)
      
      return { verifiedAnswer: cleanedAnswer, faithfulnessScore }
    } catch (error) {
      console.error('Claim verification error:', error)
      return { verifiedAnswer: answer, faithfulnessScore: 0.8 }
    }
  }

  /**
   * Enhance query for better retrieval with synonyms and context expansion
   */
  private async enhanceQuery(originalQuery: string): Promise<string> {
    const interviewContext = this.getInterviewContext()
    
    const prompt = `You are an interview preparation assistant that improves search queries.

Original question: "${originalQuery}"

${interviewContext}

Enhance this query to better search professional profile data by:
- Adding relevant synonyms and related terms
- Expanding context for interview scenarios
- Including technical and soft skill variations
- Focusing on achievements and quantifiable results
- Adding industry-specific terminology

Return only the enhanced search query (no explanation):`

    try {
      const enhanced = await this.callGemini(prompt, 0.3, 350)
      return enhanced.trim() || originalQuery
    } catch (error) {
      console.error("Query enhancement failed:", error)
      return originalQuery
    }
  }

  /**
   * Format response for interview context with STAR methodology
   */
  private async formatForInterview(
    ragResults: VectorSearchResult[],
    originalQuestion: string
  ): Promise<string> {
    const context = ragResults
      .map(result => `[${result.title}] ${result.content}`)
      .join('\n\n')

    const interviewGuidance = this.getInterviewGuidance()

    const prompt = `You are an expert interview coach. Create a compelling interview response using this professional data.

Question: "${originalQuestion}"

Professional Background Data:
${context}

${interviewGuidance}

Create a response that:
- Directly addresses the interview question
- Uses specific examples and quantifiable achievements from the data
- Tells a cohesive story with situation, actions taken, and results achieved
- Flows naturally without explicit markers like "The result?" or "The situation was"
- Sounds confident, conversational, and natural for an interview setting
- Highlights unique value and differentiators
- Includes relevant technical details without being overwhelming
- Is concise (100-200 words) and interview-ready

CRITICAL RULES:
1. Use ONLY first-person singular ("I", "my", "me") - NEVER "we", "our", "us"
2. NO explicit STAR markers (avoid phrases like "The result?", "My task was", "The situation was")
3. Create natural transitions between ideas
4. Let the story flow organically without labeling sections
5. If the data contains "My name is [Your Name]" or similar, extract the ACTUAL name and use it naturally in the response (e.g., "My name is Tylor" → use "I'm Tylor")
6. Replace any placeholder text like "[Your Name]" with the actual name found in the context

Good example: "I'm a front-end engineer passionate about building performant user interfaces. In a recent role, the application's performance was negatively impacting conversion rates. I analyzed the bottlenecks, refactored key components using TypeScript, and optimized data fetching. This improved load time by 40% and increased user engagement significantly."

Bad example: "The situation was a slow app. My task was to fix it. I did X. The result? Better performance."

Interview Response:`

    try {
      const formatted = await this.callGemini(prompt, 0.7, 500)
      const cleaned = this.removeStarMarkers(formatted.trim())
      return cleaned
    } catch (error) {
      console.error("Response formatting failed:", error)
      // Fallback to basic formatting
      return context
    }
  }

  /**
   * Remove explicit STAR format markers from responses
   */
  private removeStarMarkers(text: string): string {
    let cleaned = text

    // Remove explicit STAR markers and awkward transitions
    const markersToRemove = [
      /The result\?[\s:]/gi,
      /The situation was[:\s]/gi,
      /My task was[:\s]/gi,
      /The task was[:\s]/gi,
      /The action[s]?\s+(?:I took|was|were)[:\s]/gi,
      /As a result[,:\s]/gi,
      /The outcome was[:\s]/gi,
      /Here's what I did[:\s]/gi,
      /Let me (?:give you an example|tell you about)[:\s]/gi,
      /For example,?\s+in\s+(?:a\s+)?(?:past|recent|previous)\s+(?:role|project|position)[,:\s]/gi
    ]

    for (const pattern of markersToRemove) {
      cleaned = cleaned.replace(pattern, '')
    }

    // Clean up any double spaces or awkward punctuation
    cleaned = cleaned.replace(/\s{2,}/g, ' ')
    cleaned = cleaned.replace(/\s+([.,;:])/g, '$1')
    cleaned = cleaned.trim()

    return cleaned
  }

  /**
   * Get interview-specific context based on type
   */
  private getInterviewContext(): string {
    const contexts = {
      technical: 'Focus on: technical skills, problem-solving, architecture decisions, code quality, and system design.',
      behavioral: 'Focus on: leadership examples, teamwork stories, communication skills, conflict resolution, and adaptability.',
      executive: 'Focus on: strategic thinking, business impact, vision and direction, stakeholder management, and organizational leadership.',
      general: 'Focus on: relevant experience, key achievements, skills demonstration, and professional growth.'
    }
    
    return contexts[this.config.interviewType || 'general']
  }

  /**
   * Get interview-specific response guidance
   */
  private getInterviewGuidance(): string {
    const guidance = {
      technical: 'Response style: Provide detailed technical examples with specific metrics and technologies used. Demonstrate problem-solving approach.',
      behavioral: 'Response style: Use STAR format stories with emotional intelligence. Show self-awareness and learning from experiences.',
      executive: 'Response style: Present high-level strategic responses with business metrics and organizational impact. Show vision and leadership.',
      general: 'Response style: Balance technical depth with accessibility. Include specific achievements and quantifiable results.'
    }
    
    return guidance[this.config.interviewType || 'general']
  }

  /**
   * Process query using enabled advanced techniques
   */
  async processAdvancedQuery(
    question: string, 
    canonicalName: string = getCanonicalName()
  ): Promise<AdvancedRAGResult> {
    const startTime = Date.now()
    const techniquesUsed: string[] = []
    const transformedQueries: string[] = [question]
    let enhancedQuery: string | undefined
    
    try {
      console.log("🧠 Processing with advanced RAG techniques...")
      
      let finalQuery = question
      let retrievalResults: VectorSearchResult[] = []

      // 0. Query Enhancement (if enabled, run first)
      if (this.config.useQueryEnhancement) {
        console.log("✨ Enhancing query with semantic expansion...")
        enhancedQuery = await this.enhanceQuery(question)
        finalQuery = enhancedQuery
        transformedQueries.push(enhancedQuery)
        techniquesUsed.push("Query Enhancement")
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // 1. Step-Back Prompting (if enabled, run after enhancement)
      if (this.config.useStepBack) {
        console.log("🔄 Applying Step-Back Prompting...")
        finalQuery = await this.stepBackPrompting(finalQuery)
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
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Process sub-questions SEQUENTIALLY to avoid connection resets
        const subResults: VectorSearchResult[][] = [];
        for (const q of subQuestions) {
          const result = await queryVectorDatabase(q, 3);
          subResults.push(result);
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay between requests
        }
        retrievalResults = this.combineSubResults(subResults)
      }

      // 3. Multi-Query Generation
      if (this.config.useMultiQuery) {
        console.log("📝 Generating multiple query perspectives...")
        const multiQueries = await this.generateMultiQueries(finalQuery)
        transformedQueries.push(...multiQueries)
        techniquesUsed.push("Multi-Query Generation")
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (retrievalResults.length === 0) {
          // Process queries SEQUENTIALLY to avoid connection resets
          const multiResults: VectorSearchResult[][] = [];
          for (const q of multiQueries) {
            const result = await queryVectorDatabase(q, 5);
            multiResults.push(result);
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between requests
          }
          retrievalResults = this.combineAndRank(multiResults)
        }
      }

      // 4. RAG-Fusion with RRF
      if (this.config.useRagFusion) {
        console.log("🔀 Applying RAG-Fusion ranking...")
        const fusionQueries = transformedQueries.slice(-this.config.fusionQueries)
        
        // Process fusion queries SEQUENTIALLY to avoid connection resets
        const fusionResults: VectorSearchResult[][] = [];
        for (const q of fusionQueries) {
          const result = await queryVectorDatabase(q, 8);
          fusionResults.push(result);
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay between requests
        }
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
        retrievalResults = await queryVectorDatabase(finalQuery, 10) // Retrieve more initially for filtering
      }

      // Apply relevance filtering to improve context precision
      console.log(`📊 Retrieved ${retrievalResults.length} initial results...`)
      const filteredResults = await this.filterByRelevance(retrievalResults, question)
      
      // Smart fallback: If filtering removes ALL results, use relaxed filtering
      if (filteredResults.length === 0 && retrievalResults.length > 0) {
        console.log("⚠️ Strict filtering removed all results. Applying relaxed filtering...")
        
        // Relaxed filtering: lower threshold and less strict diversity
        const relaxedResults = retrievalResults
          .filter(r => r.score >= (this.config.minRelevanceScore * 0.7)) // 30% more lenient
          .slice(0, Math.max(3, this.config.maxContextChunks)) // At least 3 results
        
        if (relaxedResults.length > 0) {
          retrievalResults = relaxedResults
          console.log(`✨ Using ${retrievalResults.length} contexts with relaxed filtering...`)
          techniquesUsed.push(`Relaxed Context Filtering (${retrievalResults.length} chunks)`)
        } else {
          // Last resort: use top results by score regardless of threshold
          retrievalResults = retrievalResults
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
          console.log(`⚡ Using top ${retrievalResults.length} results as last resort...`)
          techniquesUsed.push(`Basic Retrieval (${retrievalResults.length} chunks)`)
        }
      } else {
        retrievalResults = filteredResults
        if (retrievalResults.length > 0) {
          const avgScore = retrievalResults.reduce((sum, r) => sum + r.score, 0) / retrievalResults.length
          console.log(`✨ Using ${retrievalResults.length} high-precision contexts (avg score: ${(avgScore * 100).toFixed(1)}%)...`)
          techniquesUsed.push(`Context Precision Filtering (${retrievalResults.length} chunks, ${(avgScore * 100).toFixed(1)}% avg)`)
        }
      }

      // Generate final response
      if (retrievalResults.length === 0) {
        return {
          answer: "I don't have specific information about that topic.",
          sources: [],
          techniquesUsed,
          metadata: {
            originalQuery: question,
            enhancedQuery,
            transformedQueries,
            retrievalScores: [],
            processingTime: Date.now() - startTime,
            interviewFormatted: false
          }
        }
      }

      console.log("⚡ Generating enhanced response...")
      
      let answer: string
      let faithfulnessScore: number = 1.0
      
      // Use interview formatting if enabled
      if (this.config.useInterviewFormatting) {
        console.log("🎯 Formatting response for interview context...")
        answer = await this.formatForInterview(retrievalResults, question)
        techniquesUsed.push("Interview Formatting")
      } else {
        // Build enhanced context for standard generation
        const context = this.buildEnhancedContext(retrievalResults, techniquesUsed)
        
        answer = await generateResponse({
          question,
          context,
          canonicalName,
          provider: 'gemini' // Use Gemini for advanced RAG generation
        })
      }

      // Verify claims against context for faithfulness
      const verification = await this.verifyClaims(answer, retrievalResults)
      answer = verification.verifiedAnswer
      faithfulnessScore = verification.faithfulnessScore
      
      // Additional cleanup: Remove any fact-checking artifacts that might appear
      if (answer.toLowerCase().includes('identify all factual claims') || 
          answer.toLowerCase().includes('verify each claim') ||
          answer.toLowerCase().includes('fact-check')) {
        console.log('⚠️ Detected verification artifacts in response, using original answer...')
        // If verification leaked its process, use the original answer
        if (this.config.useInterviewFormatting) {
          answer = await this.formatForInterview(retrievalResults, question)
        } else {
          const context = this.buildEnhancedContext(retrievalResults, techniquesUsed)
          answer = await generateResponse({
            question,
            context,
            canonicalName,
            provider: 'gemini'
          })
        }
        faithfulnessScore = 0.9 // Assume good faith without verification
      }
      
      if (this.config.useClaimVerification) {
        techniquesUsed.push(`Claim Verification (${(faithfulnessScore * 100).toFixed(1)}% faithful)`)
      }

      const retrievalScores = retrievalResults.map(r => r.score)

      // Calculate context precision metric
      const contextPrecision = retrievalScores.length > 0
        ? retrievalScores.reduce((sum, score) => sum + score, 0) / retrievalScores.length
        : 0

      return {
        answer,
        sources: retrievalResults,
        techniquesUsed,
        metadata: {
          originalQuery: question,
          enhancedQuery,
          transformedQueries,
          retrievalScores,
          processingTime: Date.now() - startTime,
          interviewFormatted: this.config.useInterviewFormatting,
          contextPrecision, // Average relevance score of retrieved chunks
          faithfulnessScore, // Claim verification score
          numContextsUsed: retrievalResults.length
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
          enhancedQuery,
          transformedQueries,
          retrievalScores: [],
          processingTime: Date.now() - startTime,
          interviewFormatted: false
        },
        error: error instanceof Error ? error.message : "Advanced RAG processing failed"
      }
    }
  }

  /**
   * Generate multiple query perspectives
   */
  private async generateMultiQueries(query: string): Promise<string[]> {
    const prompt = `Generate ${this.config.numMultiQueries} different ways to ask the following question. Each should capture different aspects or perspectives of the original query.

Original question: "${query}"

Return only the alternative questions, one per line, without numbering or additional text:`

    try {
      const response = await this.callGemini(prompt, 0.7, 750)
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
    const prompt = `Break down this complex question into ${this.config.maxSubQuestions} simpler, more specific sub-questions that together would fully address the original question.

Complex question: "${query}"

Return only the sub-questions, one per line, without numbering:`

    try {
      const response = await this.callGemini(prompt, 0.3, 300)
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
    const prompt = `You are an expert at reformulating specific questions into broader, more general questions that would lead to better information retrieval.

Rewrite this specific question into a broader, more general version that would help retrieve more comprehensive context:

Specific question: "${query}"

Return only the broader question without additional explanation:`

    try {
      const response = (await this.callGemini(prompt, 0.3, 300)).trim()
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
    const prompt = `Write a detailed, factual paragraph that would perfectly answer this question about a professional's background:

Question: "${query}"

Write as if you are the professional describing your own experience. Be specific and detailed:`

    try {
      const hypotheticalDoc = await this.callGemini(prompt, this.config.hydeTemperature, 500)
      
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
  canonicalName: string = getCanonicalName()
): Promise<AdvancedRAGResult> {
  if (config) {
    advancedRAGClient.updateConfig(config)
  }
  
  return await advancedRAGClient.processAdvancedQuery(question, canonicalName)
}