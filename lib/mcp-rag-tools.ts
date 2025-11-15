import { z } from "zod"
import { ragQuery } from '../app/actions'
import { RAGMode } from '../app/actions'

// Shared Zod schema for RAG query validation
export const ragQuerySchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  mode: z.enum(['basic', 'advanced']).optional().default('advanced')
})

// RAG query result type
export interface RAGResult {
  type: 'text'
  text: string
  sources?: Array<{
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
}

// Shared RAG logic used by both MCP handler and server actions
export async function executeRAGQuery(params: z.infer<typeof ragQuerySchema>): Promise<RAGResult> {
  // Validate input using the shared schema
  const { query, mode } = ragQuerySchema.parse(params)
  
  try {
    // Use existing server action that handles both basic and advanced modes
    const response = await ragQuery(query, mode as RAGMode)
    
    if (response.error) {
      throw new Error(response.error)
    }
    
    return {
      type: 'text',
      text: response.answer,
      sources: response.sources,
      metadata: response.metadata
    }
  } catch (error) {
    // Return error as text result
    return {
      type: 'text',
      text: `Error processing query: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Tool definitions that can be reused
export const basicRagTool = {
  name: 'basic_rag_query',
  description: 'Performs a basic RAG query using standard retrieval and generation',
  schema: ragQuerySchema.omit({ mode: true }).extend({
    query: z.string().min(1).describe("The question or query to search for in the knowledge base")
  })
} as const

export const advancedRagTool = {
  name: 'advanced_rag_query', 
  description: 'Performs an advanced RAG query with enhanced techniques like multi-query generation and RAG-fusion',
  schema: ragQuerySchema.omit({ mode: true }).extend({
    query: z.string().min(1).describe("The question or query to search for using advanced RAG techniques")
  })
} as const

// Combined tool for mode selection
export const ragQueryTool = {
  name: 'rag_query',
  description: 'Performs a RAG query with optional mode selection (basic or advanced)',
  schema: ragQuerySchema
} as const