'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, Play, BarChart3, TrendingUp } from 'lucide-react'
import D3Visualizations from '@/components/d3-visualizations'

interface EvaluationResult {
  question: string
  category: string
  difficulty: string
  generated_answer: string
  response_time: number
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  overall_score: number
  num_contexts: number
}

interface EvaluationSummary {
  total_cases: number
  avg_overall_score: number
  avg_response_time: number
  metrics: {
    faithfulness: number
    answer_relevancy: number
    context_precision: number
    context_recall: number
    context_relevancy: number
  }
  performance_by_category: Record<string, { mean: number; std: number }>
  category_averages: Record<string, number>
}

export default function EvaluationPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [summary, setSummary] = useState<EvaluationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('personal')

  const categories = [
    { value: 'personal', label: 'Personal Questions' },
    { value: 'experience', label: 'Experience Questions' },
    { value: 'skills', label: 'Skills Questions' },
    { value: 'projects', label: 'Projects Questions' },
    { value: 'education', label: 'Education Questions' },
    { value: 'behaviour', label: 'Behaviour Questions' }
  ]

  const runEvaluation = async () => {
    setIsRunning(true)
    setProgress(0)
    setError(null)
    setResults([])
    setSummary(null)
    setCurrentStatus('Initializing evaluation...')

    try {
      const response = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: selectedCategory
        })
      })

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          try {
            const data = JSON.parse(line)
            
            console.log('Received data:', data) // Add debugging
            
            if (data.type === 'progress') {
              setProgress(data.progress)
              setCurrentStatus(data.status)
            } else if (data.type === 'result') {
              setResults(prev => [...prev, data.result])
            } else if (data.type === 'summary') {
              setSummary(data.summary)
            } else if (data.type === 'complete') {
              setCurrentStatus('Evaluation complete!')
              setProgress(100)
            } else if (data.type === 'error') {
              setError(data.error)
            }
          } catch (e) {
            console.warn('Failed to parse line:', line, 'Error:', e)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsRunning(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return 'default'
    if (score >= 0.6) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">RAG System Evaluation Suite</h1>
        <p className="text-gray-600">
          Comprehensive evaluation of your RAG system using GROQ-based metrics
        </p>
      </div>

      {/* Control Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Evaluation Control Panel
          </CardTitle>
          <CardDescription>
            Run comprehensive evaluation tests to measure RAG system performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label htmlFor="category-select" className="text-sm font-medium">
                Select Question Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={isRunning}
              >
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Each category contains 5 test cases, each run twice for accuracy comparison
              </p>
            </div>
            
            <Button 
              onClick={runEvaluation} 
              disabled={isRunning}
              className="w-full sm:w-auto"
            >
              {isRunning ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Running Evaluation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Evaluation
                </>
              )}
            </Button>
            
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600">{currentStatus}</p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {(summary || results.length > 0) && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Detailed Results</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            {summary && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Total Cases</p>
                          <p className="text-2xl font-bold">{summary.total_cases}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Avg Score</p>
                          <p className={`text-2xl font-bold ${getScoreColor(summary.avg_overall_score)}`}>
                            {summary.avg_overall_score.toFixed(3)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium">Avg Time</p>
                          <p className="text-2xl font-bold">{summary.avg_response_time.toFixed(2)}s</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Metrics Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                      {Object.entries(summary.metrics).map(([metric, score]) => (
                        <div key={metric} className="text-center">
                          <p className="text-sm font-medium capitalize mb-1">
                            {metric.replace('_', ' ')}
                          </p>
                          <Badge variant={getScoreBadgeVariant(score)} className="text-lg">
                            {score.toFixed(3)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Metrics Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <D3Visualizations results={results} summary={summary} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Detailed Results Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4">
              {(() => {
                // Group results by test case index
                const groupedResults: { [key: number]: EvaluationResult[] } = {}
                results.forEach((result, index) => {
                  const testCaseIndex = (result as any).test_case_index ?? Math.floor(index / 2)
                  if (!groupedResults[testCaseIndex]) {
                    groupedResults[testCaseIndex] = []
                  }
                  groupedResults[testCaseIndex].push(result)
                })

                return Object.entries(groupedResults).map(([testIndex, testResults]) => (
                  <Card key={testIndex} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg">Test Case {parseInt(testIndex) + 1}</CardTitle>
                      <CardDescription>
                        {testResults[0].question}
                      </CardDescription>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{testResults[0].category}</Badge>
                        <Badge variant="outline">{testResults[0].difficulty}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Generated Answers Side-by-Side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {testResults.map((result, runIndex) => (
                          <div key={runIndex} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold">Run {runIndex + 1}</h4>
                              <div className="flex gap-2">
                                <Badge variant={getScoreBadgeVariant(result.overall_score)}>
                                  {result.overall_score.toFixed(3)}
                                </Badge>
                                <Badge variant="outline">
                                  {result.response_time.toFixed(2)}s
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium mb-2">Generated Answer:</p>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                {result.generated_answer}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Metrics Comparison Box */}
                      <div className="border rounded-lg p-4 mb-4">
                        <h5 className="font-semibold mb-3">Evaluation Metrics</h5>
                        <div className="space-y-3">
                          {/* Faithfulness */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Faithfulness</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[0]?.faithfulness || 0)}`}>
                                  {testResults[0]?.faithfulness.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[1]?.faithfulness || 0)}`}>
                                  {testResults[1]?.faithfulness.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Answer Relevancy */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Answer Relevancy</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[0]?.answer_relevancy || 0)}`}>
                                  {testResults[0]?.answer_relevancy.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[1]?.answer_relevancy || 0)}`}>
                                  {testResults[1]?.answer_relevancy.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Context Precision */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Context Precision</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[0]?.context_precision || 0)}`}>
                                  {testResults[0]?.context_precision.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[1]?.context_precision || 0)}`}>
                                  {testResults[1]?.context_precision.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Context Recall */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Context Recall</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[0]?.context_recall || 0)}`}>
                                  {testResults[0]?.context_recall.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[1]?.context_recall || 0)}`}>
                                  {testResults[1]?.context_recall.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Context Relevancy */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Context Relevancy</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[0]?.context_relevancy || 0)}`}>
                                  {testResults[0]?.context_relevancy.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor(testResults[1]?.context_relevancy || 0)}`}>
                                  {testResults[1]?.context_relevancy.toFixed(3) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Answer Correctness */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Answer Correctness</span>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 1</Badge>
                                <p className={`text-sm font-bold ${getScoreColor((testResults[0] as any)?.answer_correctness || 0)}`}>
                                  {((testResults[0] as any)?.answer_correctness?.toFixed(3)) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-1">Run 2</Badge>
                                <p className={`text-sm font-bold ${getScoreColor((testResults[1] as any)?.answer_correctness || 0)}`}>
                                  {((testResults[1] as any)?.answer_correctness?.toFixed(3)) || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Comparison Summary for this test case */}
                      {testResults.length === 2 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-semibold mb-2">Comparison</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="font-medium">Score Difference:</p>
                              <p className={`${Math.abs(testResults[0].overall_score - testResults[1].overall_score) < 0.1 ? 'text-green-600' : 'text-orange-600'}`}>
                                {Math.abs(testResults[0].overall_score - testResults[1].overall_score).toFixed(3)}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Time Difference:</p>
                              <p className="text-gray-600">
                                {Math.abs(testResults[0].response_time - testResults[1].response_time).toFixed(2)}s
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Consistency:</p>
                              <p className={`${Math.abs(testResults[0].overall_score - testResults[1].overall_score) < 0.1 ? 'text-green-600' : 'text-orange-600'}`}>
                                {Math.abs(testResults[0].overall_score - testResults[1].overall_score) < 0.1 ? 'High' : 'Low'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Better Run:</p>
                              <p className="text-blue-600">
                                Run {testResults[0].overall_score > testResults[1].overall_score ? '1' : '2'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              })()}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}