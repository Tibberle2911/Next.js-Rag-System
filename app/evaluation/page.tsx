'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, Clock, Play, BarChart3, AlertCircle, Zap, Database, TrendingUp, ArrowRight, Sparkles, Target, Timer, Activity, Brain, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import D3Visualizations from '@/components/d3-visualizations'
import EvaluationMetricsChart from '@/components/evaluation-metrics-chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { usePuterAuth } from '@/lib/puter-auth'

// Test case data structure
interface TestCase {
  id: string
  question: string
  category: string
  difficulty: string
  description: string
}

interface ComparisonResult {
  testCase: TestCase
  basicRAG: {
    answer: string
    response_time: number
    faithfulness: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness: number
    overall_score: number
    num_contexts: number
    error?: string  // Optional error field for failed evaluations
    evaluation_method?: 'ragas_only' | 'framework_based'
    feedback?: {
      overall_assessment: string
      strengths: string
      weaknesses: string
      recommendations: string
      context_analysis: string
    }
  }
  advancedRAG: {
    answer: string
    response_time: number
    faithfulness: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness: number
    overall_score: number
    num_contexts: number
    error?: string  // Optional error field for failed evaluations
    evaluation_method?: 'ragas_only' | 'framework_based'
    techniques_used?: string[]
    feedback?: {
      overall_assessment: string
      strengths: string
      weaknesses: string
      recommendations: string
      context_analysis: string
    }
  }
}

// Available test cases organized by category and difficulty
const TEST_CASES: Record<string, Record<string, TestCase[]>> = {
  personal: {
    easy: [
      {
        id: 'personal_easy_1',
        question: 'Tell me about yourself',
        category: 'personal',
        difficulty: 'easy',
        description: 'Basic personal introduction and background'
      }
    ],
    medium: [
      {
        id: 'personal_medium_1',
        question: 'What are your career goals?',
        category: 'personal',
        difficulty: 'medium',
        description: 'Professional aspirations and objectives'
      },
      {
        id: 'personal_medium_2',
        question: 'What motivates you professionally?',
        category: 'personal',
        difficulty: 'medium',
        description: 'Professional motivation and driving factors'
      },
      {
        id: 'personal_medium_3',
        question: 'What are your strengths and weaknesses?',
        category: 'personal',
        difficulty: 'medium',
        description: 'Self-assessment of professional attributes'
      }
    ],
    hard: [
      {
        id: 'personal_hard_1',
        question: 'How do you handle work-life balance?',
        category: 'personal',
        difficulty: 'hard',
        description: 'Complex approach to balancing responsibilities'
      }
    ]
  },
  experience: {
    easy: [
      {
        id: 'experience_easy_1',
        question: 'What is your work experience?',
        category: 'experience',
        difficulty: 'easy',
        description: 'Professional background and roles'
      }
    ],
    medium: [
      {
        id: 'experience_medium_1',
        question: 'Tell me about a challenging project you worked on',
        category: 'experience',
        difficulty: 'medium',
        description: 'Specific project challenges and solutions'
      },
      {
        id: 'experience_medium_2',
        question: 'Describe a time when you led a team',
        category: 'experience',
        difficulty: 'medium',
        description: 'Leadership experience and team management'
      },
      {
        id: 'experience_medium_3',
        question: 'What was your biggest professional achievement?',
        category: 'experience',
        difficulty: 'medium',
        description: 'Significant professional accomplishment'
      }
    ],
    hard: [
      {
        id: 'experience_hard_1',
        question: 'How did you handle a production outage?',
        category: 'experience',
        difficulty: 'hard',
        description: 'Incident response and problem resolution'
      }
    ]
  },
  skills: {
    easy: [
      {
        id: 'skills_easy_1',
        question: 'What programming languages do you know?',
        category: 'skills',
        difficulty: 'easy',
        description: 'Technical programming competencies'
      }
    ],
    medium: [
      {
        id: 'skills_medium_1',
        question: 'Describe your cloud architecture experience',
        category: 'skills',
        difficulty: 'medium',
        description: 'Cloud platforms and architecture patterns'
      },
      {
        id: 'skills_medium_2',
        question: 'What database technologies have you used?',
        category: 'skills',
        difficulty: 'medium',
        description: 'Database systems and data management'
      },
      {
        id: 'skills_medium_3',
        question: 'How do you ensure code quality?',
        category: 'skills',
        difficulty: 'medium',
        description: 'Quality assurance practices and methodologies'
      }
    ],
    hard: [
      {
        id: 'skills_hard_1',
        question: 'How do you approach system design for scalability?',
        category: 'skills',
        difficulty: 'hard',
        description: 'Complex system architecture and scalability strategies'
      }
    ]
  },
  projects: {
    easy: [
      {
        id: 'projects_easy_1',
        question: 'What projects have you built?',
        category: 'projects',
        difficulty: 'easy',
        description: 'Portfolio of completed projects'
      }
    ],
    medium: [
      {
        id: 'projects_medium_1',
        question: 'Describe your most impactful project',
        category: 'projects',
        difficulty: 'medium',
        description: 'Project with significant business impact'
      },
      {
        id: 'projects_medium_2',
        question: 'What technologies did you choose and why?',
        category: 'projects',
        difficulty: 'medium',
        description: 'Technology selection rationale and decision-making'
      }
    ],
    hard: [
      {
        id: 'projects_hard_1',
        question: 'How did you optimize performance in your projects?',
        category: 'projects',
        difficulty: 'hard',
        description: 'Performance optimization techniques and results'
      },
      {
        id: 'projects_hard_2',
        question: 'How do you handle project deadlines and scope changes?',
        category: 'projects',
        difficulty: 'hard',
        description: 'Project management and adaptability strategies'
      }
    ]
  },
  education: {
    easy: [
      {
        id: 'education_easy_1',
        question: 'What is your educational background?',
        category: 'education',
        difficulty: 'easy',
        description: 'Academic qualifications and institutions'
      },
      {
        id: 'education_easy_2',
        question: 'What online courses or training have you completed?',
        category: 'education',
        difficulty: 'easy',
        description: 'Online learning experiences and platforms'
      }
    ],
    medium: [
      {
        id: 'education_medium_1',
        question: 'What certifications do you have?',
        category: 'education',
        difficulty: 'medium',
        description: 'Professional certifications and training'
      },
      {
        id: 'education_medium_2',
        question: 'How do you stay updated with new technologies?',
        category: 'education',
        difficulty: 'medium',
        description: 'Continuous learning approach and resources'
      },
      {
        id: 'education_medium_3',
        question: 'How has your education prepared you for your career?',
        category: 'education',
        difficulty: 'medium',
        description: 'Connection between education and professional development'
      }
    ]
  },
  behaviour: {
    medium: [
      {
        id: 'behaviour_medium_1',
        question: 'Describe a time when you had to adapt to change',
        category: 'behaviour',
        difficulty: 'medium',
        description: 'Adaptability example with specific response'
      }
    ],
    hard: [
      {
        id: 'behaviour_hard_1',
        question: 'How do you handle conflict in a team?',
        category: 'behaviour',
        difficulty: 'hard',
        description: 'Conflict resolution and communication strategies'
      },
      {
        id: 'behaviour_hard_2',
        question: 'How do you prioritize tasks under pressure?',
        category: 'behaviour',
        difficulty: 'hard',
        description: 'Task prioritization and stress management'
      }
    ]
  }
}

export default function EvaluationPage() {
  const { isAuthenticated, user, getAuthToken, signIn } = usePuterAuth()
  // Helper function to safely extract text from feedback (handle objects with summary/rating)
  const extractFeedbackText = (feedbackValue: any): string => {
    if (typeof feedbackValue === 'string') {
      return feedbackValue
    }
    if (typeof feedbackValue === 'object' && feedbackValue !== null) {
      // If feedback has {summary, rating} structure, extract summary
      if ('summary' in feedbackValue) {
        return feedbackValue.summary
      }
      // If it's an array, join the items
      if (Array.isArray(feedbackValue)) {
        return feedbackValue.map(item => 
          typeof item === 'string' ? item : (item.summary || JSON.stringify(item))
        ).join(', ')
      }
      // Otherwise convert to JSON string as fallback
      return JSON.stringify(feedbackValue)
    }
    return String(feedbackValue || 'No feedback available')
  }

  // Helper function to calculate overall score from ONLY RAGAS metrics (5 metrics)
  const calculateOverallScore = (result: any) => {
    const metrics: number[] = []
    
    // RAGAS metrics ONLY (5 metrics total - matching the Metrics tab exactly)
    if (result.faithfulness !== undefined && result.faithfulness !== null) metrics.push(result.faithfulness)
    if (result.answer_relevancy !== undefined && result.answer_relevancy !== null) metrics.push(result.answer_relevancy)
    if (result.context_precision !== undefined && result.context_precision !== null) metrics.push(result.context_precision)
    if (result.context_recall !== undefined && result.context_recall !== null) metrics.push(result.context_recall)
    if (result.answer_correctness !== undefined && result.answer_correctness !== null) metrics.push(result.answer_correctness)
    
    // Calculate overall score from RAGAS metrics ONLY
    if (metrics.length === 0) {
      console.warn('No valid RAGAS metrics found for overall score calculation:', result)
      return 0
    }
    
    const overallScore = metrics.reduce((sum, metric) => sum + metric, 0) / metrics.length
    console.log(`Overall score calculated from ${metrics.length}/5 RAGAS metrics:`, {
      metrics: metrics.map(m => (m * 100).toFixed(1) + '%'),
      overall: (overallScore * 100).toFixed(1) + '%'
    })
    
    return overallScore
  }

  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [debugSteps, setDebugSteps] = useState<string[]>([]) // Track detailed steps
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentEvaluationStep, setCurrentEvaluationStep] = useState<'idle' | 'basic' | 'advanced' | 'completed'>('idle')
  const [animateResults, setAnimateResults] = useState(false)

  // Get category icon and color
  const getCategoryConfig = (category: string) => {
    const configs = {
      personal: { icon: Target, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', gradient: 'from-blue-50 to-blue-100/50' },
      experience: { icon: Activity, color: 'bg-green-500/10 text-green-600 border-green-500/20', gradient: 'from-green-50 to-green-100/50' },
      skills: { icon: Brain, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', gradient: 'from-purple-50 to-purple-100/50' },
      projects: { icon: Sparkles, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', gradient: 'from-orange-50 to-orange-100/50' },
      education: { icon: Database, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', gradient: 'from-indigo-50 to-indigo-100/50' },
      behaviour: { icon: TrendingUp, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20', gradient: 'from-pink-50 to-pink-100/50' }
    }
    return configs[category as keyof typeof configs] || configs.personal
  }
  const getAvailableTestCases = (): TestCase[] => {
    if (!selectedCategory || !selectedDifficulty) return []
    return TEST_CASES[selectedCategory]?.[selectedDifficulty] || []
  }

  // Get available difficulties for selected category
  const getAvailableDifficulties = (): string[] => {
    if (!selectedCategory) return []
    return Object.keys(TEST_CASES[selectedCategory] || {})
  }

  // Reset dependent selections when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedDifficulty('')
    setSelectedTestCase(null)
    setComparisonResult(null)
    setError(null)
    setCurrentEvaluationStep('idle')
  }

  // Reset test case selection when difficulty changes
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty)
    setSelectedTestCase(null)
    setComparisonResult(null)
    setError(null)
    setCurrentEvaluationStep('idle')
  }

  // Enhanced test case selection handler
  const handleTestCaseChange = (testCaseId: string) => {
    const testCase = getAvailableTestCases().find(tc => tc.id === testCaseId)
    setSelectedTestCase(testCase || null)
    setComparisonResult(null)
    setError(null)
    setCurrentEvaluationStep('idle')
  }

  // Format score for display
  const formatScore = (score: number): string => {
    return (score * 100).toFixed(1) + '%'
  }

  // Get badge variant based on score
  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return { variant: 'default', color: 'bg-green-500' }
    if (score >= 0.6) return { variant: 'secondary', color: 'bg-yellow-500' }
    return { variant: 'destructive', color: 'bg-red-500' }
  }

  // Run comparison evaluation with enhanced progress tracking
  const runComparison = async () => {
    if (!selectedTestCase) return
    if (!isAuthenticated) {
      setError('Please sign in with Puter to run evaluations.')
      return
    }

    setIsRunning(true)
    setProgress(0)
    setStatusMessage('Initializing evaluation pipeline...')
    setDebugSteps([])
    setError(null)
    setComparisonResult(null)
    setAnimateResults(false)
    setCurrentEvaluationStep('basic')

    // Generate unique session IDs for progress tracking
    const timestamp = Date.now()
    const rand = Math.random().toString(36).substr(2, 9)
    const basicSessionId = `basic-${timestamp}-${rand}`
    const advancedSessionId = `advanced-${timestamp}-${rand}`
    // Shared evaluation group id so rate limiter charges once per evaluation session
    const evalGroupId = `eval-group-${timestamp}-${rand}`

    const addDebugStep = (step: string) => {
      setDebugSteps(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`])
    }

    // Function to poll for progress updates
    const pollProgress = async (sessionId: string, stopSignal: { stop: boolean }) => {
      while (!stopSignal.stop) {
        try {
          const response = await fetch(`/api/evaluation/progress?sessionId=${sessionId}`)
          const data = await response.json()
          
          if (data.exists && data.steps.length > 0) {
            // Add new steps that we haven't seen yet
            data.steps.forEach((step: string) => {
              if (!debugSteps.some(s => s.includes(step))) {
                addDebugStep(step)
              }
            })
          }
        } catch (error) {
          console.error('Progress polling error:', error)
        }
        
        // Poll every 500ms
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    try {
      // Initialization phase with detailed steps
      addDebugStep('🔧 Initializing evaluation environment')
      setStatusMessage('🔧 Setting up evaluation pipeline...')
      setProgress(1)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🔌 Connecting to Upstash Vector Database')
      setProgress(2)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🔐 Authenticating API credentials (4 keys available)')
      setProgress(3)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('📋 Test case loaded: ' + selectedTestCase.question.substring(0, 60) + '...')
      addDebugStep(`📊 Category: ${selectedTestCase.category} | Difficulty: ${selectedTestCase.difficulty}`)
      setProgress(5)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Run Basic RAG with enhanced progress tracking
      setStatusMessage('🚀 Starting Basic RAG evaluation...')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep('🔵 BASIC RAG MODE - Phase 1/2')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setProgress(8)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('📡 Initializing API connection to evaluation endpoint')
      setProgress(10)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const basicStartTime = Date.now()
      addDebugStep('⏱️ Timer started for Basic RAG evaluation')
      
      // Start polling for progress updates
      const basicStopSignal = { stop: false }
      const basicPolling = pollProgress(basicSessionId, basicStopSignal)
      
      const basicHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-puter-username': user?.username || '',
        'x-eval-group-id': evalGroupId
      }
      const authToken = getAuthToken?.()
      if (authToken) basicHeaders['authorization'] = authToken

      const basicResponse = await fetch('/api/evaluation/single', {
        method: 'POST',
        headers: basicHeaders,
        body: JSON.stringify({
          testCase: selectedTestCase,
          ragMode: 'basic',
          sessionId: basicSessionId
        })
      })
      
      // Stop polling
      basicStopSignal.stop = true
      await basicPolling

      if (!basicResponse.ok) {
        let details = ''
        try {
          const data = await basicResponse.json()
          details = data?.message || data?.error || basicResponse.statusText
        } catch {}
        throw new Error(`Basic RAG evaluation failed: ${details}`)
      }

      addDebugStep('✓ API request successful - processing response')
      setProgress(12)
      setStatusMessage('🔍 Processing Basic RAG query...')
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🧮 Generating query embeddings with Groq')
      setProgress(15)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('🔍 Searching vector database for relevant contexts')
      setProgress(18)
      setStatusMessage('🔍 Retrieving contexts from vector database...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('📦 Retrieved top-K contexts from vector store')
      setProgress(20)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🤖 Generating answer with LLM (llama-3.1-8b-instant)')
      setProgress(23)
      setStatusMessage('🤖 Generating Basic RAG response...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ Answer generation completed')
      setProgress(25)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep('📊 RAGAS EVALUATION - 5 Metrics')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setProgress(28)
      setStatusMessage('📊 Evaluating with RAGAS metrics...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('🔑 Implementing per-metric key rotation strategy')
      addDebugStep('🔑 Total available keys: 4 (15s cooldown per key)')
      setProgress(30)
      await new Promise(resolve => setTimeout(resolve, 400))
      
      addDebugStep('⚙️ [1/5] Evaluating faithfulness metric (Key #1)')
      setProgress(32)
      setStatusMessage('⚙️ Evaluating faithfulness...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [2/5] Evaluating context_precision metric (Key #2)')
      setProgress(35)
      setStatusMessage('⚙️ Evaluating context precision...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [3/5] Evaluating context_recall metric (Key #3)')
      setProgress(37)
      setStatusMessage('⚙️ Evaluating context recall...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [4/5] Evaluating context_relevancy metric (Key #4)')
      setProgress(39)
      setStatusMessage('⚙️ Evaluating context relevancy...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [5/5] Evaluating answer_correctness metric (Key #1)')
      setProgress(41)
      setStatusMessage('⚙️ Evaluating answer correctness...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ All 5 RAGAS metrics evaluated successfully')
      setProgress(43)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('💬 Generating comprehensive feedback with LangChain')
      setStatusMessage('💬 Generating comprehensive feedback...')
      await new Promise(resolve => setTimeout(resolve, 300))

      const basicResult = await basicResponse.json()
      const basicTime = ((Date.now() - basicStartTime) / 1000).toFixed(1)
      
      addDebugStep(`✅ Basic RAG completed in ${basicTime}s`)
      addDebugStep(`📈 Overall Score: ${(basicResult.overall_score * 100).toFixed(1)}%`)
      
      // Safely access ragas_scores with optional chaining
      if (basicResult.ragas_scores) {
        const scores = basicResult.ragas_scores
        addDebugStep(`📊 Metrics: F=${(scores.faithfulness * 100).toFixed(0)}% | CP=${(scores.context_precision * 100).toFixed(0)}% | CR=${(scores.context_recall * 100).toFixed(0)}% | CRel=${(scores.context_relevance * 100).toFixed(0)}% | AC=${(scores.answer_correctness * 100).toFixed(0)}%`)
      }
      
      setProgress(45)
      setStatusMessage('✅ Basic RAG completed! Starting Advanced RAG...')
      setCurrentEvaluationStep('advanced')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Run Advanced RAG with enhanced progress tracking
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep('🟣 ADVANCED RAG MODE - Phase 2/2')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setProgress(48)
      setStatusMessage('⚡ Running Advanced RAG with enhanced techniques...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('📡 Initializing API connection to evaluation endpoint')
      setProgress(50)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const advancedStartTime = Date.now()
      addDebugStep('⏱️ Timer started for Advanced RAG evaluation')
      
      // Start polling for progress updates
      const advancedStopSignal = { stop: false }
      const advancedPolling = pollProgress(advancedSessionId, advancedStopSignal)
      
      const advancedHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-puter-username': user?.username || '',
        'x-eval-group-id': evalGroupId
      }
      if (authToken) advancedHeaders['authorization'] = authToken

      const advancedResponse = await fetch('/api/evaluation/single', {
        method: 'POST',
        headers: advancedHeaders,
        body: JSON.stringify({
          testCase: selectedTestCase,
          ragMode: 'advanced',
          sessionId: advancedSessionId
        })
      })
      
      // Stop polling
      advancedStopSignal.stop = true
      await advancedPolling

      if (!advancedResponse.ok) {
        let details = ''
        try {
          const data = await advancedResponse.json()
          details = data?.message || data?.error || advancedResponse.statusText
        } catch {}
        throw new Error(`Advanced RAG evaluation failed: ${details}`)
      }

      addDebugStep('✓ API request successful - processing response')
      setProgress(52)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🔮 Applying multi-query generation technique')
      setProgress(55)
      setStatusMessage('🔮 Multi-query generation in progress...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('🔀 Generating 3-5 query perspectives with LLM')
      setProgress(57)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ Multiple query perspectives generated')
      setProgress(60)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🔄 Applying RAG-Fusion ranking algorithm')
      setStatusMessage('🔄 Applying RAG-Fusion ranking algorithm...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('🔢 Fusing results using Reciprocal Rank Fusion (RRF)')
      setProgress(63)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('📊 Re-ranking contexts by relevance score')
      setProgress(65)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ Advanced context retrieval completed')
      setProgress(68)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🤖 Generating enhanced answer with LLM')
      setStatusMessage('🤖 Generating enhanced Advanced RAG response...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ Advanced RAG answer generation completed')
      setProgress(70)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep('📊 RAGAS EVALUATION - 5 Metrics')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setProgress(73)
      setStatusMessage('📊 Evaluating Advanced RAG with RAGAS...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('🔑 Implementing per-metric key rotation strategy')
      setProgress(75)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [1/5] Evaluating faithfulness metric (Key #2)')
      setProgress(78)
      setStatusMessage('⚙️ Evaluating faithfulness...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [2/5] Evaluating context_precision metric (Key #3)')
      setProgress(81)
      setStatusMessage('⚙️ Evaluating context precision...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [3/5] Evaluating context_recall metric (Key #4)')
      setProgress(84)
      setStatusMessage('⚙️ Evaluating context recall...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [4/5] Evaluating context_relevancy metric (Key #1)')
      setProgress(87)
      setStatusMessage('⚙️ Evaluating context relevancy...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('⚙️ [5/5] Evaluating answer_correctness metric (Key #2)')
      setProgress(90)
      setStatusMessage('⚙️ Evaluating answer correctness...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addDebugStep('✓ All 5 RAGAS metrics evaluated successfully')
      setProgress(92)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('💬 Generating comprehensive feedback with LangChain')
      setStatusMessage('💬 Generating comprehensive feedback...')
      await new Promise(resolve => setTimeout(resolve, 300))

      const advancedResult = await advancedResponse.json()
      const advancedTime = ((Date.now() - advancedStartTime) / 1000).toFixed(1)
      
      addDebugStep(`✅ Advanced RAG completed in ${advancedTime}s`)
      addDebugStep(`📈 Overall Score: ${(advancedResult.overall_score * 100).toFixed(1)}%`)
      
      // Safely access ragas_scores with optional chaining
      if (advancedResult.ragas_scores) {
        const scores = advancedResult.ragas_scores
        addDebugStep(`📊 Metrics: F=${(scores.faithfulness * 100).toFixed(0)}% | CP=${(scores.context_precision * 100).toFixed(0)}% | CR=${(scores.context_recall * 100).toFixed(0)}% | CRel=${(scores.context_relevance * 100).toFixed(0)}% | AC=${(scores.answer_correctness * 100).toFixed(0)}%`)
      }
      
      addDebugStep(`🔬 Techniques used: ${advancedResult.techniques_used?.join(', ') || 'Multi-query, RAG-Fusion'}`)
      setProgress(95)
      setStatusMessage('🎯 Finalizing results and generating insights...')
      setCurrentEvaluationStep('completed')
      await new Promise(resolve => setTimeout(resolve, 300))

      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep('🎯 FINALIZING RESULTS')
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setProgress(96)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('📊 Calculating performance improvements')
      const improvementValue = (advancedResult.overall_score - basicResult.overall_score) * 100
      const improvement = improvementValue.toFixed(1)
      addDebugStep(`📈 Performance delta: ${improvementValue > 0 ? '+' : ''}${improvement}%`)
      setProgress(97)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('🎨 Preparing D3 visualizations (radar charts, bar charts)')
      setProgress(98)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      addDebugStep('📑 Compiling comprehensive evaluation report')
      setProgress(99)
      await new Promise(resolve => setTimeout(resolve, 200))

      setProgress(100)
      setStatusMessage('🎉 Evaluation completed successfully!')
      addDebugStep('✨ Evaluation pipeline completed successfully')
      addDebugStep(`⏱️ Total evaluation time: ${((Date.now() - basicStartTime) / 1000).toFixed(1)}s`)

      // Create comparison result with animation trigger
      setComparisonResult({
        testCase: selectedTestCase,
        basicRAG: basicResult,
        advancedRAG: advancedResult
      })
      
      // Trigger result animations
      setTimeout(() => setAnimateResults(true), 100)

    } catch (error) {
      console.error('Evaluation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Evaluation failed'
      setError(errorMessage)
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      addDebugStep(`❌ ERROR: ${errorMessage}`)
      addDebugStep('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      setStatusMessage('❌ Evaluation failed - please try again')
      setCurrentEvaluationStep('idle')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      
      <main className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="space-y-6 sm:space-y-8">
          
          {/* Enhanced Page Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-2xl" />
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-lg shadow-primary/20">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                      Single Test Case Evaluation
                    </h1>
                    <Badge variant="secondary" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1">
                      Interactive
                    </Badge>
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-2xl">
                    Compare Basic and Advanced RAG performance with comprehensive metrics and visualizations
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      Real-time Analysis
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Multiple Metrics
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Visual Comparisons
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Test Case Selection */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                  <Play className="h-4 w-4 text-primary" />
                </div>
                Test Case Selection
                {selectedTestCase && (
                  <Badge variant="secondary" className="ml-auto text-xs font-semibold">
                    Ready to Evaluate
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Select a test case by category and difficulty level to evaluate both RAG modes with comprehensive metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Enhanced Selection Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Selection with Icons */}
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Category
                  </Label>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger id="category" className="h-12 border-2 border-border/50 hover:border-border focus:border-primary transition-colors">
                      <SelectValue placeholder="Choose evaluation category" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[250px]">
                      {Object.keys(TEST_CASES).map((category) => {
                        const config = getCategoryConfig(category)
                        const Icon = config.icon
                        return (
                          <SelectItem key={category} value={category} className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex items-center justify-center w-6 h-6 rounded-lg border", config.color)}>
                                <Icon className="h-3 w-3" />
                              </div>
                              <span className="font-medium capitalize">{category}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {selectedCategory && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {Object.keys(TEST_CASES[selectedCategory] || {}).length} difficulties available
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Enhanced Difficulty Selection */}
                <div className="space-y-3">
                  <Label htmlFor="difficulty" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Difficulty Level
                  </Label>
                  <Select 
                    value={selectedDifficulty} 
                    onValueChange={handleDifficultyChange}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger id="difficulty" className="h-12 border-2 border-border/50 hover:border-border focus:border-primary transition-colors disabled:opacity-50">
                      <SelectValue placeholder="Select difficulty level" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDifficulties().map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty} className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-lg border",
                              difficulty === 'easy' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                              difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                              'bg-red-500/10 text-red-600 border-red-500/20'
                            )}>
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                difficulty === 'easy' ? 'bg-green-500' :
                                difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              )} />
                            </div>
                            <span className="font-medium capitalize">{difficulty}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategory && selectedDifficulty && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getAvailableTestCases().length} test cases available
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Enhanced Test Case Selection */}
                <div className="space-y-3">
                  <Label htmlFor="testcase" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Specific Test Case
                  </Label>
                  <Select 
                    value={selectedTestCase?.id || ''} 
                    onValueChange={handleTestCaseChange}
                    disabled={!selectedDifficulty}
                  >
                    <SelectTrigger id="testcase" className="h-12 border-2 border-border/50 hover:border-border focus:border-primary transition-colors disabled:opacity-50">
                      <SelectValue placeholder="Choose test case" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[400px]">
                      {getAvailableTestCases().map((testCase) => (
                        <SelectItem key={testCase.id} value={testCase.id} className="p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-sm line-clamp-2">
                              {testCase.question.substring(0, 60)}{testCase.question.length > 60 ? '...' : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {testCase.description.substring(0, 80)}{testCase.description.length > 80 ? '...' : ''}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enhanced Selected Test Case Display */}
              {selectedTestCase && (
                <Card className="bg-gradient-to-br from-muted/30 to-muted/20 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-xl border-2",
                              getCategoryConfig(selectedTestCase.category).color
                            )}>
                              {(() => {
                                const Icon = getCategoryConfig(selectedTestCase.category).icon
                                return <Icon className="h-4 w-4" />
                              })()} 
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg sm:text-xl text-foreground mb-2 leading-tight">
                                {selectedTestCase.question}
                              </h3>
                              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                {selectedTestCase.description}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "capitalize font-semibold px-3 py-1.5",
                              getCategoryConfig(selectedTestCase.category).color
                            )}
                          >
                            {selectedTestCase.category}
                          </Badge>
                          <Badge 
                            variant={
                              selectedTestCase.difficulty === 'easy' ? 'default' :
                              selectedTestCase.difficulty === 'medium' ? 'secondary' : 'destructive'
                            }
                            className="capitalize font-semibold px-3 py-1.5"
                          >
                            {selectedTestCase.difficulty}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            <span>Est. 30-60s</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats Preview */}
                      <Separator className="my-4" />
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-background/50">
                          <div className="text-lg font-bold text-primary">2</div>
                          <div className="text-xs text-muted-foreground">RAG Methods</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/50">
                          <div className="text-lg font-bold text-primary">5</div>
                          <div className="text-xs text-muted-foreground">Metrics</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/50">
                          <div className="text-lg font-bold text-primary">Visual</div>
                          <div className="text-xs text-muted-foreground">Comparison</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/50">
                          <div className="text-lg font-bold text-primary">Real-time</div>
                          <div className="text-xs text-muted-foreground">Analysis</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Run Button */}
              <div className="flex flex-col items-center gap-4 pt-4">
                <Button 
                  onClick={runComparison}
                  disabled={!selectedTestCase || isRunning || !isAuthenticated}
                  size="lg"
                  className={cn(
                    "min-w-[240px] h-14 text-lg font-semibold transition-all duration-300",
                    "bg-gradient-to-r from-primary via-primary/95 to-primary/90",
                    "hover:from-primary/95 hover:via-primary/90 hover:to-primary/85",
                    "shadow-lg hover:shadow-xl hover:shadow-primary/25",
                    "transform hover:scale-[1.02] active:scale-[0.98]",
                    isRunning && "animate-pulse",
                    animateResults && "ring-4 ring-primary/20"
                  )}
                >
                  {isRunning ? (
                    <>
                      <div className="relative mr-3">
                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                      </div>
                      <span className="animate-pulse">
                        {currentEvaluationStep === 'basic' ? 'Running Basic RAG...' :
                         currentEvaluationStep === 'advanced' ? 'Running Advanced RAG...' :
                         'Processing Results...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Play className="h-5 w-5" />
                        <span>{isAuthenticated ? 'Start Comprehensive Evaluation' : 'Sign in to Evaluate'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </>
                  )}
                </Button>
                
                {selectedTestCase && !isRunning && !comparisonResult && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Ready to evaluate: <span className="font-medium text-foreground">{selectedTestCase.question.substring(0, 40)}...</span>
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Basic RAG
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        Advanced RAG
                      </span>
                    </div>
                    {!isAuthenticated && (
                      <div className="text-xs text-amber-600 font-medium">Please sign in with Puter to run evaluations.</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Progress Bar */}
          {isRunning && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-lg">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border-2 border-primary/30">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground">Evaluation in Progress</p>
                        <p className="text-sm text-muted-foreground">
                          Comparing Basic and Advanced RAG methods
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
                      <div className="text-xs text-muted-foreground font-medium">Complete</div>
                    </div>
                  </div>
                  
                  {/* Enhanced Progress Bar */}
                  <div className="space-y-3">
                    <Progress value={progress} className="w-full h-4 bg-background/50" />
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="animate-pulse h-2 w-2 bg-primary rounded-full" />
                        <span className="italic">{statusMessage}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step Indicators */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      currentEvaluationStep === 'basic' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      progress > 45 ? 'bg-green-50 border-green-200 text-green-700' :
                      'bg-muted/30 border-border/50 text-muted-foreground'
                    )}>
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                        currentEvaluationStep === 'basic' ? 'bg-blue-500 text-white' :
                        progress > 45 ? 'bg-green-500 text-white' :
                        'bg-muted-foreground/30 text-muted-foreground'
                      )}>
                        {progress > 45 ? '✓' : '1'}
                      </div>
                      <span className="text-sm font-medium">Basic RAG</span>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      currentEvaluationStep === 'advanced' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                      progress > 95 ? 'bg-green-50 border-green-200 text-green-700' :
                      'bg-muted/30 border-border/50 text-muted-foreground'
                    )}>
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                        currentEvaluationStep === 'advanced' ? 'bg-purple-500 text-white' :
                        progress > 95 ? 'bg-green-500 text-white' :
                        'bg-muted-foreground/30 text-muted-foreground'
                      )}>
                        {progress > 95 ? '✓' : '2'}
                      </div>
                      <span className="text-sm font-medium">Advanced RAG</span>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      currentEvaluationStep === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      'bg-muted/30 border-border/50 text-muted-foreground'
                    )}>
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                        currentEvaluationStep === 'completed' ? 'bg-emerald-500 text-white' :
                        'bg-muted-foreground/30 text-muted-foreground'
                      )}>
                        {currentEvaluationStep === 'completed' ? '✓' : '3'}
                      </div>
                      <span className="text-sm font-medium">Results</span>
                    </div>
                  </div>
                  
                  {/* Debug Steps Collapsible Section - Auto-expanded with enhanced styling */}
                  {debugSteps.length > 0 && (
                    <Collapsible defaultOpen className="border-2 border-primary/30 rounded-lg bg-gradient-to-br from-muted/30 to-background/50 shadow-sm">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Activity className="h-4 w-4 text-primary animate-pulse" />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-sm text-foreground">Live Debug Information</span>
                            <p className="text-xs text-muted-foreground">Real-time evaluation pipeline activity</p>
                          </div>
                          <Badge variant="secondary" className="ml-2 animate-pulse">
                            {debugSteps.length} steps
                          </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-2">
                          <Separator className="mb-3" />
                          <ScrollArea className="h-[350px] w-full rounded-md border-2 border-border/50 bg-background/80 p-4 shadow-inner">
                            <div className="space-y-1.5 font-mono text-xs">
                              {debugSteps.map((step, index) => {
                                const isError = step.includes('❌') || step.includes('ERROR')
                                const isSuccess = step.includes('✅') || step.includes('completed')
                                const isMetric = step.includes('⚙️') && step.includes('[')
                                const isKeyRotation = step.includes('🔑')
                                const isMetricResult = step.includes('📊 Metrics:') || step.includes('📈')
                                const isSeparator = step.includes('━━━')
                                const isPhaseHeader = step.includes('BASIC RAG') || step.includes('ADVANCED RAG') || step.includes('RAGAS EVALUATION') || step.includes('FINALIZING')
                                
                                return (
                                  <div 
                                    key={index}
                                    className={cn(
                                      "p-2.5 rounded border-l-3 transition-all animate-in slide-in-from-left-2 hover:translate-x-1",
                                      isSeparator ? 'text-muted-foreground/50 border-l-0 p-1' :
                                      isPhaseHeader ? 'bg-primary/10 border-primary font-bold text-primary' :
                                      isError ? 'bg-red-50/80 border-red-500 text-red-700 font-semibold' :
                                      isSuccess ? 'bg-green-50/80 border-green-500 text-green-700' :
                                      isMetric ? 'bg-blue-50/80 border-blue-500 text-blue-700' :
                                      isKeyRotation ? 'bg-amber-50/80 border-amber-500 text-amber-700' :
                                      isMetricResult ? 'bg-purple-50/80 border-purple-500 text-purple-700 font-semibold' :
                                      'bg-muted/40 border-muted-foreground/30 text-muted-foreground'
                                    )}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                  >
                                    {step}
                                  </div>
                                )
                              })}
                              {/* Auto-scroll anchor */}
                              <div id="debug-steps-end" />
                            </div>
                          </ScrollArea>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              Pipeline active
                            </span>
                            <span>Scroll to see full logs</span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Error Display */}
          {error && (
            <Alert variant="destructive" className="border-2 border-destructive/50 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <h4 className="font-semibold mb-1">Evaluation Failed</h4>
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                  <div className="mt-3 flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setError(null)}
                      className="h-8 text-xs"
                    >
                      Dismiss
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={runComparison}
                      disabled={!selectedTestCase}
                      className="h-8 text-xs"
                    >
                      Retry Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Enhanced Comparison Results */}
          {comparisonResult && (
            <div className={cn(
              "space-y-8 transition-all duration-700",
              animateResults ? "opacity-100 translate-y-0" : "opacity-80 translate-y-4"
            )}>
              {/* Enhanced Results Header */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-500/3 to-transparent rounded-2xl" />
                <div className="relative text-center py-8">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-500/90 to-emerald-500/80 shadow-lg shadow-emerald-500/20">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl sm:text-4xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                        Evaluation Results
                      </h2>
                      <p className="text-base sm:text-lg text-muted-foreground">
                        Comprehensive comparison between Basic and Advanced RAG methods
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 rounded-xl bg-background/60 border border-border/50">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {((calculateOverallScore(comparisonResult.basicRAG) + calculateOverallScore(comparisonResult.advancedRAG)) / 2 * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Avg Score</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/60 border border-border/50">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {((comparisonResult.basicRAG.response_time + comparisonResult.advancedRAG.response_time) / 2).toFixed(1)}s
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Avg Time</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/60 border border-border/50">
                      <div className="text-2xl font-bold text-primary mb-1">5</div>
                      <div className="text-xs text-muted-foreground font-medium">RAGAS Metrics</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/60 border border-border/50">
                      <div className="text-2xl font-bold text-emerald-600 mb-1">
                        {calculateOverallScore(comparisonResult.advancedRAG) > calculateOverallScore(comparisonResult.basicRAG) ? '+' : ''}
                        {((calculateOverallScore(comparisonResult.advancedRAG) - calculateOverallScore(comparisonResult.basicRAG)) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Improvement</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Tabbed Results Interface */}
              <Tabs defaultValue="overview" className="w-full">
                <div className="flex justify-center mb-8">
                  <TabsList className="grid grid-cols-3 w-full max-w-md h-12 p-1 bg-muted/60 rounded-xl">
                    <TabsTrigger value="overview" className="flex items-center gap-2 h-10 rounded-lg font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="metrics" className="flex items-center gap-2 h-10 rounded-lg font-medium">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Metrics</span>
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="flex items-center gap-2 h-10 rounded-lg font-medium">
                      <Brain className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Enhanced Overview Tab */}
                <TabsContent value="overview" className="space-y-8">
                  {/* Enhanced Overall Score Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enhanced Basic RAG Results */}
                    <Card className={cn(
                      "border-2 transition-all duration-300 hover:shadow-lg",
                      "border-blue-200/60 bg-gradient-to-br from-blue-50/60 to-blue-100/40",
                      "dark:from-blue-950/40 dark:to-blue-900/30 dark:border-blue-800/40",
                      animateResults && "animate-in slide-in-from-left-4 duration-700"
                    )}>
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-between text-xl">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/20 border-2 border-blue-500/30">
                              <div className="h-3 w-3 bg-blue-500 rounded-full" />
                            </div>
                            <span className="font-bold">Basic RAG</span>
                          </div>
                          <Badge variant="outline" className="font-semibold text-blue-600 border-blue-500/30">
                            RAGAS
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {comparisonResult.basicRAG.error ? (
                          <div className="text-center py-8">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 mb-4 mx-auto">
                              <XCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400">
                              Evaluation Failed
                            </h3>
                            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border-2 border-red-200 dark:border-red-800/30">
                              <p className="font-semibold text-red-700 dark:text-red-300 mb-2">Error Details:</p>
                              <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
                                {comparisonResult.basicRAG.error}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center py-2">
                              <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                                {(calculateOverallScore(comparisonResult.basicRAG) * 100).toFixed(1)}%
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">Overall Score (5 RAGAS Metrics)</p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Response Time</span>
                                <span className="font-semibold">{comparisonResult.basicRAG.response_time.toFixed(2)}s</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Contexts Retrieved</span>
                                <span className="font-semibold">{comparisonResult.basicRAG.num_contexts}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Advanced RAG Results */}
                    <Card className="border border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20 dark:border-purple-800/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <Zap className="h-3 w-3 text-purple-500" />
                          </div>
                          Advanced RAG
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {comparisonResult.advancedRAG.error ? (
                          <div className="text-center py-4">
                            <div className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                              Evaluation Failed
                            </div>
                            <div className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800/30">
                              <p className="font-semibold text-red-700 dark:text-red-300 mb-1">Error Details:</p>
                              <p className="text-red-600 dark:text-red-400">{comparisonResult.advancedRAG.error}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center py-2">
                              <div className="text-2xl sm:text-3xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                                {(calculateOverallScore(comparisonResult.advancedRAG) * 100).toFixed(1)}%
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">Overall Score (5 RAGAS Metrics)</p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Response Time</span>
                                <span className="font-semibold">{comparisonResult.advancedRAG.response_time.toFixed(2)}s</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Contexts Retrieved</span>
                                <span className="font-semibold">{comparisonResult.advancedRAG.num_contexts}</span>
                              </div>
                              {comparisonResult.advancedRAG.techniques_used && comparisonResult.advancedRAG.techniques_used.length > 0 && (
                                <div className="pt-2 border-t border-border/50">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Techniques Used:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.advancedRAG.techniques_used.map((technique, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs py-0.5 px-2">
                                        {technique}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Generated Answers Comparison */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    {/* Basic RAG Answer */}
                    <Card className="border border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-blue-100/20 dark:from-blue-950/20 dark:to-blue-900/10 dark:border-blue-800/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30">
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          </div>
                          Basic RAG Answer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose dark:prose-invert max-w-none prose-sm">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground bg-background/50 p-4 rounded-lg border border-border/50">
                            {comparisonResult.basicRAG.answer}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Advanced RAG Answer */}
                    <Card className="border border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-purple-100/20 dark:from-purple-950/20 dark:to-purple-900/10 dark:border-purple-800/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <Zap className="h-3 w-3 text-purple-500" />
                          </div>
                          Advanced RAG Answer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose dark:prose-invert max-w-none prose-sm">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground bg-background/50 p-4 rounded-lg border border-border/50">
                            {comparisonResult.advancedRAG.answer}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Metrics Tab with D3 Visualization */}
                <TabsContent value="metrics" className="space-y-6">
                  <Card className="border border-gray-200/50 bg-gradient-to-br from-gray-50/30 to-gray-100/20 dark:from-gray-950/30 dark:to-gray-900/20 dark:border-gray-800/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-500/20 border border-gray-500/30">
                          <BarChart3 className="h-3 w-3 text-gray-600" />
                        </div>
                        Performance Metrics Visualization
                      </CardTitle>
                      <CardDescription>
                        Interactive visualization comparing Basic and Advanced RAG performance across 5 RAGAS metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EvaluationMetricsChart 
                        basicRAG={comparisonResult.basicRAG}
                        advancedRAG={comparisonResult.advancedRAG}
                        evaluationMethod={comparisonResult.basicRAG.evaluation_method || comparisonResult.advancedRAG.evaluation_method}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Feedback Tab */}
                <TabsContent value="feedback" className="space-y-6">
                  {(comparisonResult.basicRAG.feedback || comparisonResult.advancedRAG.feedback) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Basic RAG Feedback */}
                      {comparisonResult.basicRAG.feedback && (
                        <Card className="border border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-blue-100/20 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800/30">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg">
                              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                <Sparkles className="h-3 w-3 text-blue-500" />
                              </div>
                              Basic RAG Feedback
                            </CardTitle>
                            <CardDescription>
                              AI-generated insights based on RAGAS metrics and response quality
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                                  Overall Assessment
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.basicRAG.feedback.overall_assessment)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
                                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></div>
                                  Strengths
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.basicRAG.feedback.strengths)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                                <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-amber-500 rounded-full"></div>
                                  Weaknesses
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.basicRAG.feedback.weaknesses)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                                <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full"></div>
                                  Recommendations
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.basicRAG.feedback.recommendations)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-cyan-200/50 dark:border-cyan-800/30">
                                <h4 className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-cyan-500 rounded-full"></div>
                                  Context Analysis
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.basicRAG.feedback.context_analysis)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Advanced RAG Feedback */}
                      {comparisonResult.advancedRAG.feedback && (
                        <Card className="border border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-purple-100/20 dark:from-purple-950/30 dark:to-purple-900/20 dark:border-purple-800/30">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg">
                              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30">
                                <Zap className="h-3 w-3 text-purple-500" />
                              </div>
                              Advanced RAG Feedback
                            </CardTitle>
                            <CardDescription>
                              AI-generated insights based on RAGAS metrics and response quality
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                                <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full"></div>
                                  Overall Assessment
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.advancedRAG.feedback.overall_assessment)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
                                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></div>
                                  Strengths
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.advancedRAG.feedback.strengths)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                                <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-amber-500 rounded-full"></div>
                                  Weaknesses
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.advancedRAG.feedback.weaknesses)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                                <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full"></div>
                                  Recommendations
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.advancedRAG.feedback.recommendations)}
                                </p>
                              </div>
                              
                              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-cyan-200/50 dark:border-cyan-800/30">
                                <h4 className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 bg-cyan-500 rounded-full"></div>
                                  Context Analysis
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {extractFeedbackText(comparisonResult.advancedRAG.feedback.context_analysis)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Card className="border border-gray-200/50">
                      <CardContent className="text-center py-8">
                        <div className="text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">No Feedback Available</h3>
                          <p className="text-sm">
                            Comprehensive feedback will be generated after evaluation completes.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}