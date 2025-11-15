import { NextRequest, NextResponse } from 'next/server'
import { ragQuery } from '@/app/actions'

type Mode = 'basic' | 'advanced'

interface LoadTestRequest {
  question?: string
  totalRequests: number
  concurrency: number
  mode: Mode
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LoadTestRequest
    const question = body.question || 'Tell me about yourself'
    const total = Math.max(1, Math.min(500, Number(body.totalRequests || 50)))
    const concurrency = Math.max(1, Math.min(50, Number(body.concurrency || 5)))
    const mode: Mode = body.mode === 'advanced' ? 'advanced' : 'basic'

    const tasks: Array<() => Promise<{ ok: boolean; ms: number; error?: string }>> = []
    for (let i = 0; i < total; i++) {
      tasks.push(async () => {
        const t0 = Date.now()
        try {
          const res = await ragQuery(question, mode)
          const ms = Date.now() - t0
          if (res.error) return { ok: false, ms, error: res.error }
          return { ok: true, ms }
        } catch (e: any) {
          const ms = Date.now() - t0
          return { ok: false, ms, error: e?.message || String(e) }
        }
      })
    }

    // Run with bounded concurrency
    const results: { ok: boolean; ms: number; error?: string }[] = []
    let idx = 0
    const workers = new Array(concurrency).fill(0).map(async () => {
      while (idx < tasks.length) {
        const current = idx++
        const r = await tasks[current]()
        results[current] = r
      }
    })
    await Promise.all(workers)

    const successes = results.filter(r => r.ok).length
    const failures = results.length - successes
    const latencies = results.map(r => r.ms).sort((a, b) => a - b)
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] || 0
    const p95 = p(0.95)
    const p99 = p(0.99)
    const rps = (results.length / Math.max(1, latencies.reduce((a, b) => Math.max(a, b), 0) / 1000))

    return NextResponse.json({
      summary: {
        total,
        concurrency,
        mode,
        successes,
        failures,
        avg_ms: Math.round(avg),
        p95_ms: p95,
        p99_ms: p99,
        approx_rps: Number(rps.toFixed(2))
      },
      samples: results.map((r, i) => ({ i, ok: r.ok, ms: r.ms, error: r.error }))
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Load test failed' }, { status: 500 })
  }
}
