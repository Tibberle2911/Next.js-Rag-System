import { NextRequest, NextResponse } from 'next/server'

// In-memory store for evaluation progress (shared across requests)
const progressStore = new Map<string, {
  steps: string[]
  completed: boolean
  timestamp: number
}>()

// Track which steps have been sent to each client to avoid duplicates
const sentStepsTracker = new Map<string, Set<string>>()

// Clean up old progress data (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const [key, value] of progressStore.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      progressStore.delete(key)
      sentStepsTracker.delete(key) // Clean up sent steps tracker too
    }
  }
}, 60000) // Run cleanup every minute

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }
  
  const progress = progressStore.get(sessionId)
  
  if (!progress) {
    return NextResponse.json({ 
      steps: [], 
      completed: false,
      exists: false 
    })
  }
  
  // Get or create the set of already-sent steps for this session
  if (!sentStepsTracker.has(sessionId)) {
    sentStepsTracker.set(sessionId, new Set())
  }
  const sentSteps = sentStepsTracker.get(sessionId)!
  
  // Filter to only return NEW steps that haven't been sent yet
  const newSteps = progress.steps.filter(step => {
    if (sentSteps.has(step)) {
      return false // Already sent this step
    }
    sentSteps.add(step) // Mark as sent
    return true
  })
  
  // If evaluation is completed, clean up the tracker
  if (progress.completed) {
    sentStepsTracker.delete(sessionId)
  }
  
  return NextResponse.json({
    steps: newSteps, // Only return new steps
    completed: progress.completed,
    exists: true
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, step, completed } = body
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }
    
    const existing = progressStore.get(sessionId) || {
      steps: [],
      completed: false,
      timestamp: Date.now()
    }
    
    if (step) {
      existing.steps.push(step)
    }
    
    if (completed !== undefined) {
      existing.completed = completed
    }
    
    existing.timestamp = Date.now()
    progressStore.set(sessionId, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Progress update error:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

// Export the progress store for use in other API routes
export { progressStore }

