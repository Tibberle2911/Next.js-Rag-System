// Centralized canonical name resolver
// Prefers client-safe NEXT_PUBLIC_CANONICAL_NAME, falls back to server CANONICAL_NAME
// Final fallback is the legacy hard-coded name.

const FALLBACK_NAME = "Tylor"

export function getCanonicalName(): string {
  if (typeof process !== 'undefined') {
    const clientVar = process.env.NEXT_PUBLIC_CANONICAL_NAME?.trim()
    if (clientVar) return clientVar
    const serverVar = process.env.CANONICAL_NAME?.trim()
    if (serverVar) return serverVar
  }
  // Browser-only environments without process: attempt window override
  if (typeof window !== 'undefined') {
    const winName = (window as any).__CANONICAL_NAME
    if (typeof winName === 'string' && winName.trim()) return winName.trim()
  }
  return FALLBACK_NAME
}

export function buildNameInstruction(name: string = getCanonicalName()): string {
  return `Always use the correct name: ${name}. If variants are used, respond with the canonical spelling.`
}
