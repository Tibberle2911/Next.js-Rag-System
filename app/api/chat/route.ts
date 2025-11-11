import { NextRequest, NextResponse } from 'next/server'
import { ragQuery } from '@/app/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Call the existing RAG query action
    const result = await ragQuery(message.trim())

    if (result.error) {
      return NextResponse.json(
        { 
          message: result.answer || "I encountered an error processing your question.",
          sources: result.sources,
          error: result.error 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: result.answer,
      sources: result.sources
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      { 
        message: "I encountered an error processing your question.",
        sources: [],
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
      POST: '/api/chat - Send a message to the RAG system'
    }
  })
}