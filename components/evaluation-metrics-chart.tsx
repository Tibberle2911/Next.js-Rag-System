'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface EvaluationMetrics {
  // RAGAS/GROQ metrics (always available for backward compatibility)
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  answer_correctness: number
  // Individual/LangChain metrics (available when using those evaluators)
  relevance?: number
  coherence?: number
  factual_accuracy?: number
  completeness?: number
  context_usage?: number
  professional_tone?: number
  evaluation_method?: string
}

interface Props {
  basicRAG: EvaluationMetrics
  advancedRAG: EvaluationMetrics
  evaluationMethod?: string
}

export default function EvaluationMetricsChart({ basicRAG, advancedRAG, evaluationMethod }: Props) {
  const chartRef = useRef<SVGSVGElement>(null)
  const comparisonRef = useRef<SVGSVGElement>(null)
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  // Determine evaluation method and available metrics
  const getEvaluationInfo = () => {
    const basicMethod = basicRAG.evaluation_method || evaluationMethod || 'groq'
    const advancedMethod = advancedRAG.evaluation_method || evaluationMethod || 'groq'
    
    // Comprehensive metrics list with all 12 metrics
    const allPossibleMetrics = [
      // Individual/LangChain metrics (preferred when available)
      { key: 'relevance' as keyof EvaluationMetrics, label: 'Relevance', description: 'How well the answer addresses the question', category: 'individual' },
      { key: 'coherence' as keyof EvaluationMetrics, label: 'Coherence', description: 'Logical structure and readability', category: 'individual' },
      { key: 'factual_accuracy' as keyof EvaluationMetrics, label: 'Factual Accuracy', description: 'Consistency with provided context', category: 'individual' },
      { key: 'completeness' as keyof EvaluationMetrics, label: 'Completeness', description: 'Thoroughness of the response', category: 'individual' },
      { key: 'context_usage' as keyof EvaluationMetrics, label: 'Context Usage', description: 'Effective utilization of retrieved information', category: 'individual' },
      { key: 'professional_tone' as keyof EvaluationMetrics, label: 'Professional Tone', description: 'Appropriateness of language and tone', category: 'individual' },
      // RAGAS/GROQ metrics (fallback or supplementary)
      { key: 'faithfulness' as keyof EvaluationMetrics, label: 'Faithfulness', description: 'Consistency with retrieved context', category: 'ragas' },
      { key: 'answer_relevancy' as keyof EvaluationMetrics, label: 'Answer Relevancy', description: 'How relevant the answer is to the question', category: 'ragas' },
      { key: 'context_precision' as keyof EvaluationMetrics, label: 'Context Precision', description: 'Relevance of retrieved context', category: 'ragas' },
      { key: 'context_recall' as keyof EvaluationMetrics, label: 'Context Recall', description: 'Coverage of relevant information', category: 'ragas' },
      { key: 'context_relevancy' as keyof EvaluationMetrics, label: 'Context Relevancy', description: 'Quality of context retrieval', category: 'ragas' },
      { key: 'answer_correctness' as keyof EvaluationMetrics, label: 'Answer Correctness', description: 'Overall correctness of the response', category: 'ragas' }
    ]
    
    // Determine which metrics to display based on availability
    const metricsToShow = allPossibleMetrics.filter(metric => {
      const basicValue = basicRAG[metric.key]
      const advancedValue = advancedRAG[metric.key]
      return (basicValue !== undefined && basicValue !== null) || 
             (advancedValue !== undefined && advancedValue !== null)
    })
    
    // If we have individual metrics, prioritize them, otherwise use RAGAS
    const hasIndividualMetrics = metricsToShow.some(m => m.category === 'individual')
    
    let finalMetrics = metricsToShow
    if (hasIndividualMetrics && metricsToShow.length > 8) {
      // Prioritize individual metrics when we have too many
      finalMetrics = metricsToShow.filter(m => m.category === 'individual')
      // Add some RAGAS metrics if we have room
      if (finalMetrics.length < 6) {
        const ragasMetrics = metricsToShow.filter(m => m.category === 'ragas')
        finalMetrics = [...finalMetrics, ...ragasMetrics.slice(0, 6 - finalMetrics.length)]
      }
    } else if (metricsToShow.length > 8) {
      // Limit to 8 metrics for readability
      finalMetrics = metricsToShow.slice(0, 8)
    }

    return { basicMethod, advancedMethod, metricsToShow: finalMetrics }
  }

  const { basicMethod, advancedMethod, metricsToShow } = getEvaluationInfo()

  // Main radar chart
  useEffect(() => {
    if (!chartRef.current) return

    // Clear previous content
    d3.select(chartRef.current).selectAll("*").remove()

    const svg = d3.select(chartRef.current)
    const width = 600
    const height = 600
    const margin = 120

    svg.attr("width", width).attr("height", height)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - margin

    // Filter metrics that have values
    const validMetrics = metricsToShow.filter(metric => {
      const basicValue = basicRAG[metric.key]
      const advancedValue = advancedRAG[metric.key]
      return (basicValue !== undefined && basicValue !== null) || 
             (advancedValue !== undefined && advancedValue !== null)
    })

    if (validMetrics.length === 0) {
      svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6b7280")
        .text("No metrics available for comparison")
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
        .attr("opacity", 0.5)

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
      const labelRadius = radius + 40
      const labelX = Math.cos(angle) * labelRadius
      const labelY = Math.sin(angle) * labelRadius
      
      const label = g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .style("cursor", "pointer")
        .text(metric.label)
        .on("mouseover", function() {
          setHoveredMetric(metric.key)
          
          // Add description tooltip
          const tooltip = g.append("g").attr("class", "metric-tooltip")
          
          const rect = tooltip.append("rect")
            .attr("x", labelX - 75)
            .attr("y", labelY + 15)
            .attr("width", 150)
            .attr("height", 30)
            .attr("fill", "#1f2937")
            .attr("rx", 4)
            .attr("opacity", 0.95)

          tooltip.append("text")
            .attr("x", labelX)
            .attr("y", labelY + 32)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text(metric.description)
        })
        .on("mouseout", function() {
          setHoveredMetric(null)
          g.selectAll(".metric-tooltip").remove()
        })

      // Add background for better readability
      const bbox = label.node()?.getBBox()
      if (bbox) {
        g.insert("rect", () => label.node())
          .attr("x", labelX - bbox.width/2 - 3)
          .attr("y", labelY - bbox.height/2 - 2)
          .attr("width", bbox.width + 6)
          .attr("height", bbox.height + 4)
          .attr("fill", "white")
          .attr("opacity", 0.9)
          .attr("rx", 3)
          .attr("stroke", "#d1d5db")
          .attr("stroke-width", 1)
      }
    })

    // Create data paths for both RAG systems
    const basicPathData = validMetrics.map((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const rawValue = basicRAG[metric.key]
      const value = typeof rawValue === 'number' ? Math.max(0, Math.min(1, rawValue)) : 0
      const x = Math.cos(angle) * rScale(value)
      const y = Math.sin(angle) * rScale(value)
      return [x, y]
    })

    const advancedPathData = validMetrics.map((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const rawValue = advancedRAG[metric.key]
      const value = typeof rawValue === 'number' ? Math.max(0, Math.min(1, rawValue)) : 0
      const x = Math.cos(angle) * rScale(value)
      const y = Math.sin(angle) * rScale(value)
      return [x, y]
    })

    // Create line generator
    const line = d3.line<number[]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveLinearClosed)

    // Add Basic RAG path
    g.append("path")
      .datum(basicPathData)
      .attr("d", line)
      .attr("fill", "rgba(59, 130, 246, 0.15)")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)

    // Add Advanced RAG path
    g.append("path")
      .datum(advancedPathData)
      .attr("d", line)
      .attr("fill", "rgba(147, 51, 234, 0.15)")
      .attr("stroke", "#9333ea")
      .attr("stroke-width", 3)

    // Add Basic RAG points
    basicPathData.forEach((point, i) => {
      if (!point || !validMetrics[i]) return
      const metric = validMetrics[i]
      const rawValue = basicRAG[metric.key]
      const value = typeof rawValue === 'number' ? rawValue : 0
      g.append("circle")
        .attr("cx", point[0])
        .attr("cy", point[1])
        .attr("r", 6)
        .attr("fill", "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("r", 8)
          
          // Add enhanced tooltip
          const tooltip = g.append("g")
            .attr("class", "point-tooltip")
            .attr("transform", `translate(${point[0] + 15}, ${point[1] - 15})`)

          const rect = tooltip.append("rect")
            .attr("x", -5)
            .attr("y", -25)
            .attr("width", 120)
            .attr("height", 40)
            .attr("fill", "#1f2937")
            .attr("rx", 6)
            .attr("opacity", 0.95)
            .attr("stroke", "#3b82f6")
            .attr("stroke-width", 2)

          tooltip.append("text")
            .attr("x", 55)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "11px")
            .style("fill", "white")
            .style("font-weight", "600")
            .text(`Basic RAG`)

          tooltip.append("text")
            .attr("x", 55)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "13px")
            .style("fill", "#3b82f6")
            .style("font-weight", "bold")
            .text(`${(value * 100).toFixed(1)}%`)
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 6)
          g.selectAll(".point-tooltip").remove()
        })
    })

    // Add Advanced RAG points
    advancedPathData.forEach((point, i) => {
      if (!point || !validMetrics[i]) return
      const metric = validMetrics[i]
      const rawValue = advancedRAG[metric.key]
      const value = typeof rawValue === 'number' ? rawValue : 0
      g.append("circle")
        .attr("cx", point[0])
        .attr("cy", point[1])
        .attr("r", 6)
        .attr("fill", "#9333ea")
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("r", 8)
          
          // Add enhanced tooltip
          const tooltip = g.append("g")
            .attr("class", "point-tooltip")
            .attr("transform", `translate(${point[0] + 15}, ${point[1] - 15})`)

          const rect = tooltip.append("rect")
            .attr("x", -5)
            .attr("y", -25)
            .attr("width", 130)
            .attr("height", 40)
            .attr("fill", "#1f2937")
            .attr("rx", 6)
            .attr("opacity", 0.95)
            .attr("stroke", "#9333ea")
            .attr("stroke-width", 2)

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "11px")
            .style("fill", "white")
            .style("font-weight", "600")
            .text(`Advanced RAG`)

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "13px")
            .style("fill", "#9333ea")
            .style("font-weight", "bold")
            .text(`${(value * 100).toFixed(1)}%`)
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 6)
          g.selectAll(".point-tooltip").remove()
        })
    })

    // Add enhanced legend
    const legend = svg.append("g")
      .attr("transform", `translate(20, ${height - 80})`)

    // Basic RAG legend
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 8)
      .attr("fill", "#3b82f6")
      .attr("stroke", "white")
      .attr("stroke-width", 2)

    legend.append("text")
      .attr("x", 20)
      .attr("y", 0)
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(`Basic RAG (${basicMethod})`)

    // Advanced RAG legend
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 25)
      .attr("r", 8)
      .attr("fill", "#9333ea")
      .attr("stroke", "white")
      .attr("stroke-width", 2)

    legend.append("text")
      .attr("x", 20)
      .attr("y", 25)
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(`Advanced RAG (${advancedMethod})`)

  }, [basicRAG, advancedRAG, evaluationMethod, hoveredMetric])

  return (
    <div className="space-y-6">
      {/* Evaluation method indicators */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        <Badge variant="outline" className="text-blue-600 border-blue-500/30">
          Basic RAG: {basicMethod}
        </Badge>
        <Badge variant="outline" className="text-purple-600 border-purple-500/30">
          Advanced RAG: {advancedMethod}
        </Badge>
      </div>

      {/* Main radar chart */}
      <div className="flex justify-center bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <svg ref={chartRef}></svg>
      </div>

      {/* Detailed metric comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Metric Comparison</CardTitle>
          <CardDescription>
            Side-by-side comparison of all evaluation metrics with sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricsToShow.map((metric) => {
                const basicValue = (typeof basicRAG[metric.key] === 'number' ? basicRAG[metric.key] : 0) as number
                const advancedValue = (typeof advancedRAG[metric.key] === 'number' ? advancedRAG[metric.key] : 0) as number
                const improvement = advancedValue - basicValue
                const categoryColor = metric.category === 'individual' ? 'border-purple-500/30' : 'border-blue-500/30'
                const categoryBg = metric.category === 'individual' ? 'bg-purple-50 dark:bg-purple-950/20' : 'bg-blue-50 dark:bg-blue-950/20'

                return (
                  <Card key={metric.key} className={`${categoryBg} ${categoryColor} border`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {metric.label}
                        <Badge variant="outline" className="text-xs">
                          {metric.category === 'individual' ? 'IND' : 'RAG'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {metric.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-600 font-medium">Basic RAG:</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-500/30">
                          {(basicValue * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600 font-medium">Advanced RAG:</span>
                        <Badge variant="outline" className="text-purple-600 border-purple-500/30">
                          {(advancedValue * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-xs text-muted-foreground">Improvement:</span>
                        <Badge variant={improvement > 0 ? "default" : improvement < 0 ? "destructive" : "secondary"}>
                          {improvement > 0 ? '+' : ''}{(improvement * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}