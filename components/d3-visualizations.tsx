'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface EvaluationResult {
  question: string
  category: string
  difficulty: string
  generated_answer: string
  response_time: number
  // RAGAS/GROQ metrics (always available)
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  answer_correctness?: number
  overall_score: number
  num_contexts: number
  rag_mode: string
  run_number?: number
  test_case_index?: number
  // Individual/LangChain metrics (optional)
  relevance?: number
  coherence?: number
  factual_accuracy?: number
  completeness?: number
  context_usage?: number
  professional_tone?: number
  evaluation_method?: string
  metric_sources?: {
    primary_evaluator: string
    available_metrics: {
      ragas_groq: string[]
      individual_langchain: string[]
    }
  }
}

interface EvaluationSummary {
  total_cases: number
  avg_overall_score: number
  avg_response_time: number
  metrics: {
    // RAGAS/GROQ metrics (always available)
    faithfulness: number
    answer_relevancy: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness?: number
    // Individual/LangChain metrics (when available)
    relevance?: number
    coherence?: number
    factual_accuracy?: number
    completeness?: number
    context_usage?: number
    professional_tone?: number
  }
  performance_by_category: Record<string, { mean: number; std: number }>
  category_averages: Record<string, number>
  evaluation_methods?: string[]
  method_performance?: Record<string, {
    count: number
    mean: number
    std: number
  }>
  metric_coverage?: {
    has_individual_metrics: boolean
    available_base_metrics: string[]
    available_individual_metrics: string[]
    total_unique_metrics: number
  }
}

interface Props {
  results: EvaluationResult[]
  summary: EvaluationSummary
}

export default function D3Visualizations({ results, summary }: Props) {
  const radarChartRef = useRef<SVGSVGElement>(null)
  const barChartRef = useRef<SVGSVGElement>(null)
  const scatterPlotRef = useRef<SVGSVGElement>(null)
  const heatmapRef = useRef<SVGSVGElement>(null)
  const [selectedMetric, setSelectedMetric] = useState<string>('overall_score')

  // Enhanced metrics radar chart
  useEffect(() => {
    if (!summary || !radarChartRef.current) return

    // Clear previous content
    d3.select(radarChartRef.current).selectAll("*").remove()

    // Create radar chart for comprehensive metrics overview
    const svg = d3.select(radarChartRef.current)
    const width = 500
    const height = 500
    const margin = 100

    svg.attr("width", width).attr("height", height)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - margin

    // Comprehensive metrics list - prioritize based on evaluation method and availability
    const hasIndividualMetrics = results.some(r => r.evaluation_method === 'individual_metrics' || r.relevance !== undefined)
    const hasLangChainMetrics = results.some(r => r.evaluation_method === 'langchain')
    
    let metricsConfig: Array<{key: keyof EvaluationResult, label: string, color: string, category: string}> = []
    
    if (hasIndividualMetrics || hasLangChainMetrics) {
      // Use Individual/LangChain metrics as primary (more detailed and accurate)
      const individualMetrics = [
        { key: 'relevance' as keyof EvaluationResult, label: 'Relevance', color: '#3b82f6', category: 'individual' },
        { key: 'coherence' as keyof EvaluationResult, label: 'Coherence', color: '#8b5cf6', category: 'individual' },
        { key: 'factual_accuracy' as keyof EvaluationResult, label: 'Accuracy', color: '#10b981', category: 'individual' },
        { key: 'completeness' as keyof EvaluationResult, label: 'Completeness', color: '#f59e0b', category: 'individual' },
        { key: 'context_usage' as keyof EvaluationResult, label: 'Context Usage', color: '#ef4444', category: 'individual' },
        { key: 'professional_tone' as keyof EvaluationResult, label: 'Professional Tone', color: '#06b6d4', category: 'individual' }
      ]
      
      // Add available individual metrics
      individualMetrics.forEach(metric => {
        const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null)
        if (hasValues) {
          metricsConfig.push(metric)
        }
      })
      
      // If we have less than 4 individual metrics, supplement with RAGAS metrics
      if (metricsConfig.length < 4) {
        const ragasMetrics = [
          { key: 'faithfulness' as keyof EvaluationResult, label: 'Faithfulness', color: '#ec4899', category: 'ragas' },
          { key: 'answer_relevancy' as keyof EvaluationResult, label: 'Answer Relevancy', color: '#14b8a6', category: 'ragas' },
          { key: 'context_precision' as keyof EvaluationResult, label: 'Context Precision', color: '#f97316', category: 'ragas' },
          { key: 'context_recall' as keyof EvaluationResult, label: 'Context Recall', color: '#84cc16', category: 'ragas' }
        ]
        
        ragasMetrics.forEach(metric => {
          if (metricsConfig.length < 8) { // Limit to 8 total metrics for readability
            const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null)
            if (hasValues) {
              metricsConfig.push(metric)
            }
          }
        })
      }
    } else {
      // Fallback to RAGAS/GROQ metrics only
      metricsConfig = [
        { key: 'faithfulness', label: 'Faithfulness', color: '#3b82f6', category: 'ragas' },
        { key: 'answer_relevancy', label: 'Answer Relevancy', color: '#8b5cf6', category: 'ragas' },
        { key: 'context_precision', label: 'Context Precision', color: '#10b981', category: 'ragas' },
        { key: 'context_recall', label: 'Context Recall', color: '#f59e0b', category: 'ragas' },
        { key: 'context_relevancy', label: 'Context Relevancy', color: '#ef4444', category: 'ragas' },
        { key: 'answer_correctness', label: 'Answer Correctness', color: '#06b6d4', category: 'ragas' }
      ].filter(metric => {
        const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null)
        return hasValues
      })
    }

    // Filter out undefined metrics and calculate average values
    const validMetrics = metricsConfig.filter(metric => {
      const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null)
      return hasValues
    }).map(metric => ({
      ...metric,
      value: results.reduce((sum, result) => sum + (result[metric.key] || 0), 0) / results.length
    }))

    if (validMetrics.length === 0) {
      // Show error message if no valid metrics
      svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6b7280")
        .text("No metrics available for visualization")
      return
    }

    const angleSlice = (Math.PI * 2) / validMetrics.length

    // Create scales
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius])

    // Create main group
    const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`)

    // Add background circles
    const levels = 5
    for (let level = 0; level < levels; level++) {
      const levelRadius = (radius / levels) * (level + 1)
      g.append("circle")
        .attr("r", levelRadius)
        .attr("fill", "none")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1)
        .attr("opacity", 0.6)

      // Add level labels
      if (level < levels - 1) {
        g.append("text")
          .attr("x", 5)
          .attr("y", -levelRadius)
          .attr("text-anchor", "start")
          .attr("dominant-baseline", "middle")
          .style("font-size", "10px")
          .style("fill", "#9ca3af")
          .text(((level + 1) * 0.2).toFixed(1))
      }
    }

    // Add axis lines and labels
    validMetrics.forEach((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      // Add axis line
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 1)

      // Add labels with better positioning
      const labelRadius = radius + 35
      const labelX = Math.cos(angle) * labelRadius
      const labelY = Math.sin(angle) * labelRadius
      
      const label = g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", metric.color)
        .text(metric.label)

      // Add background for better readability
      const bbox = label.node()?.getBBox()
      if (bbox) {
        g.insert("rect", () => label.node())
          .attr("x", labelX - bbox.width/2 - 2)
          .attr("y", labelY - bbox.height/2 - 1)
          .attr("width", bbox.width + 4)
          .attr("height", bbox.height + 2)
          .attr("fill", "white")
          .attr("opacity", 0.8)
          .attr("rx", 2)
      }
    })

    // Create the data path
    const pathData = validMetrics.map((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const value = metric.value
      const x = Math.cos(angle) * rScale(value)
      const y = Math.sin(angle) * rScale(value)
      return [x, y]
    })

    // Create line generator
    const line = d3.line<number[]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveLinearClosed)

    // Add the path with gradient
    const gradient = svg.append("defs").append("linearGradient")
      .attr("id", "radarGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 0).attr("y2", height)

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.4)

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 0.1)

    g.append("path")
      .datum(pathData)
      .attr("d", line)
      .attr("fill", "url(#radarGradient)")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("opacity", 0.8)

    // Add interactive points
    pathData.forEach((point, i) => {
      const metric = validMetrics[i]
      g.append("circle")
        .attr("cx", point[0])
        .attr("cy", point[1])
        .attr("r", 6)
        .attr("fill", metric.color)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          // Enhanced tooltip
          const tooltip = g.append("g")
            .attr("class", "tooltip")
            .attr("transform", `translate(${point[0] + 15}, ${point[1] - 15})`)

          const rect = tooltip.append("rect")
            .attr("x", -5)
            .attr("y", -25)
            .attr("width", 140)
            .attr("height", 35)
            .attr("fill", "#1f2937")
            .attr("rx", 6)
            .attr("opacity", 0.95)
            .attr("stroke", metric.color)
            .attr("stroke-width", 2)

          tooltip.append("text")
            .attr("x", 65)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("fill", "white")
            .style("font-weight", "600")
            .text(metric.label)

          tooltip.append("text")
            .attr("x", 65)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "14px")
            .style("fill", metric.color)
            .style("font-weight", "bold")
            .text(`${(metric.value * 100).toFixed(1)}%`)
        })
        .on("mouseout", function() {
          g.selectAll(".tooltip").remove()
        })
        .on("click", function() {
          setSelectedMetric(metric.key as string)
        })
    })

    // Add evaluation method and metric category indicators
    const evaluationMethods = [...new Set(results.map(r => r.evaluation_method).filter(Boolean))]
    const metricCategories = [...new Set(validMetrics.map(m => m.category))]
    
    if (evaluationMethods.length > 0) {
      g.append('text')
        .attr('x', 0)
        .attr('y', radius + 70)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#6b7280')
        .style('font-weight', '600')
        .text(`Methods: ${evaluationMethods.join(', ')}`)
    }
    
    if (metricCategories.length > 1) {
      g.append('text')
        .attr('x', 0)
        .attr('y', radius + 85)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#9ca3af')
        .text(`Categories: ${metricCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' + ')}`)
    }

  }, [summary, results])

  // Performance comparison bar chart
  useEffect(() => {
    if (!summary || !barChartRef.current) return

    d3.select(barChartRef.current).selectAll("*").remove()

    const svg = d3.select(barChartRef.current)
    const width = 500
    const height = 300
    const margin = { top: 20, right: 30, bottom: 60, left: 80 }

    svg.attr("width", width).attr("height", height)

    const categoryData = Object.entries(summary.category_averages).map(([category, average]) => ({
      category,
      average,
      std: summary.performance_by_category[category]?.std || 0
    }))

    if (categoryData.length === 0) return

    const xScale = d3.scaleBand()
      .domain(categoryData.map(d => d.category))
      .range([margin.left, width - margin.right])
      .padding(0.2)

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    // Add bars
    svg.selectAll(".bar")
      .data(categoryData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.category)!)
      .attr("y", d => yScale(d.average))
      .attr("width", xScale.bandwidth())
      .attr("height", d => yScale(0) - yScale(d.average))
      .attr("fill", (d, i) => colorScale(i.toString()))
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1)
        
        // Add tooltip
        const tooltip = svg.append("g").attr("class", "tooltip")
        
        const currentBar = d3.select(this)
        const barX = currentBar.attr("x")
        const barY = currentBar.attr("y")
        
        if (barX && barY) {
          const rect = tooltip.append("rect")
            .attr("x", +barX + xScale.bandwidth()/2 - 40)
            .attr("y", +barY - 35)
            .attr("width", 80)
            .attr("height", 25)
            .attr("fill", "#1f2937")
            .attr("rx", 4)
            .attr("opacity", 0.9)
        }

          const currentBar = d3.select(this)
          const barX = currentBar.attr("x")
          const barY = currentBar.attr("y")
          
          if (barX && barY) {
            tooltip.append("text")
              .attr("x", +barX + xScale.bandwidth()/2)
              .attr("y", +barY - 20)
              .attr("text-anchor", "middle")
              .style("font-size", "12px")
              .style("fill", "white")
              .style("font-weight", "600")
              .text(`${(d.average * 100).toFixed(1)}%`)
          }
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8)
        svg.selectAll(".tooltip").remove()
      })

    // Add error bars for standard deviation
    svg.selectAll(".error-bar")
      .data(categoryData)
      .enter()
      .append("line")
      .attr("class", "error-bar")
      .attr("x1", d => xScale(d.category)! + xScale.bandwidth()/2)
      .attr("x2", d => xScale(d.category)! + xScale.bandwidth()/2)
      .attr("y1", d => yScale(Math.max(0, d.average - d.std)))
      .attr("y2", d => yScale(Math.min(1, d.average + d.std)))
      .attr("stroke", "#374151")
      .attr("stroke-width", 2)

    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "11px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${(+d * 100).toFixed(0)}%`))

    // Add y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 20)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text("Average Score")

  }, [summary])

  // Response time vs. accuracy scatter plot
  useEffect(() => {
    if (!results || !scatterPlotRef.current) return

    d3.select(scatterPlotRef.current).selectAll("*").remove()

    const svg = d3.select(scatterPlotRef.current)
    const width = 500
    const height = 300
    const margin = { top: 20, right: 30, bottom: 60, left: 80 }

    svg.attr("width", width).attr("height", height)

    const xScale = d3.scaleLinear()
      .domain(d3.extent(results, d => d.response_time) as [number, number])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    const colorScale = d3.scaleOrdinal()
      .domain([...new Set(results.map(d => d.category))])
      .range(d3.schemeCategory10)

    // Add points
    svg.selectAll(".dot")
      .data(results)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.response_time))
      .attr("cy", d => yScale(d.overall_score))
      .attr("r", 5)
      .attr("fill", d => colorScale(d.category) as string)
      .attr("opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 7).attr("opacity", 1)
        
        // Enhanced tooltip
        const tooltip = svg.append("g").attr("class", "tooltip")
        
        const rect = tooltip.append("rect")
          .attr("x", xScale(d.response_time) + 10)
          .attr("y", yScale(d.overall_score) - 40)
          .attr("width", 160)
          .attr("height", 60)
          .attr("fill", "#1f2937")
          .attr("rx", 4)
          .attr("opacity", 0.95)
          .attr("stroke", colorScale(d.category) as string)
          .attr("stroke-width", 2)

        tooltip.append("text")
          .attr("x", xScale(d.response_time) + 80)
          .attr("y", yScale(d.overall_score) - 25)
          .attr("text-anchor", "middle")
          .style("font-size", "11px")
          .style("fill", "white")
          .style("font-weight", "600")
          .text(`${d.category} | ${d.rag_mode}`)

        tooltip.append("text")
          .attr("x", xScale(d.response_time) + 80)
          .attr("y", yScale(d.overall_score) - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#d1d5db")
          .text(`Score: ${(d.overall_score * 100).toFixed(1)}%`)

        tooltip.append("text")
          .attr("x", xScale(d.response_time) + 80)
          .attr("y", yScale(d.overall_score) + 5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#d1d5db")
          .text(`Time: ${d.response_time.toFixed(2)}s`)
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 5).attr("opacity", 0.7)
        svg.selectAll(".tooltip").remove()
      })

    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${(+d * 100).toFixed(0)}%`))

    // Add axis labels
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text("Response Time (seconds)")

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 20)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text("Overall Score")

  }, [results])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="radar" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="radar">Metrics Overview</TabsTrigger>
          <TabsTrigger value="categories">Category Performance</TabsTrigger>
          <TabsTrigger value="scatter">Time vs Accuracy</TabsTrigger>
          <TabsTrigger value="summary">Detailed Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="radar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Metrics Radar Chart</CardTitle>
              <CardDescription>
                Interactive radar chart showing all evaluation metrics. Click on points to explore individual metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg ref={radarChartRef}></svg>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
              <CardDescription>
                Average performance across different question categories with standard deviation error bars.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg ref={barChartRef}></svg>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scatter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time vs. Accuracy Analysis</CardTitle>
              <CardDescription>
                Scatter plot showing the relationship between response time and evaluation scores across categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg ref={scatterPlotRef}></svg>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evaluation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Cases:</span>
                  <Badge variant="outline">{summary.total_cases}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Score:</span>
                  <Badge variant="default">{(summary.avg_overall_score * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response Time:</span>
                  <Badge variant="outline">{summary.avg_response_time.toFixed(2)}s</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comprehensive Metric Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* RAGAS/GROQ Metrics */}
                <div>
                  <h4 className="text-xs font-semibold text-blue-600 mb-2">RAGAS/GROQ Metrics</h4>
                  <div className="space-y-1">
                    {['faithfulness', 'answer_relevancy', 'context_precision', 'context_recall', 'context_relevancy', 'answer_correctness'].map(metric => {
                      const value = summary.metrics[metric]
                      return value !== undefined ? (
                        <div key={metric} className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground capitalize">
                            {metric.replace('_', ' ')}:
                          </span>
                          <Badge variant="outline" className="text-xs">{(value * 100).toFixed(1)}%</Badge>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
                
                {/* Individual/LangChain Metrics */}
                {summary.metric_coverage?.has_individual_metrics && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-600 mb-2">Individual/LangChain Metrics</h4>
                    <div className="space-y-1">
                      {['relevance', 'coherence', 'factual_accuracy', 'completeness', 'context_usage', 'professional_tone'].map(metric => {
                        const value = summary.metrics[metric]
                        return value !== undefined ? (
                          <div key={metric} className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground capitalize">
                              {metric.replace('_', ' ')}:
                            </span>
                            <Badge variant="outline" className="text-xs">{(value * 100).toFixed(1)}%</Badge>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
                
                {/* Summary Stats */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">Total Metrics:</span>
                    <Badge variant="default" className="text-xs">
                      {summary.metric_coverage?.total_unique_metrics || Object.keys(summary.metrics).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Category Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(summary.category_averages).map(([category, average]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground capitalize">
                      {category}:
                    </span>
                    <Badge 
                      variant={average > 0.7 ? "default" : average > 0.5 ? "secondary" : "destructive"}
                    >
                      {(average * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Evaluation Method Performance */}
            {summary.method_performance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Evaluation Method Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(summary.method_performance).map(([method, stats]) => (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {method}:
                        </span>
                        <Badge variant="outline">
                          {stats.count} cases
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-xs text-muted-foreground">Avg Score:</span>
                        <Badge variant={stats.mean > 0.7 ? "default" : "secondary"}>
                          {(stats.mean * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}