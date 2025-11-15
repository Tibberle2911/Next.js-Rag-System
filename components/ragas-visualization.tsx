'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * New Evaluation Result Interface
 * Following RAGAS-only evaluation pattern
 */
interface EvaluationResult {
  question: string
  category: string
  difficulty: string
  generated_answer: string
  response_time: number
  // RAGAS metrics ONLY (6 metrics)
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevance: number
  answer_correctness: number
  overall_score: number
  num_contexts: number
  rag_mode: string
  run_number?: number
  test_case_index?: number
  evaluation_method: string
  // LangChain feedback (not metrics)
  feedback?: {
    overall_assessment: string
    strengths: string
    weaknesses: string
    recommendations: string
    context_analysis: string
  }
}

interface EvaluationSummary {
  total_cases: number
  avg_overall_score: number
  avg_response_time: number
  metrics: {
    // RAGAS metrics ONLY
    faithfulness: number
    answer_relevancy: number
    context_precision: number
    context_recall: number
    context_relevance: number
    answer_correctness: number
  }
  performance_by_category: Record<string, { mean: number; std: number }>
  category_averages: Record<string, number}
  evaluation_methods: string[]
  method_performance: Record<string, {
    count: number
    mean: number
    std: number
  }>
}

interface Props {
  results: EvaluationResult[]
  summary: EvaluationSummary
}

export default function RAGASVisualization({ results, summary }: Props) {
  const radarChartRef = useRef<SVGSVGElement>(null)
  const barChartRef = useRef<SVGSVGElement>(null)
  const scatterPlotRef = useRef<SVGSVGElement>(null)
  const heatmapRef = useRef<SVGSVGElement>(null)
  const performanceTrendRef = useRef<SVGSVGElement>(null)
  
  const [selectedMetric, setSelectedMetric] = useState<string>('overall_score')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any>(null)
  const [chartTheme] = useState<'light' | 'dark'>('dark')
  
  // RAGAS-specific color scheme (6 metrics)
  const ragasMetrics = [
    { key: 'faithfulness', label: 'Faithfulness', color: '#3b82f6', description: 'Factual consistency with context' },
    { key: 'answer_relevancy', label: 'Answer Relevancy', color: '#8b5cf6', description: 'Relevance to question' },
    { key: 'context_precision', label: 'Context Precision', color: '#10b981', description: 'Precision of retrieved contexts' },
    { key: 'context_recall', label: 'Context Recall', color: '#f59e0b', description: 'Recall of relevant contexts' },
    { key: 'context_relevance', label: 'Context Relevance', color: '#ef4444', description: 'Relevance of contexts' },
    { key: 'answer_correctness', label: 'Answer Correctness', color: '#06b6d4', description: 'Overall answer correctness' }
  ]
  
  const colorSchemes = {
    primary: ragasMetrics.map(m => m.color),
    gradient: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd']
  }

  // Enhanced dark theme for charts
  const chartStyle = {
    background: chartTheme === 'dark' ? '#1f2937' : '#ffffff',
    text: chartTheme === 'dark' ? '#f3f4f6' : '#1f2937',
    grid: chartTheme === 'dark' ? '#374151' : '#e5e7eb',
    tooltip: chartTheme === 'dark' ? '#111827' : '#ffffff'
  }

  useEffect(() => {
    if (results.length > 0) {
      drawRadarChart()
      drawBarChart()
      drawScatterPlot()
      drawHeatmap()
      drawPerformanceTrend()
    }
  }, [results, summary, selectedMetric, selectedCategory, chartTheme])

  /**
   * Radar Chart - RAGAS Metrics Overview
   */
  const drawRadarChart = () => {
    if (!radarChartRef.current) return

    const svg = d3.select(radarChartRef.current)
    svg.selectAll('*').remove()

    const width = radarChartRef.current.clientWidth
    const height = 400
    const margin = { top: 50, right: 100, bottom: 50, left: 100 }
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    // Prepare data
    const data = ragasMetrics.map(metric => ({
      metric: metric.label,
      value: summary.metrics[metric.key as keyof typeof summary.metrics] || 0,
      color: metric.color
    }))

    const angleSlice = (Math.PI * 2) / data.length

    // Create scales
    const rScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, radius])

    // Draw circular grid
    const levels = 5
    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i
      
      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', chartStyle.grid)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')

      g.append('text')
        .attr('x', 5)
        .attr('y', -levelRadius)
        .attr('fill', chartStyle.text)
        .attr('font-size', '10px')
        .text((i * 0.2).toFixed(1))
    }

    // Draw axes
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', chartStyle.grid)
        .attr('stroke-width', 1)

      // Labels
      const labelX = Math.cos(angle) * (radius + 40)
      const labelY = Math.sin(angle) * (radius + 40)

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d.color)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(d.metric)
    })

    // Draw data polygon
    const lineGenerator = d3.lineRadial()
      .angle((d, i) => i * angleSlice)
      .radius(d => rScale(d.value))
      .curve(d3.curveLinearClosed)

    g.append('path')
      .datum(data)
      .attr('d', lineGenerator as any)
      .attr('fill', colorSchemes.primary[0])
      .attr('fill-opacity', 0.2)
      .attr('stroke', colorSchemes.primary[0])
      .attr('stroke-width', 2)

    // Draw data points
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2
      const x = Math.cos(angle) * rScale(d.value)
      const y = Math.sin(angle) * rScale(d.value)

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', d.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this).attr('r', 8)
          setHoveredDataPoint(d)
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 5)
          setHoveredDataPoint(null)
        })
    })
  }

  /**
   * Bar Chart - RAGAS Metrics Comparison
   */
  const drawBarChart = () => {
    if (!barChartRef.current) return

    const svg = d3.select(barChartRef.current)
    svg.selectAll('*').remove()

    const width = barChartRef.current.clientWidth
    const height = 300
    const margin = { top: 20, right: 30, bottom: 60, left: 60 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Prepare data
    const data = ragasMetrics.map(metric => ({
      metric: metric.label,
      value: summary.metrics[metric.key as keyof typeof summary.metrics] || 0,
      color: metric.color
    }))

    // Create scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.metric))
      .range([0, chartWidth])
      .padding(0.2)

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([chartHeight, 0])

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', chartStyle.text)
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number * 100).toFixed(0)}%`))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    // Draw bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.metric)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => chartHeight - y(d.value))
      .attr('fill', d => d.color)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1)
        setHoveredDataPoint(d)
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8)
        setHoveredDataPoint(null)
      })

    // Add value labels
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => x(d.metric)! + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', chartStyle.text)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text(d => d.value.toFixed(3))
  }

  /**
   * Scatter Plot - Overall Score vs Response Time
   */
  const drawScatterPlot = () => {
    if (!scatterPlotRef.current) return

    const svg = d3.select(scatterPlotRef.current)
    svg.selectAll('*').remove()

    const width = scatterPlotRef.current.clientWidth
    const height = 300
    const margin = { top: 20, right: 30, bottom: 50, left: 60 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(results, d => d.response_time) || 1])
      .range([0, chartWidth])

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([chartHeight, 0])

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', chartStyle.text)
      .text('Response Time (ms)')

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number * 100).toFixed(0)}%`))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', chartStyle.text)
      .text('Overall Score')

    // Draw points
    g.selectAll('.point')
      .data(results)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.response_time))
      .attr('cy', d => y(d.overall_score))
      .attr('r', 5)
      .attr('fill', d => d.rag_mode === 'advanced' ? '#8b5cf6' : '#3b82f6')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8).attr('opacity', 1)
        setHoveredDataPoint(d)
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5).attr('opacity', 0.7)
        setHoveredDataPoint(null)
      })
  }

  /**
   * Heatmap - RAGAS Metrics by Category
   */
  const drawHeatmap = () => {
    if (!heatmapRef.current) return

    const svg = d3.select(heatmapRef.current)
    svg.selectAll('*').remove()

    const width = heatmapRef.current.clientWidth
    const height = 300
    const margin = { top: 20, right: 30, bottom: 80, left: 120 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Prepare heatmap data
    const categories = Array.from(new Set(results.map(r => r.category)))
    const heatmapData = []

    for (const category of categories) {
      for (const metric of ragasMetrics) {
        const categoryResults = results.filter(r => r.category === category)
        const avgValue = d3.mean(categoryResults, r => r[metric.key as keyof EvaluationResult] as number) || 0

        heatmapData.push({
          category,
          metric: metric.label,
          value: avgValue
        })
      }
    }

    // Create scales
    const x = d3.scaleBand()
      .domain(ragasMetrics.map(m => m.label))
      .range([0, chartWidth])
      .padding(0.05)

    const y = d3.scaleBand()
      .domain(categories)
      .range([0, chartHeight])
      .padding(0.05)

    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateBlues)

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', chartStyle.text)
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    // Draw heatmap cells
    g.selectAll('.cell')
      .data(heatmapData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => x(d.metric)!)
      .attr('y', d => y(d.category)!)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', chartStyle.grid)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2)
        setHoveredDataPoint(d)
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 1)
        setHoveredDataPoint(null)
      })

    // Add value labels
    g.selectAll('.cell-label')
      .data(heatmapData)
      .enter()
      .append('text')
      .attr('class', 'cell-label')
      .attr('x', d => x(d.metric)! + x.bandwidth() / 2)
      .attr('y', d => y(d.category)! + y.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => d.value > 0.5 ? '#fff' : '#000')
      .attr('font-size', '10px')
      .text(d => d.value.toFixed(2))
  }

  /**
   * Performance Trend - RAGAS Scores Over Time
   */
  const drawPerformanceTrend = () => {
    if (!performanceTrendRef.current || results.length === 0) return

    const svg = d3.select(performanceTrendRef.current)
    svg.selectAll('*').remove()

    const width = performanceTrendRef.current.clientWidth
    const height = 300
    const margin = { top: 20, right: 120, bottom: 50, left: 60 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, results.length - 1])
      .range([0, chartWidth])

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([chartHeight, 0])

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(10, results.length)))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', chartStyle.text)
      .text('Test Case')

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number * 100).toFixed(0)}%`))
      .selectAll('text')
      .attr('fill', chartStyle.text)

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', chartStyle.text)
      .text('Score')

    // Draw line for each RAGAS metric
    ragasMetrics.forEach(metric => {
      const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d[metric.key as keyof EvaluationResult] as number || 0))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(results)
        .attr('d', line as any)
        .attr('fill', 'none')
        .attr('stroke', metric.color)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)

      // Legend
      const legendY = ragasMetrics.indexOf(metric) * 20

      g.append('rect')
        .attr('x', chartWidth + 10)
        .attr('y', legendY)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', metric.color)

      g.append('text')
        .attr('x', chartWidth + 30)
        .attr('y', legendY + 12)
        .attr('fill', chartStyle.text)
        .attr('font-size', '11px')
        .text(metric.label)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with RAGAS info */}
      <Alert className="bg-blue-950/50 border-blue-800">
        <AlertDescription>
          <strong>RAGAS Evaluation System</strong>: All metrics generated using authentic RAGAS framework. 
          LangChain provides dataset generation and post-evaluation feedback only.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_cases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary.avg_overall_score * 100).toFixed(1)}%</div>
            <Badge variant="secondary"className="mt-1">
              RAGAS 6-Metric Avg
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avg_response_time.toFixed(0)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evaluation Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">RAGAS Only</div>
            <Badge variant="outline" className="mt-1">
              {summary.evaluation_methods.join(', ')}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* RAGAS Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {ragasMetrics.map(metric => (
          <Card key={metric.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium" style={{ color: metric.color }}>
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {((summary.metrics[metric.key as keyof typeof summary.metrics] || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visualization Tabs */}
      <Tabs defaultValue="radar" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="radar">Radar Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="scatter">Scatter Plot</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="trend">Performance Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>RAGAS Metrics Radar Chart</CardTitle>
              <CardDescription>6-dimensional visualization of RAGAS evaluation metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={radarChartRef} className="w-full" />
              {hoveredDataPoint && (
                <div className="mt-4 p-4 bg-secondary rounded-lg">
                  <p className="font-semibold">{hoveredDataPoint.metric}</p>
                  <p className="text-sm">Score: {(hoveredDataPoint.value * 100).toFixed(1)}%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar">
          <Card>
            <CardHeader>
              <CardTitle>RAGAS Metrics Bar Chart</CardTitle>
              <CardDescription>Comparative view of all 6 RAGAS metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={barChartRef} className="w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scatter">
          <Card>
            <CardHeader>
              <CardTitle>Overall Score vs Response Time</CardTitle>
              <CardDescription>Performance scatter plot for all test cases</CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={scatterPlotRef} className="w-full" />
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="text-sm">Basic Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                  <span className="text-sm">Advanced Mode</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>RAGAS Metrics Heatmap by Category</CardTitle>
              <CardDescription>Category-wise performance across all RAGAS metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={heatmapRef} className="w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>RAGAS Performance Trend</CardTitle>
              <CardDescription>Score progression across test cases for all 6 metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={performanceTrendRef} className="w-full" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LangChain Feedback Section */}
      {results.length > 0 && results[0].feedback && (
        <Card>
          <CardHeader>
            <CardTitle>LangChain Comprehensive Feedback</CardTitle>
            <CardDescription>Post-evaluation analysis and recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Overall Assessment</h4>
              <p className="text-sm text-muted-foreground">{results[0].feedback.overall_assessment}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-green-500">Strengths</h4>
                <p className="text-sm text-muted-foreground">{results[0].feedback.strengths}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 text-yellow-500">Weaknesses</h4>
                <p className="text-sm text-muted-foreground">{results[0].feedback.weaknesses}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-blue-500">Recommendations</h4>
              <p className="text-sm text-muted-foreground">{results[0].feedback.recommendations}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Context Analysis</h4>
              <p className="text-sm text-muted-foreground">{results[0].feedback.context_analysis}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
