/**
 * Puter API Route Handler (Client → Server Proxy)
 * 
 * This route accepts requests from the client with pre-generated responses
 * from the Puter SDK. The client calls Puter directly, then sends the result here.
 * 
 * Why: Puter SDK authentication only works in browser context
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { response, question, context } = await request.json()
    
    if (!response) {
      return NextResponse.json(
        { error: 'No response provided' },
        { status: 400 }
      )
    }

    // Return the client-generated response
    return NextResponse.json({ 
      answer: response,
      source: 'puter-sdk-client'
    })
    
  } catch (error) {
    console.error('Puter API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
