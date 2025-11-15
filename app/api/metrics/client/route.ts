import { logRequestMetric, logFallbackMetric } from '@/lib/metrics-logger'
import { hasPostgres, ensureMetricsTables } from '@/lib/db'

// Accept client-side metrics (e.g., Puter streaming) since client can’t access server Postgres driver directly.
// Payload shape examples:
// { kind: 'generation', provider: 'puter', status: 200, ok: true, durationMs: 1234, query: '...' }
// { kind: 'generation', provider: 'puter', status: 500, ok: false, errorMessage: '...', query: '...' }
// { kind: 'fallback', from: 'advanced', to: 'basic', reason: 'rate_limit', query: '...', originalStatus: 429 }

export async function POST(request: Request) {
  if (!hasPostgres()) {
    return new Response(JSON.stringify({ ok: false, error: 'Postgres not configured' }), { status: 400 })
  }
  await ensureMetricsTables()
  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 })
  }

  const kind = body.kind
  try {
    if (kind === 'generation') {
      await logRequestMetric({
        ts: Date.now(),
        service: body.provider || 'unknown',
        kind: 'generation',
        status: body.status ?? 200,
        ok: body.ok ?? true,
        durationMs: body.durationMs,
        query: body.query?.substring(0, 512),
        errorMessage: body.errorMessage,
        fallbackUsed: body.fallbackUsed ?? false,
        mode: body.mode
      })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    if (kind === 'fallback') {
      await logFallbackMetric({
        ts: Date.now(),
        service: 'mcp',
        kind: 'fallback',
        from: body.from || 'advanced',
        to: body.to || 'basic',
        reason: body.reason || 'error',
        originalStatus: body.originalStatus,
        message: body.message,
        query: body.query?.substring(0, 512)
      })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    return new Response(JSON.stringify({ ok: false, error: 'Unsupported kind' }), { status: 400 })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Metric logging failed' }), { status: 500 })
  }
}