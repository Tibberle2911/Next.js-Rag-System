import { NextRequest, NextResponse } from 'next/server'
import { ragQuery } from '@/app/actions'
import { FrameworkEvaluationService } from '@/lib/evaluation-frameworks'
import { requireAuthAndRateLimit } from '@/lib/eval-rate-limit'

interface TestCase {
  id: string
  question: string
  category: string
  difficulty: string
  description: string
}

interface EvaluationResult {
  answer: string
  generated_answer: string
  response_time: number
  num_contexts: number
  rag_mode: string
  question: string
  category: string
  difficulty: string
  techniques_used: string[]
  overall_score: number
  evaluation_method: string
  // RAGAS metrics (5 metrics with answer_relevancy now using Gemini)
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  answer_correctness: number
  // LangChain feedback (post-evaluation analysis)
  feedback?: {
    overall_assessment: string
    strengths: string
    weaknesses: string
    recommendations: string
    context_analysis: string
  }
  // Metrics breakdown for data visualization
  metrics_breakdown?: {
    ragas_scores: number[]
    total_metrics: number
    scoring_method: string
    mode_specific_adjustments: string
  }
}

async function evaluateAllMetrics(
  question: string,
  answer: string,
  contexts: string[],
  ragMode: 'basic' | 'advanced',
  sessionId?: string,
  progressUrl?: string
): Promise<{
  ragas_metrics: any
  feedback: any
  overall_score: number
  metrics_breakdown: {
    ragas_scores: number[]
    total_metrics: number
    scoring_method: string
  }
}> {
  const evaluationService = new FrameworkEvaluationService()
  
  console.log(`📊 Starting RAGAS-only evaluation for ${ragMode} mode...`)
  
  // Create progress callback to send updates to frontend
  const onProgress = async (message: string) => {
    console.log(`📊 Progress: ${message}`)
    
    // Send progress update to frontend if sessionId provided
    if (sessionId && progressUrl) {
      try {
        await fetch(progressUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            step: message
          })
        })
      } catch (error) {
        console.error('Failed to send progress update:', error)
      }
    }
  }
  
  const result = await evaluationService.evaluateComprehensive(question, answer, contexts, ragMode, onProgress)
  
  // Extract RAGAS metric scores (5 metrics including answer_relevancy, filter out undefined/null)
  const ragasScores = [
    result.ragas_metrics.faithfulness,
    result.ragas_metrics.answer_relevancy,
    result.ragas_metrics.context_precision,
    result.ragas_metrics.context_recall,
    result.ragas_metrics.context_relevance,
    result.ragas_metrics.answer_correctness
  ].filter((score): score is number => score !== undefined && score !== null && !isNaN(score))
  
  // Use overall score from result (already calculated by UnifiedEvaluationService)
  const overall_score = result.overall_score
  
  console.log(`✅ RAGAS evaluation completed with ${ragasScores.length}/5 metrics`)
  console.log(`📈 RAGAS scores: ${ragasScores.map(s => s.toFixed(3)).join(', ')}`)
  console.log(`🏆 Overall Score: ${overall_score.toFixed(3)} (average of ${ragasScores.length} metrics)`)
  console.log(`💬 Feedback: ${result.feedback ? 'Generated' : 'Not available'}`)
  
  return {
    ragas_metrics: result.ragas_metrics,
    feedback: result.feedback,
    overall_score,
    metrics_breakdown: {
      ragas_scores: ragasScores,
      total_metrics: ragasScores.length,
      scoring_method: result.evaluation_method || `ragas_only_${ragMode}`
    }
  }
}


export async function POST(request: NextRequest) {
  try {
    // Auth + rate limit gate
    const blocked = requireAuthAndRateLimit(request)
    if (blocked) return blocked

    const body = await request.json()
    const { testCase, ragMode, sessionId } = body

    if (!testCase || !ragMode) {
      return NextResponse.json(
        { error: 'Missing testCase or ragMode' },
        { status: 400 }
      )
    }

    console.log(`🎯 Starting ${ragMode} RAG evaluation for: "${testCase.question}"`)
    console.log(`📍 Session ID: ${sessionId || 'none'}`)

    const startTime = Date.now()

    // Get RAG response with proper configuration for advanced mode
    let ragResult;
    if (ragMode === 'advanced') {
      console.log('🧠 Using Advanced RAG with full configuration...')
      // Pass default advanced config to ensure all techniques are enabled
      ragResult = await ragQuery(testCase.question, ragMode as 'basic' | 'advanced', {
        useMultiQuery: true,
        useRagFusion: true,
        useDecomposition: false,
        useStepBack: false,
        useHyde: false,
        useQueryEnhancement: true,
        useInterviewFormatting: false, // Disable for evaluation to get raw context
        numMultiQueries: 5,
        rrrKValue: 60,
        fusionQueries: 4,
        maxSubQuestions: 3,
        hydeTemperature: 0.2,
        interviewType: 'general'
      })
    } else {
      console.log('📚 Using Basic RAG...')
      ragResult = await ragQuery(testCase.question, ragMode as 'basic' | 'advanced')
    }
    
    if (!ragResult.answer) {
      throw new Error(`No answer generated from ${ragMode} RAG`)
    }

    const responseTime = (Date.now() - startTime) / 1000
    
    // Log techniques used for advanced mode
    if (ragMode === 'advanced' && ragResult.metadata?.techniquesUsed) {
      console.log(`✨ Advanced techniques used: ${ragResult.metadata.techniquesUsed.join(', ')}`)
    }

    // Build contexts array from sources
    const contexts = ragResult.sources.map(s => s.content)

    // Build environment-aware progress URL
    const progressUrl = sessionId ? new URL('/api/evaluation/progress', request.url).toString() : undefined

    // Evaluate using RAGAS-only framework with progress tracking
    console.log('📊 Evaluating metrics using RAGAS framework...')
    const evaluationResult = await evaluateAllMetrics(
      testCase.question,
      ragResult.answer,
      contexts,
      ragMode as 'basic' | 'advanced',
      sessionId,
      progressUrl
    )

    const ragasMetrics = evaluationResult.ragas_metrics
    const feedback = evaluationResult.feedback
    const overall_score = evaluationResult.overall_score
    const metricsBreakdown = evaluationResult.metrics_breakdown

    console.log(`✅ RAGAS evaluation completed with overall score: ${overall_score.toFixed(3)}`)
    console.log(`📊 Mode: ${ragMode}, Total Metrics: ${metricsBreakdown.total_metrics}, Method: ${metricsBreakdown.scoring_method}`)

    // Build result in expected format (RAGAS-only with 5 metrics)
    const result: EvaluationResult = {
      answer: ragResult.answer,
      generated_answer: ragResult.answer,
      response_time: responseTime,
      num_contexts: ragResult.sources.length,
      rag_mode: ragMode,
      question: testCase.question,
      category: testCase.category,
      difficulty: testCase.difficulty,
      techniques_used: ragResult.metadata?.techniquesUsed || [],
      overall_score,
      evaluation_method: metricsBreakdown.scoring_method,
      
      // RAGAS metrics (6 metrics including answer_relevancy with Gemini)
      faithfulness: ragasMetrics.faithfulness,
      answer_relevancy: ragasMetrics.answer_relevancy,
      context_precision: ragasMetrics.context_precision,
      context_recall: ragasMetrics.context_recall,
      context_relevancy: ragasMetrics.context_relevance,
      answer_correctness: ragasMetrics.answer_correctness,

      // Feedback from LangChain (post-evaluation analysis)
      feedback: feedback,

      // Metrics breakdown for data visualization and analysis
      metrics_breakdown: {
        ragas_scores: metricsBreakdown.ragas_scores,
        total_metrics: metricsBreakdown.total_metrics,
        scoring_method: metricsBreakdown.scoring_method,
        mode_specific_adjustments: `RAGAS evaluation with 5 metrics in ${ragMode} mode (faithfulness, answer_relevancy, context_precision, context_recall, context_relevance, answer_correctness)`
      }
    }

    console.log('🎉 Evaluation completed successfully')
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      { 
        error: 'Evaluation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}