import { Pool } from '@neondatabase/serverless'

// Connection string preference order
const connectionString = process.env.DATABASE_URL 
  || process.env.POSTGRES_PRISMA_URL 
  || process.env.POSTGRES_URL 
  || ''

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    if (!connectionString) {
      throw new Error('No Postgres connection string (DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL) configured')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

export async function pgQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const p = getPool()
  const result = await p.query(text, params)
  return { rows: result.rows as T[] }
}

let tablesEnsured = false
export async function ensureMetricsTables() {
  if (tablesEnsured) return
  if (!connectionString) return
  try {
    await pgQuery(`CREATE TABLE IF NOT EXISTS rag_requests (
      id BIGSERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      service TEXT NOT NULL,
      kind TEXT NOT NULL,
      status INT NOT NULL,
      ok BOOLEAN NOT NULL,
      duration_ms INT,
      endpoint TEXT,
      query TEXT,
      error_message TEXT,
      fallback_used BOOLEAN,
      mode TEXT
    )`)
    await pgQuery(`CREATE TABLE IF NOT EXISTS rag_fallbacks (
      id BIGSERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      service TEXT NOT NULL,
      kind TEXT NOT NULL,
      from_mode TEXT NOT NULL,
      to_mode TEXT NOT NULL,
      reason TEXT NOT NULL,
      original_status INT,
      message TEXT,
      query TEXT
    )`)
    tablesEnsured = true
  } catch (e) {
    console.warn('Failed ensuring metrics tables:', e)
  }
}

export function hasPostgres(): boolean {
  return !!connectionString
}