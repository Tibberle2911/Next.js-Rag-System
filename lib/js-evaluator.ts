/**
 * Pure JavaScript/TypeScript RAG Evaluator
 * Fallback evaluator for serverless environments where Python subprocess spawning isn't available
 * Implements RAGAS-inspired metrics using token overlap and similarity algorithms
 */

export interface RAGASMetrics {
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevance: number
  answer_correctness: number
}

/**
 * Simple tokenization helper
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0)
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1)
  const set2 = new Set(tokens2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Calculate token overlap ratio
 */
function tokenOverlap(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1)
  const set2 = new Set(tokens2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  
  return set1.size === 0 ? 0 : intersection.size / set1.size
}

/**
 * Faithfulness: How well the answer is grounded in the context
 * Measures if answer claims can be verified from context
 */
function calculateFaithfulness(answer: string, contexts: string[]): number {
  const answerTokens = tokenize(answer)
  const contextText = contexts.join(' ')
  const contextTokens = tokenize(contextText)
  
  // Simple approximation: token overlap between answer and context
  return tokenOverlap(answerTokens, contextTokens)
}

/**
 * Context Precision: How relevant are the retrieved contexts
 * Higher when relevant contexts appear earlier in the list
 */
function calculateContextPrecision(contexts: string[], groundTruth: string): number {
  if (contexts.length === 0) return 0
  
  const gtTokens = tokenize(groundTruth)
  let precisionSum = 0
  
  contexts.forEach((context, idx) => {
    const contextTokens = tokenize(context)
    const relevance = jaccardSimilarity(contextTokens, gtTokens)
    // Weight earlier contexts more heavily
    const weight = 1 / (idx + 1)
    precisionSum += relevance * weight
  })
  
  // Normalize by sum of weights
  const weightSum = contexts.reduce((sum, _, idx) => sum + 1 / (idx + 1), 0)
  return precisionSum / weightSum
}

/**
 * Context Recall: How much of the ground truth is covered by contexts
 */
function calculateContextRecall(contexts: string[], groundTruth: string): number {
  const gtTokens = tokenize(groundTruth)
  const contextText = contexts.join(' ')
  const contextTokens = tokenize(contextText)
  
  return tokenOverlap(gtTokens, contextTokens)
}

/**
 * Context Relevancy: How relevant is the context to the question
 */
function calculateContextRelevancy(question: string, contexts: string[]): number {
  const questionTokens = tokenize(question)
  const contextText = contexts.join(' ')
  const contextTokens = tokenize(contextText)
  
  return jaccardSimilarity(questionTokens, contextTokens)
}

/**
 * Answer Correctness: How similar is the answer to ground truth
 */
function calculateAnswerCorrectness(answer: string, groundTruth: string): number {
  const answerTokens = tokenize(answer)
  const gtTokens = tokenize(groundTruth)
  
  return jaccardSimilarity(answerTokens, gtTokens)
}

/**
 * Check if Python subprocess execution is available
 */
export function isPythonAvailable(): boolean {
  // In serverless environments, Python subprocess spawning isn't available
  if (typeof process !== 'undefined') {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
      return false
    }
  }
  
  // In browser, definitely not available
  if (typeof window !== 'undefined') {
    return false
  }
  
  return true
}

/**
 * Pure JavaScript RAG evaluation
 * Uses token-based similarity metrics as approximation of RAGAS metrics
 */
export async function evaluateRAG(params: {
  question: string
  answer: string
  contexts: string[]
  ground_truth?: string
}): Promise<RAGASMetrics> {
  const { question, answer, contexts, ground_truth } = params
  
  // Use answer as ground truth if not provided
  const gt = ground_truth || answer
  
  console.log('📊 Running JavaScript-based RAG evaluation...')
  
  // Calculate all metrics
  const faithfulness = calculateFaithfulness(answer, contexts)
  const context_precision = calculateContextPrecision(contexts, gt)
  const context_recall = calculateContextRecall(contexts, gt)
  const context_relevance = calculateContextRelevancy(question, contexts)
  const answer_correctness = calculateAnswerCorrectness(answer, gt)
  
  // Answer relevancy: combination of answer correctness and context relevance
  const answer_relevancy = (answer_correctness + context_relevance) / 2
  
  console.log('✅ JavaScript evaluation complete:', {
    faithfulness: faithfulness.toFixed(3),
    answer_relevancy: answer_relevancy.toFixed(3),
    context_precision: context_precision.toFixed(3),
    context_recall: context_recall.toFixed(3)
  })
  
  return {
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    context_relevance,
    answer_correctness
  }
}
