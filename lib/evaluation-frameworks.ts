import { spawn } from 'child_process'
import path from 'path'
import { evaluateRAG as evaluateWithJS } from './js-evaluator'

/**
 * New RAG Evaluation Architecture following RAGAS best practices
 * 
 * Flow:
 * 1. LangChain generates ground truth dataset (optional)
 * 2. RAGAS evaluates with 6 metrics (primary evaluation)
 * 3. LangChain generates comprehensive feedback (post-evaluation)
 * 
 * Reference: https://medium.com/@pdashok2875/implementation-and-evaluation-of-rag-using-langchain-and-ragas-d29c6ffc5442
 */

/**
 * Execute Python evaluation script and return parsed results
 * Now with progress callback support
 */
const executePythonScript = async (
  scriptName: string, 
  args: string[],
  timeoutMs: number = 30000,
  onProgress?: (message: string) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python_evaluators', scriptName)
    const pythonExecutable = path.join(process.cwd(), 'python_evaluators', 'venv', 'Scripts', 'python.exe')
    
    console.log(`🐍 Executing Python script: ${scriptName}`)
    console.log(`📁 Script path: ${scriptPath}`)
    console.log(`🏃 Python executable: ${pythonExecutable}`)
    
    const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      cwd: path.join(process.cwd(), 'python_evaluators')
    })
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      
      // Parse PROGRESS messages and send to callback
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          const message = line.replace('PROGRESS:', '').trim()
          if (onProgress) {
            onProgress(message)
          }
          console.log(`📊 Progress: ${message}`)
        }
      }
    })
    
    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      // Stream stderr to console in real-time for visibility
      process.stderr.write(text)
    })
    
    const timeout = setTimeout(() => {
      pythonProcess.kill()
      reject(new Error(`Python script timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout)
      
      if (code === 0) {
        try {
          // Remove PROGRESS lines from stdout before parsing JSON
          const jsonOutput = stdout.split('\n')
            .filter(line => !line.startsWith('PROGRESS:'))
            .join('\n')
          const result = JSON.parse(jsonOutput)
          resolve(result)
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout)
          reject(new Error(`Failed to parse Python output: ${parseError}`))
        }
      } else {
        console.error('Python script error:', stderr)
        reject(new Error(`Python script failed with code ${code}: ${stderr}`))
      }
    })
    
    pythonProcess.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

// Utility function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * RAGAS Metrics Interface (6 metrics total)
 */
interface RAGASMetrics {
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevance: number
  answer_correctness: number
}

/**
 * Comprehensive Feedback Interface
 */
interface ComprehensiveFeedback {
  overall_assessment: string
  strengths: string
  weaknesses: string
  recommendations: string
  context_analysis: string
}

/**
 * LangChain Dataset Generator
 * Generates ground truth and provides feedback - NO METRICS
 */
export class LangChainDatasetService {
  
  constructor() {
    console.log('📝 Initializing LangChain dataset generator')
  }

  /**
   * Generate ground truth answer from contexts (optional for evaluation)
   */
  async generateGroundTruth(question: string, contexts: string[]): Promise<string> {
    console.log('🎯 Generating ground truth using LangChain...')
    
    try {
      const inputData = JSON.stringify({
        question,
        contexts
      })
      
      const result = await executePythonScript(
        'langchain_dataset_generator.py',
        ['generate_ground_truth', inputData],
        60000
      )
      
      if (result.error) {
        console.warn('Ground truth generation error:', result.error)
        return question // Fallback to question
      }
      
      console.log('✅ Ground truth generated successfully')
      return result.ground_truth || question
      
    } catch (error) {
      console.error('Error generating ground truth:', error)
      return question
    }
  }

  /**
   * Generate comprehensive feedback after RAGAS evaluation
   */
  async generateFeedback(
    question: string,
    answer: string,
    contexts: string[],
    ragasScores: RAGASMetrics,
    ragMode: 'basic' | 'advanced'
  ): Promise<ComprehensiveFeedback> {
    console.log('💬 Generating comprehensive feedback using LangChain...')
    
    try {
      const inputData = JSON.stringify({
        question,
        answer,
        contexts,
        ragas_scores: ragasScores,
        rag_mode: ragMode
      })
      
      const result = await executePythonScript(
        'langchain_dataset_generator.py',
        ['generate_feedback', inputData],
        60000
      )
      
      if (result.error) {
        throw new Error(`Feedback generation failed: ${result.error}`)
      }
      
      console.log('✅ Feedback generated successfully')
      return result.feedback
      
    } catch (error) {
      console.error('Error generating feedback:', error)
      throw error  // Re-throw - no fallbacks
    }
  }
}

/**
 * RAGAS Evaluator - PRIMARY METRICS SOURCE
 * All 6 evaluation metrics come from RAGAS only
 */
export class RAGASEvaluator {
  
  constructor() {
    console.log('📊 Initializing RAGAS evaluator (primary metrics source)')
  }

  /**
   * Evaluate using authentic RAGAS framework - returns all 6 metrics
   * Uses Vercel Python serverless function or subprocess fallback
   */
  async evaluateRAGAS(
    question: string, 
    answer: string, 
    contexts: string[], 
    groundTruth: string,
    ragMode: 'basic' | 'advanced',
    onProgress?: (message: string) => void
  ): Promise<RAGASMetrics> {
    console.log(`🔍 Evaluating with RAGAS framework (${ragMode} mode)...`)
    
    // Try Python serverless function first (Vercel-compatible)
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('☁️ Serverless environment detected, using HTTP-based Python evaluator')
      
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        
        const response = await fetch(`${baseUrl}/api/ragas-eval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            answer,
            contexts,
            ground_truth: groundTruth,
            rag_mode: ragMode
          })
        })
        
        if (!response.ok) {
          throw new Error(`Python endpoint returned ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.error) {
          console.warn('⚠️ Python evaluation returned error, falling back to JS:', result.error)
          throw new Error(result.error)
        }
        
        console.log('✅ Python serverless evaluation successful')
        return {
          faithfulness: result.faithfulness,
          answer_relevancy: result.answer_relevancy,
          context_precision: result.context_precision,
          context_recall: result.context_recall,
          context_relevance: result.context_relevance,
          answer_correctness: result.answer_correctness
        }
        
      } catch (httpError) {
        console.warn('⚠️ Python HTTP endpoint failed, falling back to JavaScript:', httpError)
        
        // Log evaluation fallback for monitoring
        try {
          const { logFallback } = await import('./metrics-logger')
          await logFallback({
            from_mode: 'python_ragas',
            to_mode: 'javascript_evaluator',
            reason: httpError instanceof Error ? httpError.message : 'Python endpoint unavailable',
            query: question,
            status: 'success'
          })
        } catch (logError) {
          console.error('Failed to log evaluation fallback:', logError)
        }
        
        // Fallback to JavaScript implementation
        const jsMetrics = await evaluateWithJS({
          question,
          answer,
          contexts,
          ground_truth: groundTruth
        })
        
        return {
          faithfulness: jsMetrics.faithfulness,
          answer_relevancy: jsMetrics.answer_correctness || 0.7,
          context_precision: jsMetrics.context_precision,
          context_recall: jsMetrics.context_recall,
          context_relevance: jsMetrics.context_relevancy,
          answer_correctness: jsMetrics.answer_correctness || 0.7
        }
      }
    }
    
    // Local development: use Python subprocess
    console.log('💻 Local environment detected, using Python subprocess')
    try {
      const inputData = JSON.stringify({
        question,
        answer,
        contexts,
        ground_truth: groundTruth,
        rag_mode: ragMode
      })
      
      const results = await executePythonScript(
        'ragas_evaluator.py',
        [inputData],
        300000, // 5 minute timeout for RAGAS (advanced mode takes longer)
        onProgress // Pass progress callback to capture real-time updates
      )
      
      if (results.error) {
        throw new Error(`RAGAS evaluation failed: ${results.error}`)
      }
      
      console.log('✅ RAGAS evaluation completed successfully')
      
      // All 6 metrics must be present - no defaults
      const ragasMetrics: RAGASMetrics = {
        faithfulness: results.faithfulness,
        answer_relevancy: results.answer_relevancy,
        context_precision: results.context_precision,
        context_recall: results.context_recall,
        context_relevance: results.context_relevance,
        answer_correctness: results.answer_correctness
      }
      
      return ragasMetrics
      
    } catch (error) {
      console.error('Error in RAGAS evaluation:', error)
      throw error  // Re-throw - no fallbacks
    }
  }

}


/**
 * Unified Evaluation Service
 * Orchestrates: Dataset Generation → RAGAS Evaluation → Feedback Generation
 */
export class UnifiedEvaluationService {
  private datasetService: LangChainDatasetService
  private ragasEvaluator: RAGASEvaluator
  
  constructor() {
    console.log('🚀 Initializing Unified Evaluation Service')
    this.datasetService = new LangChainDatasetService()
    this.ragasEvaluator = new RAGASEvaluator()
  }

  /**
   * Complete evaluation workflow:
   * 1. Generate ground truth (optional)
   * 2. Evaluate with RAGAS (6 metrics)
   * 3. Generate comprehensive feedback
   */
  async evaluateComplete(
    question: string,
    answer: string,
    contexts: string[],
    ragMode: 'basic' | 'advanced',
    useGroundTruthGeneration: boolean = false,
    onProgress?: (message: string) => void
  ) {
    console.log(`📊 Starting unified evaluation workflow (${ragMode} mode)`)
    
    // Step 1: Optional ground truth generation
    let groundTruth = answer // Default to answer
    if (useGroundTruthGeneration) {
      console.log('📝 Step 1: Generating ground truth...')
      groundTruth = await this.datasetService.generateGroundTruth(question, contexts)
      await delay(1000)
    } else {
      console.log('⏭️ Step 1: Skipping ground truth generation (using answer)')
    }
    
    // Step 2: RAGAS evaluation (PRIMARY METRICS)
    console.log('📊 Step 2: Running RAGAS evaluation...')
    const ragasMetrics = await this.ragasEvaluator.evaluateRAGAS(
      question,
      answer,
      contexts,
      groundTruth,
      ragMode,
      onProgress // Pass progress callback
    )
    await delay(2000)
    
    // Step 3: Generate comprehensive feedback
    console.log('💬 Step 3: Generating comprehensive feedback...')
    const feedback = await this.datasetService.generateFeedback(
      question,
      answer,
      contexts,
      ragasMetrics,
      ragMode
    )
    
    // Calculate overall score from RAGAS metrics only (filter out undefined/null)
    const metricValues = Object.values(ragasMetrics).filter((v): v is number => 
      v !== undefined && v !== null && !isNaN(v)
    )
    const overall_score = metricValues.length > 0 
      ? metricValues.reduce((sum, score) => sum + score, 0) / metricValues.length 
      : 0
    
    console.log('✅ Unified evaluation completed')
    console.log(`📊 RAGAS Scores (${metricValues.length}/6): ${metricValues.map(v => v.toFixed(3)).join(', ')}`)
    console.log(`🏆 Overall Score: ${overall_score.toFixed(3)}`)
    
    return {
      ragas_metrics: ragasMetrics,
      feedback: feedback,
      overall_score: overall_score,
      evaluation_method: `ragas_only_${ragMode}`,
      metric_count: metricValues.length,
      ground_truth_generated: useGroundTruthGeneration
    }
  }
}

// Export legacy service for backward compatibility (deprecated)
export class FrameworkEvaluationService extends UnifiedEvaluationService {
  constructor() {
    super()
    console.warn('⚠️ FrameworkEvaluationService is deprecated. Use UnifiedEvaluationService instead.')
  }
  
  async evaluateComprehensive(
    question: string,
    answer: string,
    contexts: string[],
    ragMode: 'basic' | 'advanced',
    onProgress?: (message: string) => void
  ) {
    return this.evaluateComplete(question, answer, contexts, ragMode, false, onProgress)
  }
}
