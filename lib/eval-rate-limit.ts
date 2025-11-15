import { NextRequest, NextResponse } from 'next/server'

type LimitRecord = {
  lastUseAt: number | null
  usesToday: number
  lastDate: string | null
}

// Global in-memory store (persists across requests within the same process)
const globalAny = globalThis as any
if (!globalAny.__EVAL_RATE_LIMITS__) {
  globalAny.__EVAL_RATE_LIMITS__ = new Map<string, LimitRecord>()
}
const LIMITS: Map<string, LimitRecord> = globalAny.__EVAL_RATE_LIMITS__

// Track group sessions so multiple calls in a single evaluation session don't double-charge
type SessionRecord = { seenAt: number }
if (!globalAny.__EVAL_SESSION_GROUPS__) {
  globalAny.__EVAL_SESSION_GROUPS__ = new Map<string, SessionRecord>()
}
const SESSION_GROUPS: Map<string, SessionRecord> = globalAny.__EVAL_SESSION_GROUPS__
const SESSION_TTL_MS = 15 * 60 * 1000 // 15 minutes TTL for a session group

function getTodayKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function secondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

export type AuthInfo = {
  username: string
  token?: string | null
}

export function getAuthFromRequest(req: NextRequest): AuthInfo | null {
  const headers = req.headers
  const username = headers.get('x-puter-username') || headers.get('x-puter-user')
  const authHeader = headers.get('authorization') || headers.get('x-puter-auth') || null
  if (!username) return null
  return { username, token: authHeader }
}

export type LimitCheck =
  | { allowed: true; retryAfterSeconds?: number; remainingToday: number }
  | { allowed: false; status: number; message: string; retryAfterSeconds?: number; remainingToday: number }

// Policy:
// - Require Puter user header
// - Enforce: max 2 evaluations per calendar day per user
// - Additionally enforce a minimum 6-hour cooldown between runs
export function checkAndConsumeLimit(user: string): LimitCheck {
  const now = Date.now()
  const today = getTodayKey()
  const cooldownMs = 6 * 60 * 60 * 1000 // 6 hours
  const dailyLimit = 2

  let rec = LIMITS.get(user)
  if (!rec) {
    rec = { lastUseAt: null, usesToday: 0, lastDate: null }
    LIMITS.set(user, rec)
  }

  // Reset daily count if date changed
  if (rec.lastDate !== today) {
    rec.usesToday = 0
    rec.lastDate = today
  }

  // Enforce 6-hour cooldown since last use
  if (rec.lastUseAt && now - rec.lastUseAt < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - (now - rec.lastUseAt)) / 1000)
    return {
      allowed: false,
      status: 429,
      message: `Evaluation cooldown active. Please wait ~${Math.ceil(retryAfterSeconds / 60)} minutes before trying again.`,
      retryAfterSeconds,
      remainingToday: Math.max(0, dailyLimit - rec.usesToday)
    }
  }

  // Enforce per-day cap
  if (rec.usesToday >= dailyLimit) {
    const retryAfterSeconds = secondsUntilMidnight()
    return {
      allowed: false,
      status: 429,
      message: 'Daily evaluation limit reached (2 per day). Try again after midnight.',
      retryAfterSeconds,
      remainingToday: 0
    }
  }

  // Consume a use
  rec.usesToday += 1
  rec.lastUseAt = now
  LIMITS.set(user, rec)

  return {
    allowed: true,
    remainingToday: Math.max(0, dailyLimit - rec.usesToday)
  }
}

export function requireAuthAndRateLimit(req: NextRequest): NextResponse | null {
  const auth = getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Sign in with Puter to run evaluations.' },
      { status: 401 }
    )
  }
  // Session grouping: allow two internal calls (Basic + Advanced) within one evaluation session
  const headers = req.headers
  const groupId =
    headers.get('x-eval-group-id') ||
    headers.get('x-eval-session-group-id') ||
    headers.get('x-eval-session-id') ||
    null

  if (groupId) {
    const key = `${auth.username}::${groupId}`
    const rec = SESSION_GROUPS.get(key)
    const now = Date.now()
    if (rec && now - rec.seenAt < SESSION_TTL_MS) {
      // Already charged this session recently; allow without consuming
      return null
    }
    // Not seen (or expired) → perform consumption and record
    const check = checkAndConsumeLimit(auth.username)
    if (!check.allowed) {
      const respHeaders: Record<string, string> = {}
      if (check.retryAfterSeconds !== undefined) respHeaders['Retry-After'] = String(check.retryAfterSeconds)
      respHeaders['X-Remaining-Today'] = String(check.remainingToday)
      return new NextResponse(
        JSON.stringify({ error: 'Rate limited', message: check.message, retryAfterSeconds: check.retryAfterSeconds, remainingToday: check.remainingToday }),
        { status: check.status, headers: respHeaders }
      )
    }
    SESSION_GROUPS.set(key, { seenAt: now })
    return null
  }

  // No group id provided → fall back to per-call consumption
  const check = checkAndConsumeLimit(auth.username)
  if (!check.allowed) {
    const headers: Record<string, string> = {}
    if (check.retryAfterSeconds !== undefined) headers['Retry-After'] = String(check.retryAfterSeconds)
    headers['X-Remaining-Today'] = String(check.remainingToday)
    return new NextResponse(
      JSON.stringify({ error: 'Rate limited', message: check.message, retryAfterSeconds: check.retryAfterSeconds, remainingToday: check.remainingToday }),
      { status: check.status, headers }
    )
  }
  return null
}
