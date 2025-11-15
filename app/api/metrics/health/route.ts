import { fetchRecentCounts, fetchRecentSamples, fetchCountsSince } from '@/lib/metrics-logger'
import { hasPostgres } from '@/lib/db'

// Metrics Health Endpoint
// Returns summary counts and optional recent samples if Redis configured.
export async function GET() {
  const counts = await fetchRecentCounts()
  const samples = await fetchRecentSamples(50)
  const since24h = Date.now() - 24 * 60 * 60 * 1000
  const counts24h = await fetchCountsSince(since24h)

  return new Response(JSON.stringify({
    ok: true,
    counts,
    samples,
    counts24h,
    backend: hasPostgres() ? 'postgres' : 'none',
    loggingEnabled: hasPostgres() && process.env.ENABLE_METRICS_LOGGING !== 'false'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

