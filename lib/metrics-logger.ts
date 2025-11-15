/**
 * Metrics Logger
 * Captures performance + fallback events for:
 * - Vector DB queries
 * - AI generation (Puter, Gemini, Groq)
 * - Fallback transitions (advanced->basic, Puter->Gemini)
 *
 * Storage: Upstash Redis REST API (two logical "tables")
 *   rag:requests  -> individual request events
 *   rag:fallbacks -> fallback events
 *
 * Each entry LPUSH then LTRIM to a bounded length for cost control.
 * If Redis env vars missing, functions become no-ops.
 */

import { pgQuery, ensureMetricsTables, hasPostgres } from './db'

interface BaseEvent {
  ts: number; // epoch ms
  service: string; // vector|puter|gemini|groq|mcp|pipeline
  kind: string; // query|generation|fallback
}

export interface RequestMetricEvent extends BaseEvent {
  status: number;
  ok: boolean;
  durationMs?: number;
  endpoint?: string;
  query?: string;
  errorMessage?: string;
  fallbackUsed?: boolean;
  mode?: string; // basic|advanced
}

export interface FallbackMetricEvent extends BaseEvent {
  from: string; // advanced|puter
  to: string;   // basic|gemini
  reason: string; // rate_limit|error|empty_result
  originalStatus?: number;
  message?: string;
  query?: string;
}

// Redis fallback removed – metrics persist only in Neon Postgres.
const ENABLE_LOGGING = process.env.ENABLE_METRICS_LOGGING !== 'false'

export async function logRequestMetric(event: RequestMetricEvent) {
  if (!ENABLE_LOGGING) return
  if (!hasPostgres()) return
  await ensureMetricsTables()
  try {
    await pgQuery(
      `INSERT INTO rag_requests (ts, service, kind, status, ok, duration_ms, endpoint, query, error_message, fallback_used, mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [event.ts, event.service, event.kind, event.status, event.ok, event.durationMs || null, event.endpoint || null, event.query || null, event.errorMessage || null, event.fallbackUsed || false, event.mode || null]
    )
  } catch (e) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Postgres insert rag_requests failed:', e)
  }
}

export async function logFallbackMetric(event: FallbackMetricEvent) {
  if (!ENABLE_LOGGING) return
  if (!hasPostgres()) return
  await ensureMetricsTables()
  try {
    await pgQuery(
      `INSERT INTO rag_fallbacks (ts, service, kind, from_mode, to_mode, reason, original_status, message, query)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [event.ts, event.service, event.kind, event.from, event.to, event.reason, event.originalStatus || null, event.message || null, event.query || null]
    )
  } catch (e) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Postgres insert rag_fallbacks failed:', e)
  }
}

// Convenience wrappers
export async function logVectorQuery(params: { status: number; ok: boolean; durationMs: number; query: string; errorMessage?: string; }) {
  await logRequestMetric({
    ts: Date.now(),
    service: 'vector',
    kind: 'query',
    status: params.status,
    ok: params.ok,
    durationMs: params.durationMs,
    query: params.query,
    errorMessage: params.errorMessage
  })
}

export async function logAIGeneration(params: { status: number; ok: boolean; durationMs: number; provider: string; query: string; mode?: string; errorMessage?: string; fallbackUsed?: boolean; }) {
  await logRequestMetric({
    ts: Date.now(),
    service: params.provider,
    kind: 'generation',
    status: params.status,
    ok: params.ok,
    durationMs: params.durationMs,
    query: params.query,
    mode: params.mode,
    errorMessage: params.errorMessage,
    fallbackUsed: params.fallbackUsed
  })
}

export async function logFallback(params: { from: string; to: string; reason: string; query: string; originalStatus?: number; message?: string; }) {
  await logFallbackMetric({
    ts: Date.now(),
    service: 'mcp',
    kind: 'fallback',
    from: params.from,
    to: params.to,
    reason: params.reason,
    query: params.query,
    originalStatus: params.originalStatus,
    message: params.message
  })
}

// Simple summarizer (client usage via server action / API route)
export async function fetchRecentCounts(): Promise<{ requests: number; fallbacks: number }> {
  if (!hasPostgres()) return { requests: 0, fallbacks: 0 }
  try {
    await ensureMetricsTables()
    const req = await pgQuery<{ count: string }>('SELECT COUNT(*)::text as count FROM rag_requests')
    const fb = await pgQuery<{ count: string }>('SELECT COUNT(*)::text as count FROM rag_fallbacks')
    return { requests: parseInt(req.rows[0]?.count || '0', 10), fallbacks: parseInt(fb.rows[0]?.count || '0', 10) }
  } catch (e) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Postgres count fetch failed:', e)
    return { requests: 0, fallbacks: 0 }
  }
}

export async function fetchRecentSamples(limit = 20): Promise<{ requests: any[]; fallbacks: any[] }> {
  if (!hasPostgres()) return { requests: [], fallbacks: [] }
  try {
    await ensureMetricsTables()
    const req = await pgQuery<any>(`SELECT * FROM rag_requests ORDER BY ts DESC LIMIT ${limit}`)
    const fb = await pgQuery<any>(`SELECT * FROM rag_fallbacks ORDER BY ts DESC LIMIT ${limit}`)
    return { requests: req.rows, fallbacks: fb.rows }
  } catch (e) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Postgres sample fetch failed:', e)
    return { requests: [], fallbacks: [] }
  }
}

export async function fetchCountsSince(sinceTs: number): Promise<{ total: number; ok: number; err: number }> {
  if (!hasPostgres()) return { total: 0, ok: 0, err: 0 }
  try {
    await ensureMetricsTables()
    const res = await pgQuery<{ total: string; ok: string }>(
      `SELECT COUNT(*)::text AS total,
              COALESCE(SUM(CASE WHEN ok THEN 1 ELSE 0 END),0)::text AS ok
       FROM rag_requests
       WHERE ts >= $1`,
      [sinceTs]
    )
    const total = parseInt(res.rows[0]?.total || '0', 10)
    const ok = parseInt(res.rows[0]?.ok || '0', 10)
    const err = Math.max(0, total - ok)
    return { total, ok, err }
  } catch (e) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Postgres 24h count fetch failed:', e)
    return { total: 0, ok: 0, err: 0 }
  }
}
