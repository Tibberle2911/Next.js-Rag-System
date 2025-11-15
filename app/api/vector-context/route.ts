import { NextResponse } from 'next/server'
import { queryVectorDatabase, sanitizeText, isBehavioralQuery } from '@/lib/rag-client'
import { getCanonicalName } from '@/lib/canonical-name'

// Server-side vector context retrieval for dense-only Upstash index
// Accepts POST { question: string, topK?: number }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const question: string = (body.question || '').toString().trim()
    const topK: number = typeof body.topK === 'number' ? body.topK : 8

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Dense vector retrieval
    let results = await queryVectorDatabase(question, topK)

    // Behavioral prioritization
    if (isBehavioralQuery(question)) {
      const starResults = results.filter(r => r.tags?.includes('star'))
      if (starResults.length > 0) {
        results = [...starResults, ...results.filter(r => !r.tags?.includes('star'))].slice(0, topK)
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ context: '', sources: [], canonicalName: getCanonicalName() })
    }

    const topContextDocs = results
      .slice(0, 5)
      .map(r => `${r.title}: ${sanitizeText(r.content)}`)
      .join('\n\n')

    return NextResponse.json({
      context: topContextDocs,
      sources: results.map(r => ({
        id: r.id,
        title: r.title,
        content: sanitizeText(r.content),
        score: r.score,
        category: r.category,
        tags: r.tags,
      })),
      canonicalName: getCanonicalName()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Vector context retrieval failed' }, { status: 500 })
  }
}
