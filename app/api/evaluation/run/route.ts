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

const TEST_CASES: TestCase[] = [
  {
    id: "tc1",
    question: "Tell me about your experience with React and TypeScript",
    category: "skills",
    difficulty: "medium",
    description: "Technical skills assessment"
  },
  {
    id: "tc2", 
    question: "How do you approach system design for scalability?",
    category: "skills",
    difficulty: "hard",
    description: "System design methodology"
  },
  {
    id: "tc3",
    question: "Describe a time when you led a team",
    category: "experience",
    difficulty: "medium", 
    description: "Leadership experience"
  },
  {
    id: "tc4",
    question: "What technologies did you choose and why?",
    category: "projects",
    difficulty: "medium",
    description: "Technology decision making"
  },
  {
    id: "tc5",
    question: "What are your career goals?",
    category: "goals",
    difficulty: "easy",
    description: "Career aspirations"
  }
]

async function evaluateAllMetrics(
  question: string,
  answer: string,
  contexts: string[],
  ragMode: 'basic' | 'advanced'
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
  const result = await evaluationService.evaluateComprehensive(question, answer, contexts, ragMode)
  
  // Extract RAGAS metric scores (5 metrics - answer_relevancy removed due to Groq compatibility)
  const ragasScores = [
    result.ragas_metrics.faithfulness,
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
    // Auth + rate limit gate (batch run should also be limited)
    const blocked = requireAuthAndRateLimit(request)
    if (blocked) return blocked

    console.log('🚀 Starting batch RAG evaluation with framework-based metrics...')
    
    const results = []
    
    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i]
      console.log(`\n🎯 Evaluating test case ${i + 1}/${TEST_CASES.length}: "${testCase.question}"`)

      for (const ragMode of ['basic', 'advanced'] as const) {
        console.log(`\n📊 Testing ${ragMode} RAG mode...`)
        const startTime = Date.now()

        try {
          // Get RAG response
          const ragResult = await ragQuery(testCase.question, ragMode)
          
          if (!ragResult.answer) {
            throw new Error(`No answer generated from ${ragMode} RAG`)
          }

          const responseTime = (Date.now() - startTime) / 1000

          // Build contexts array from sources
          const contexts = ragResult.sources.map(s => s.content)

          // Evaluate using RAGAS-only framework
          console.log(`📋 Evaluating ${ragMode} response using RAGAS framework...`)
          const evaluationResult = await evaluateAllMetrics(testCase.question, ragResult.answer, contexts, ragMode)

          const ragasMetrics = evaluationResult.ragas_metrics
          const feedback = evaluationResult.feedback
          const overall_score = evaluationResult.overall_score
          const metricsBreakdown = evaluationResult.metrics_breakdown

          console.log(`✅ ${ragMode} evaluation completed with overall score: ${overall_score.toFixed(3)}`)

          // Build result with RAGAS metrics (5 metrics)
          const result = {
            testCase: testCase.id,
            question: testCase.question,
            category: testCase.category,
            difficulty: testCase.difficulty,
            description: testCase.description,
            rag_mode: ragMode,
            answer: ragResult.answer,
            generated_answer: ragResult.answer,
            response_time: responseTime,
            num_contexts: ragResult.sources.length,
            techniques_used: ragResult.metadata?.techniquesUsed || [],
            overall_score,
            evaluation_method: metricsBreakdown.scoring_method,

            // RAGAS metrics (5 metrics - answer_relevancy removed due to Groq compatibility)
            faithfulness: ragasMetrics.faithfulness,
            context_precision: ragasMetrics.context_precision,
            context_recall: ragasMetrics.context_recall,
            context_relevancy: ragasMetrics.context_relevance,
            answer_correctness: ragasMetrics.answer_correctness,

            // LangChain feedback (post-evaluation analysis)
            feedback: feedback,

            // Metrics breakdown for data visualization and analysis
            metrics_breakdown: {
              ragas_scores: metricsBreakdown.ragas_scores,
              total_metrics: metricsBreakdown.total_metrics,
              scoring_method: metricsBreakdown.scoring_method,
              mode_specific_adjustments: `RAGAS-only evaluation in ${ragMode} mode with comprehensive feedback`
            }
          }

          results.push(result)

          // Add delay between evaluations to prevent rate limiting
          console.log('⚙️ Adding delay to prevent rate limiting...')
          await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay

        } catch (error) {
          console.error(`❌ Error in ${ragMode} RAG evaluation:`, error)
          
          // Add error result
          results.push({
            testCase: testCase.id,
            question: testCase.question,
            category: testCase.category,
            difficulty: testCase.difficulty,
            description: testCase.description,
            rag_mode: ragMode,
            answer: '',
            generated_answer: '',
            response_time: 0,
            num_contexts: 0,
            techniques_used: [],
            overall_score: 0,
            evaluation_method: "framework_based_error",
            error: error instanceof Error ? error.message : 'Unknown error',
            
            // Zero scores for failed evaluation (5 RAGAS metrics)
            faithfulness: 0,
            context_precision: 0,
            context_recall: 0,
            context_relevancy: 0,
            answer_correctness: 0,
            
            metrics_breakdown: {
              ragas_scores: [0, 0, 0, 0, 0],
              total_metrics: 5,
              scoring_method: `${ragMode}_mode_error`,
              mode_specific_adjustments: `Error in ${ragMode} mode evaluation`
            }
          })
          
          // Add delay even for error cases to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay for errors
        }
      }
      
      // Add delay between test cases
      if (i < TEST_CASES.length - 1) {
        console.log('🔄 Pausing between test cases to prevent rate limiting...')
        await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay between test cases
      }
    }

    console.log(`\n🎉 Batch evaluation completed! Processed ${results.length} total evaluations`)
    console.log(`📊 Framework-based results: ${results.filter(r => r.evaluation_method === 'framework_based').length} successful, ${results.filter(r => r.evaluation_method === 'framework_based_error').length} errors`)

    return NextResponse.json({ 
      results,
      summary: {
        total_evaluations: results.length,
        successful_evaluations: results.filter(r => r.evaluation_method === 'framework_based').length,
        error_evaluations: results.filter(r => r.evaluation_method === 'framework_based_error').length,
        test_cases: TEST_CASES.length,
        rag_modes: ['basic', 'advanced'],
        metrics_per_evaluation: 5,
        evaluation_framework: 'RAGAS comprehensive framework (5 metrics)'
      }
    })

  } catch (error) {
    console.error('❌ Batch evaluation failed:', error)
    return NextResponse.json(
      { 
        error: 'Batch evaluation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}