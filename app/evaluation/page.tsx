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
import { CheckCircle, XCircle, Clock, Play, BarChart3, AlertCircle, Zap, Database, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import D3Visualizations from '@/components/d3-visualizations'
import EvaluationMetricsChart from '@/components/evaluation-metrics-chart'

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
    answer_relevancy: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness: number
    overall_score: number
    num_contexts: number
    error?: string  // Optional error field for failed evaluations
    // LangChain specific metrics
    relevance?: number
    coherence?: number
    factual_accuracy?: number
    completeness?: number
    context_usage?: number
    professional_tone?: number
    evaluation_method?: 'individual_metrics' | 'langchain' | 'groq' | 'fallback'
    // Individual metric details (if available)
    individual_metric_details?: {
      [key: string]: {
        score: number;
        feedback: string;
        evaluation_time: number;
      }
    }
  }
  advancedRAG: {
    answer: string
    response_time: number
    faithfulness: number
    answer_relevancy: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness: number
    overall_score: number
    num_contexts: number
    error?: string  // Optional error field for failed evaluations
    // LangChain specific metrics
    relevance?: number
    coherence?: number
    factual_accuracy?: number
    completeness?: number
    context_usage?: number
    professional_tone?: number
    evaluation_method?: 'individual_metrics' | 'langchain' | 'groq' | 'fallback'
    // Individual metric details (if available)
    individual_metric_details?: {
      [key: string]: {
        score: number;
        feedback: string;
        evaluation_time: number;
      }
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
  // Helper function to calculate overall score from available metrics
  const calculateOverallScore = (result: any) => {
    const metrics = []
    
    // Use individual/LangChain metrics if available
    if (result.evaluation_method === 'individual_metrics' || result.evaluation_method === 'langchain') {
      if (result.relevance !== undefined) metrics.push(result.relevance)
      if (result.coherence !== undefined) metrics.push(result.coherence)
      if (result.factual_accuracy !== undefined) metrics.push(result.factual_accuracy)
      if (result.completeness !== undefined) metrics.push(result.completeness)
      if (result.context_usage !== undefined) metrics.push(result.context_usage)
      if (result.professional_tone !== undefined) metrics.push(result.professional_tone)
    }
    
    // Fall back to standard RAGAS metrics if no advanced metrics available
    if (metrics.length === 0) {
      if (result.faithfulness !== undefined) metrics.push(result.faithfulness)
      if (result.answer_relevancy !== undefined) metrics.push(result.answer_relevancy)
      if (result.context_precision !== undefined) metrics.push(result.context_precision)
      if (result.context_recall !== undefined) metrics.push(result.context_recall)
      if (result.context_relevancy !== undefined) metrics.push(result.context_relevancy)
      if (result.answer_correctness !== undefined) metrics.push(result.answer_correctness)
    }
    
    return metrics.length > 0 ? metrics.reduce((a, b) => a + b, 0) / metrics.length : 0
  }

  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get available test cases based on selected category and difficulty
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
  }

  // Reset test case selection when difficulty changes
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty)
    setSelectedTestCase(null)
    setComparisonResult(null)
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

  // Run comparison evaluation
  const runComparison = async () => {
    if (!selectedTestCase) return

    setIsRunning(true)
    setProgress(0)
    setStatusMessage('Starting evaluation...')
    setError(null)
    setComparisonResult(null)

    try {
      // Run Basic RAG
      setProgress(10)
      setStatusMessage('Running Basic RAG evaluation...')
      
      const basicResponse = await fetch('/api/evaluation/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCase: selectedTestCase,
          ragMode: 'basic'
        })
      })

      if (!basicResponse.ok) {
        throw new Error(`Basic RAG evaluation failed: ${basicResponse.statusText}`)
      }

      const basicResult = await basicResponse.json()
      setProgress(50)
      setStatusMessage('Running Advanced RAG evaluation...')

      // Run Advanced RAG
      const advancedResponse = await fetch('/api/evaluation/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCase: selectedTestCase,
          ragMode: 'advanced'
        })
      })

      if (!advancedResponse.ok) {
        throw new Error(`Advanced RAG evaluation failed: ${advancedResponse.statusText}`)
      }

      const advancedResult = await advancedResponse.json()
      setProgress(100)
      setStatusMessage('Evaluation completed successfully!')

      // Create comparison result
      setComparisonResult({
        testCase: selectedTestCase,
        basicRAG: basicResult,
        advancedRAG: advancedResult
      })

    } catch (error) {
      console.error('Evaluation error:', error)
      setError(error instanceof Error ? error.message : 'Evaluation failed')
      setStatusMessage('Evaluation failed')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      <main className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="space-y-6 sm:space-y-8">
          
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Single Test Case Evaluation</h1>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">
                  Compare Basic and Advanced RAG performance on individual test cases
                </p>
              </div>
            </div>
          </div>

          {/* Test Case Selection */}
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Play className="h-3 w-3 text-primary" />
                </div>
                Test Case Selection
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Select a test case by category and difficulty level to evaluate both RAG modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium text-foreground">Category</Label>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger id="category" className="h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="experience">Experience</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="behaviour">Behaviour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Selection */}
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-sm font-medium text-foreground">Difficulty</Label>
                  <Select 
                    value={selectedDifficulty} 
                    onValueChange={handleDifficultyChange}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger id="difficulty" className="h-10">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDifficulties().map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Case Selection */}
                <div className="space-y-2">
                  <Label htmlFor="testcase" className="text-sm font-medium text-foreground">Test Case</Label>
                  <Select 
                    value={selectedTestCase?.id || ''} 
                    onValueChange={(id) => {
                      const testCase = getAvailableTestCases().find(tc => tc.id === id)
                      setSelectedTestCase(testCase || null)
                      setComparisonResult(null)
                    }}
                    disabled={!selectedDifficulty}
                  >
                    <SelectTrigger id="testcase" className="h-10">
                      <SelectValue placeholder="Select test case" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTestCases().map((testCase) => (
                        <SelectItem key={testCase.id} value={testCase.id}>
                          {testCase.question.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Test Case Display */}
              {selectedTestCase && (
                <Card className="bg-muted/30 border border-muted-foreground/20">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <p className="font-medium text-base sm:text-lg text-foreground">{selectedTestCase.question}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedTestCase.description}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge variant="outline" className="capitalize">{selectedTestCase.category}</Badge>
                          <Badge 
                            variant={
                              selectedTestCase.difficulty === 'easy' ? 'default' :
                              selectedTestCase.difficulty === 'medium' ? 'secondary' : 'destructive'
                            }
                            className="capitalize"
                          >
                            {selectedTestCase.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Run Button */}
              <div className="flex justify-center pt-2">
                <Button 
                  onClick={runComparison}
                  disabled={!selectedTestCase || isRunning}
                  size="lg"
                  className="min-w-[200px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Running Evaluation...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Comparison
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          {isRunning && (
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">Evaluation Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-2 w-2 bg-primary rounded-full"></div>
                      <p className="text-sm font-mono text-muted-foreground">{Math.round(progress)}%</p>
                    </div>
                  </div>
                  <Progress value={progress} className="w-full h-3" />
                  <p className="text-sm text-muted-foreground italic">{statusMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="border border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* Comparison Results */}
          {comparisonResult && (
            <div className="space-y-6 sm:space-y-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 via-green-500/15 to-green-500/10 border border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Evaluation Results</h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Comprehensive comparison between Basic and Advanced RAG modes
                </p>
              </div>

              {/* Tabbed Results Interface */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px] lg:mx-auto">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Metrics</span>
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Feedback</span>
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Overall Score Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Basic RAG Results */}
                    <Card className="border border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30">
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          </div>
                          Basic RAG
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {comparisonResult.basicRAG.error ? (
                          <div className="text-center py-4">
                            <div className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                              Evaluation Failed
                            </div>
                            <div className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800/30">
                              <p className="font-semibold text-red-700 dark:text-red-300 mb-1">Error Details:</p>
                              <p className="text-red-600 dark:text-red-400">{comparisonResult.basicRAG.error}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center py-2">
                              <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                                {(calculateOverallScore(comparisonResult.basicRAG) * 100).toFixed(1)}%
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">Overall Score</p>
                              {comparisonResult.basicRAG.evaluation_method && (
                                <div className="mt-2">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border",
                                    comparisonResult.basicRAG.evaluation_method === 'individual_metrics' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30'
                                      : comparisonResult.basicRAG.evaluation_method === 'langchain' 
                                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30'
                                      : comparisonResult.basicRAG.evaluation_method === 'groq'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'
                                  )}>
                                    {comparisonResult.basicRAG.evaluation_method === 'individual_metrics' && <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
                                    {comparisonResult.basicRAG.evaluation_method === 'langchain' && <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />}
                                    {comparisonResult.basicRAG.evaluation_method === 'groq' && <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />}
                                    {comparisonResult.basicRAG.evaluation_method === 'fallback' && <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />}
                                    {comparisonResult.basicRAG.evaluation_method === 'individual_metrics' ? 'Individual Metrics' :
                                     comparisonResult.basicRAG.evaluation_method === 'langchain' ? 'LangChain' : 
                                     comparisonResult.basicRAG.evaluation_method === 'groq' ? 'GROQ' : 'Fallback'}
                                  </span>
                                </div>
                              )}
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
                              <p className="text-sm text-muted-foreground font-medium">Overall Score</p>
                              {comparisonResult.advancedRAG.evaluation_method && (
                                <div className="mt-2">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border",
                                    comparisonResult.advancedRAG.evaluation_method === 'individual_metrics' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30'
                                      : comparisonResult.advancedRAG.evaluation_method === 'langchain' 
                                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30'
                                      : comparisonResult.advancedRAG.evaluation_method === 'groq'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/30'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'
                                  )}>
                                    {comparisonResult.advancedRAG.evaluation_method === 'individual_metrics' && <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
                                    {comparisonResult.advancedRAG.evaluation_method === 'langchain' && <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />}
                                    {comparisonResult.advancedRAG.evaluation_method === 'groq' && <div className="h-1.5 w-1.5 bg-purple-500 rounded-full" />}
                                    {comparisonResult.advancedRAG.evaluation_method === 'fallback' && <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />}
                                    {comparisonResult.advancedRAG.evaluation_method === 'individual_metrics' ? 'Individual Metrics' :
                                     comparisonResult.advancedRAG.evaluation_method === 'langchain' ? 'LangChain' : 
                                     comparisonResult.advancedRAG.evaluation_method === 'groq' ? 'GROQ' : 'Fallback'}
                                  </span>
                                </div>
                              )}
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
                        Interactive radar chart comparing Basic and Advanced RAG performance across all evaluation metrics
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
                  {(comparisonResult.basicRAG.individual_metric_details || comparisonResult.advancedRAG.individual_metric_details) ? (
                    <Card className="border border-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-800/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                            <AlertCircle className="h-3 w-3 text-emerald-600" />
                          </div>
                          Individual Metric Feedback
                        </CardTitle>
                        <CardDescription>
                          Detailed feedback for each evaluation metric assessed individually
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {comparisonResult.basicRAG.individual_metric_details && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              Basic RAG Detailed Feedback
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(comparisonResult.basicRAG.individual_metric_details).map(([metric, details]) => (
                                <Card key={metric} className="bg-white dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                        {metric.replace('_', ' ')}
                                      </h5>
                                      <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        {(details.score * 100).toFixed(1)}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                      {details.feedback}
                                    </p>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                                      Evaluation time: {details.evaluation_time.toFixed(2)}s
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {comparisonResult.advancedRAG.individual_metric_details && (
                          <div>
                            <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
                              <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                              Advanced RAG Detailed Feedback
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(comparisonResult.advancedRAG.individual_metric_details).map(([metric, details]) => (
                                <Card key={metric} className="bg-white dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                        {metric.replace('_', ' ')}
                                      </h5>
                                      <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        {(details.score * 100).toFixed(1)}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                      {details.feedback}
                                    </p>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                                      Evaluation time: {details.evaluation_time.toFixed(2)}s
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border border-gray-200/50">
                      <CardContent className="text-center py-8">
                        <div className="text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">No Individual Feedback Available</h3>
                          <p className="text-sm">
                            Individual metric feedback is only available when using the Individual Metrics evaluation method.
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