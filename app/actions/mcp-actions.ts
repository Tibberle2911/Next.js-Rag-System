'use server'

import { executeRAGQuery, basicRagTool, advancedRagTool, ragQueryTool, ragQuerySchema } from "@/lib/mcp-rag-tools"

// Server action for basic RAG query
export async function basicRagQuery(query: string) {
  try {
    const result = await executeRAGQuery({ query, mode: 'basic' })
    
    return {
      success: true,
      result: {
        content: [result]
      }
    }
  } catch {
    return {
      success: false,
      error: {
        code: -32602,
        message: 'Invalid parameters: query must be a non-empty string'
      }
    }
  }
}

// Server action for advanced RAG query  
export async function advancedRagQuery(query: string) {
  try {
    const result = await executeRAGQuery({ query, mode: 'advanced' })
    
    return {
      success: true,
      result: {
        content: [result]
      }
    }
  } catch {
    return {
      success: false,
      error: {
        code: -32602,
        message: 'Invalid parameters: query must be a non-empty string'
      }
    }
  }
}

// Server action for combined RAG query with mode selection
export async function ragQueryWithMode(params: { query: string; mode?: 'basic' | 'advanced' }) {
  try {
    const validatedParams = ragQuerySchema.parse(params)
    const result = await executeRAGQuery(validatedParams)
    
    return {
      success: true,
      result: {
        content: [result]
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: -32602,
        message: error instanceof Error ? error.message : 'Invalid parameters'
      }
    }
  }
}

// List all available tools (for MCP protocol)
export async function listRAGTools() {
  return {
    success: true,
    result: {
      tools: [
        {
          name: basicRagTool.name,
          description: basicRagTool.description,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The question or query to search for in the knowledge base',
                minLength: 1
              }
            },
            required: ['query']
          }
        },
        {
          name: advancedRagTool.name,
          description: advancedRagTool.description,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The question or query to search for using advanced RAG techniques',
                minLength: 1
              }
            },
            required: ['query']
          }
        },
        {
          name: ragQueryTool.name,
          description: ragQueryTool.description,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The question or query to search for in the knowledge base',
                minLength: 1
              },
              mode: {
                type: 'string',
                enum: ['basic', 'advanced'],
                description: 'RAG mode to use (basic or advanced)',
                default: 'basic'
              }
            },
            required: ['query']
          }
        }
      ]
    }
  }
}