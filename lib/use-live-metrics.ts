'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface RequestRow {
  id: number
  ts: number
  service: string
  kind: string
  status: number
  ok: boolean
  duration_ms?: number | null
  endpoint?: string | null
  query?: string | null
  error_message?: string | null
  fallback_used?: boolean
  mode?: string | null
}

export interface FallbackRow {
  id: number
  ts: number
  service: string
  kind: string
  from_mode: string
  to_mode: string
  reason: string
  original_status?: number | null
  message?: string | null
  query?: string | null
}

export interface LiveMetricsState {
  requests: RequestRow[]
  fallbacks: FallbackRow[]
  totalCounts: { requests: number; fallbacks: number }
  backend: string
  loggingEnabled: boolean
  lastUpdated: number
  counts24h?: { total: number; ok: number; err: number }
}

/**
 * useLiveMetrics: resilient polling with jitter and backoff
 */
export function useLiveMetrics(options: { auto?: boolean; initial?: boolean; pollMs?: number } = {}) {
  const { auto = false, initial = true, pollMs = 5000 } = options
  const [state, setState] = useState<LiveMetricsState>({
    requests: [],
    fallbacks: [],
    totalCounts: { requests: 0, fallbacks: 0 },
    backend: 'none',
    loggingEnabled: false,
    lastUpdated: 0,
    counts24h: { total: 0, ok: 0, err: 0 },
  })

  const backoffRef = useRef(0)
  const inFlightRef = useRef(false)
  const seenIds = useRef<{ req: Set<number>; fb: Set<number> }>({ req: new Set(), fb: new Set() })
  const [updating, setUpdating] = useState(false)

  const fetchOnce = useCallback(async () => {
    try {
      if (inFlightRef.current) return
      inFlightRef.current = true
      setUpdating(true)
      const res = await fetch('/api/metrics/health', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Health fetch failed: ${res.status}`)
      const json = await res.json()
      const { counts, samples, backend, loggingEnabled, counts24h } = json

      const newReqs: RequestRow[] = (samples?.requests || [])
      const newFbs: FallbackRow[] = (samples?.fallbacks || [])

      // Merge into a rolling buffer (max 500)
      const mergedReqs = [...state.requests]
      let addedReq = 0
      for (const r of newReqs) {
        if (!seenIds.current.req.has(r.id)) {
          seenIds.current.req.add(r.id)
          mergedReqs.unshift(r)
          addedReq++
        }
      }
      const mergedFbs = [...state.fallbacks]
      let addedFb = 0
      for (const f of newFbs) {
        if (!seenIds.current.fb.has(f.id)) {
          seenIds.current.fb.add(f.id)
          mergedFbs.unshift(f)
          addedFb++
        }
      }

      // Trim buffers
      if (mergedReqs.length > 500) mergedReqs.length = 500
      if (mergedFbs.length > 500) mergedFbs.length = 500

      const sortedReqs = mergedReqs.sort((a, b) => b.ts - a.ts)
      const sortedFbs = mergedFbs.sort((a, b) => b.ts - a.ts)

      const countsObj = counts || { requests: 0, fallbacks: 0 }
      const countsChanged = (
        countsObj.requests !== state.totalCounts.requests ||
        countsObj.fallbacks !== state.totalCounts.fallbacks
      )
      const metaChanged = (backend || 'none') !== state.backend || (!!loggingEnabled) !== state.loggingEnabled
      const dayChanged = (
        (counts24h?.total || 0) !== (state.counts24h?.total || 0) ||
        (counts24h?.ok || 0) !== (state.counts24h?.ok || 0) ||
        (counts24h?.err || 0) !== (state.counts24h?.err || 0)
      )

      const hasChanges = addedReq > 0 || addedFb > 0 || countsChanged || metaChanged || dayChanged

      if (hasChanges) {
        setState({
          requests: sortedReqs,
          fallbacks: sortedFbs,
          totalCounts: countsObj,
          backend: backend || 'none',
          loggingEnabled: !!loggingEnabled,
          lastUpdated: Date.now(),
          counts24h: counts24h || { total: 0, ok: 0, err: 0 },
        })
      }

      // Reset backoff on success
      backoffRef.current = 0
    } catch (e) {
      // Exponential backoff up to 1 minute
      backoffRef.current = Math.min(backoffRef.current ? backoffRef.current * 2 : pollMs, 60000)
      // Keep last state; next tick will try again with backoff
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.warn('Live metrics fetch error:', e)
    }
    finally {
      inFlightRef.current = false
      setUpdating(false)
    }
  }, [pollMs, state.requests, state.fallbacks, state.totalCounts, state.backend, state.loggingEnabled])

  // Initial one-time fetch (on refresh/mount)
  useEffect(() => {
    if (initial) {
      fetchOnce()
    }
  }, [initial, fetchOnce])

  // Optional auto-polling if explicitly enabled
  useEffect(() => {
    if (!auto) return
    let cancelled = false
    let timer: NodeJS.Timeout | null = null
    const tick = async () => {
      if (cancelled) return
      await fetchOnce()
      const jitter = Math.floor(Math.random() * 500)
      const next = pollMs + backoffRef.current + jitter
      timer = setTimeout(tick, next)
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [auto, pollMs, fetchOnce])

  const update = useCallback(async () => {
    // prevent overlapping updates; 1 update per click
    if (inFlightRef.current) return
    await fetchOnce()
  }, [fetchOnce])

  return { ...state, updating, update }
}

export function aggregateByMinute(requests: RequestRow[], minutes = 10) {
  const now = Date.now()
  const start = now - minutes * 60 * 1000
  const filtered = requests.filter(r => r.ts >= start)
  const bucketMs = 60 * 1000
  const buckets: Record<number, { ts: number; total: number; ok: number; err: number; byService: Record<string, number> }> = {}
  for (const r of filtered) {
    const bucket = Math.floor(r.ts / bucketMs) * bucketMs
    if (!buckets[bucket]) buckets[bucket] = { ts: bucket, total: 0, ok: 0, err: 0, byService: {} }
    const b = buckets[bucket]
    b.total += 1
    if (r.ok) b.ok += 1; else b.err += 1
    b.byService[r.service] = (b.byService[r.service] || 0) + 1
  }
  return Object.values(buckets).sort((a, b) => a.ts - b.ts)
}

export function summarizeLatency(requests: RequestRow[]) {
  const groups = new Map<string, number[]>()
  for (const r of requests) {
    if (typeof r.duration_ms !== 'number') continue
    const arr = groups.get(r.service) || []
    arr.push(r.duration_ms)
    groups.set(r.service, arr)
  }
  const summary: Record<string, { avg: number; p95: number; p99: number; count: number }> = {}
  for (const [svc, arr] of groups) {
    const sorted = arr.slice().sort((a, b) => a - b)
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
    summary[svc] = { avg, p95: p(0.95) || 0, p99: p(0.99) || 0, count: arr.length }
  }
  return summary
}
