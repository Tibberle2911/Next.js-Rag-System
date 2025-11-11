import { NextRequest, NextResponse } from 'next/server'
import { ragQuery, RAGMode } from '@/app/actions'
import { AdvancedRAGConfig } from '@/lib/advanced-rag-client'

interface ChatRequest {
  message: string
  mode?: RAGMode
  advancedConfig?: Partial<AdvancedRAGConfig>
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, mode = "basic", advancedConfig } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Call the RAG query action with mode support
    const result = await ragQuery(message.trim(), mode, advancedConfig)

    if (result.error) {
      return NextResponse.json(
        { 
          message: result.answer || "I encountered an error processing your question.",
          sources: result.sources,
          metadata: result.metadata,
          error: result.error 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: result.answer,
      sources: result.sources,
      metadata: result.metadata
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      { 
        message: "I encountered an error processing your question.",
        sources: [],
        metadata: { mode: "basic" },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'RAG Chat API is running',
    endpoints: {
      POST: '/api/chat - Send a message to the RAG system (supports basic and advanced modes)'
    },
    supportedModes: ['basic', 'advanced'],
    advancedTechniques: [
      'Multi-Query Generation',
      'RAG-Fusion (RRF)', 
      'Query Decomposition',
      'Step-Back Prompting',
      'HyDE'
    ]
  })
}