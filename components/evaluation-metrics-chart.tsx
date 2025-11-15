'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface EvaluationMetrics {
  // RAGAS metrics (5 metrics with answer_relevancy using Gemini)
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  answer_correctness: number
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
    const basicMethod = basicRAG.evaluation_method || evaluationMethod || 'ragas'
    const advancedMethod = advancedRAG.evaluation_method || evaluationMethod || 'ragas'
    
    // All 5 RAGAS metrics with enhanced descriptions and WCAG AA compliant colors
    const allPossibleMetrics = [
      { 
        key: 'faithfulness' as keyof EvaluationMetrics, 
        label: 'Faithfulness', 
        description: 'How well the answer is grounded in the retrieved context',
        color: '#2563eb', // Deeper blue for better contrast
        category: 'ragas' 
      },
      { 
        key: 'answer_relevancy' as keyof EvaluationMetrics, 
        label: 'Answer Relevancy', 
        description: 'How relevant the answer is to the question asked',
        color: '#059669', // Deeper green for better contrast
        category: 'ragas' 
      },
      { 
        key: 'context_precision' as keyof EvaluationMetrics, 
        label: 'Context Precision', 
        description: 'How precise and focused the retrieved context is',
        color: '#d97706', // Deeper amber for better contrast
        category: 'ragas' 
      },
      { 
        key: 'context_recall' as keyof EvaluationMetrics, 
        label: 'Context Recall', 
        description: 'How well the context covers all relevant information',
        color: '#dc2626', // Deeper red for better contrast
        category: 'ragas' 
      },
      { 
        key: 'answer_correctness' as keyof EvaluationMetrics, 
        label: 'Answer Correctness', 
        description: 'Overall accuracy and completeness of the answer',
        color: '#7c3aed', // Deeper purple for better contrast
        category: 'ragas' 
      }
    ]
    
    // Include ALL metrics that have valid data
    const metricsToShow = allPossibleMetrics.filter(metric => {
      const basicValue = basicRAG[metric.key]
      const advancedValue = advancedRAG[metric.key]
      const hasValidData = (basicValue !== undefined && basicValue !== null && !isNaN(Number(basicValue))) || 
                          (advancedValue !== undefined && advancedValue !== null && !isNaN(Number(advancedValue)))
      
      if (hasValidData) {
        console.log(`Metrics Chart - Including metric: ${metric.label} (${metric.category})`, {
          basic: basicValue,
          advanced: advancedValue
        })
      }
      
      return hasValidData
    })
    
    console.log(`Evaluation Metrics Chart - Using ${metricsToShow.length} RAGAS metrics:`, {
      metrics: metricsToShow.map(m => m.label),
      basicMethod,
      advancedMethod
    })

    return { basicMethod, advancedMethod, metricsToShow }
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

      // Add axis line with color
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", metric.color || "#d1d5db")
        .attr("stroke-width", 2)
        .attr("opacity", 0.3)

      // Add labels with better positioning
      const labelRadius = radius + 50
      const labelX = Math.cos(angle) * labelRadius
      const labelY = Math.sin(angle) * labelRadius
      
      // Add background for better readability (before text)
      const tempText = g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "700")
        .text(metric.label)
      
      const bbox = tempText.node()?.getBBox()
      if (bbox) {
        g.insert("rect", () => tempText.node())
          .attr("x", labelX - bbox.width/2 - 6)
          .attr("y", labelY - bbox.height/2 - 4)
          .attr("width", bbox.width + 12)
          .attr("height", bbox.height + 8)
          .attr("fill", "white")
          .attr("opacity", 0.95)
          .attr("rx", 6)
          .attr("stroke", metric.color || "#d1d5db")
          .attr("stroke-width", 2)
      }
      
      tempText
        .style("fill", metric.color || "#374151")
        .style("cursor", "pointer")
        .attr("role", "button")
        .attr("aria-label", `${metric.label}: ${metric.description}`)
        .attr("tabindex", "0")
        .on("mouseover", function() {
          setHoveredMetric(metric.key)
          
          // Enhanced description tooltip with color coding
          const tooltip = g.append("g").attr("class", "metric-tooltip")
          
          const tooltipWidth = 200
          const tooltipHeight = 50
          const tooltipX = labelX
          const tooltipY = labelY + 25
          
          tooltip.append("rect")
            .attr("x", tooltipX - tooltipWidth/2)
            .attr("y", tooltipY)
            .attr("width", tooltipWidth)
            .attr("height", tooltipHeight)
            .attr("fill", "#1f2937")
            .attr("rx", 8)
            .attr("opacity", 0.97)
            .attr("stroke", metric.color || "#6b7280")
            .attr("stroke-width", 2)
            .attr("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))")

          // Title
          tooltip.append("text")
            .attr("x", tooltipX)
            .attr("y", tooltipY + 18)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("fill", metric.color || "white")
            .text(metric.label)
          
          // Description
          const words = metric.description.split(' ')
          let line = ''
          let lineNumber = 0
          words.forEach(word => {
            const testLine = line + word + ' '
            if (testLine.length > 35 && line !== '') {
              tooltip.append("text")
                .attr("x", tooltipX)
                .attr("y", tooltipY + 34 + lineNumber * 12)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#d1d5db")
                .text(line.trim())
              line = word + ' '
              lineNumber++
            } else {
              line = testLine
            }
          })
          if (line) {
            tooltip.append("text")
              .attr("x", tooltipX)
              .attr("y", tooltipY + 34 + lineNumber * 12)
              .attr("text-anchor", "middle")
              .style("font-size", "10px")
              .style("fill", "#d1d5db")
              .text(line.trim())
          }
        })
        .on("mouseout", function() {
          setHoveredMetric(null)
          g.selectAll(".metric-tooltip").remove()
        })
        .on("focus", function() {
          setHoveredMetric(metric.key)
        })
        .on("blur", function() {
          setHoveredMetric(null)
          g.selectAll(".metric-tooltip").remove()
        })
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

    // Add Basic RAG path with accessible colors
    g.append("path")
      .datum(basicPathData)
      .attr("d", line)
      .attr("fill", "rgba(37, 99, 235, 0.20)") // Deeper blue with opacity
      .attr("stroke", "#2563eb") // WCAG AA compliant blue
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")

    // Add Advanced RAG path with accessible colors
    g.append("path")
      .datum(advancedPathData)
      .attr("d", line)
      .attr("fill", "rgba(124, 58, 237, 0.20)") // Deeper purple with opacity
      .attr("stroke", "#7c3aed") // WCAG AA compliant purple
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")

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
        .attr("fill", "#2563eb") // Deeper blue
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .style("cursor", "pointer")
        .attr("aria-label", `Basic RAG ${metric.label}: ${(value * 100).toFixed(1)}%`)
        .on("mouseover", function(event) {
          d3.select(this).attr("r", 8).attr("stroke-width", 4)
          
          // Add enhanced tooltip
          const tooltip = g.append("g")
            .attr("class", "point-tooltip")
            .attr("transform", `translate(${point[0] + 15}, ${point[1] - 15})`)

          tooltip.append("rect")
            .attr("x", -5)
            .attr("y", -30)
            .attr("width", 130)
            .attr("height", 50)
            .attr("fill", "#1e293b") // Darker background for better contrast
            .attr("rx", 8)
            .attr("opacity", 0.97)
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 3)
            .attr("filter", "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))")

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("fill", "#e2e8f0")
            .style("font-weight", "700")
            .text(`Basic RAG`)

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", 8)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("fill", "#60a5fa") // Lighter blue for dark background
            .style("font-weight", "900")
            .text(`${(value * 100).toFixed(1)}%`)
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 6).attr("stroke-width", 3)
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
        .attr("fill", "#7c3aed") // Deeper purple
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .style("cursor", "pointer")
        .attr("aria-label", `Advanced RAG ${metric.label}: ${(value * 100).toFixed(1)}%`)
        .on("mouseover", function(event) {
          d3.select(this).attr("r", 8).attr("stroke-width", 4)
          
          const tooltip = g.append("g")
            .attr("class", "point-tooltip")
            .attr("transform", `translate(${point[0] + 15}, ${point[1] - 15})`)

          tooltip.append("rect")
            .attr("x", -5)
            .attr("y", -30)
            .attr("width", 130)
            .attr("height", 50)
            .attr("fill", "#1e293b") // Darker background for better contrast
            .attr("rx", 8)
            .attr("opacity", 0.97)
            .attr("stroke", "#7c3aed")
            .attr("stroke-width", 3)
            .attr("filter", "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))")

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("fill", "#e2e8f0")
            .style("font-weight", "700")
            .text(`Advanced RAG`)

          tooltip.append("text")
            .attr("x", 60)
            .attr("y", 8)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("fill", "#a78bfa") // Lighter purple for dark background
            .style("font-weight", "900")
            .text(`${(value * 100).toFixed(1)}%`)
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 6).attr("stroke-width", 3)
          g.selectAll(".point-tooltip").remove()
        })
    })

    // Enhanced legend
    const legend = svg.append("g")
      .attr("transform", `translate(20, ${height - 80})`)

    // Basic RAG legend
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 8)
      .attr("fill", "#2563eb") // Deeper blue
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
      .attr("fill", "#7c3aed") // Deeper purple
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
        <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-50">
          <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
          Basic RAG: {basicMethod}
        </Badge>
        <Badge variant="outline" className="text-purple-600 border-purple-500/30 bg-purple-50">
          <span className="w-2 h-2 rounded-full bg-purple-600 mr-2"></span>
          Advanced RAG: {advancedMethod}
        </Badge>
      </div>

      {/* Main radar chart */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-center">RAGAS Metrics Comparison</CardTitle>
          <CardDescription className="text-center">
            Interactive radar chart showing all 5 evaluation metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-8 rounded-xl">
            <svg ref={chartRef} role="img" aria-label="Radar chart comparing Basic and Advanced RAG metrics"></svg>
          </div>
        </CardContent>
      </Card>

      {/* Metrics breakdown table with shadcn components */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Detailed Metrics Comparison
            </CardTitle>
            <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
              {metricsToShow.length} Metrics
            </Badge>
          </div>
          <CardDescription className="text-base">
            Side-by-side comparison with visual progress indicators and improvement analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 border-b-2">
                  <TableHead className="font-bold text-base text-gray-900 dark:text-gray-100 w-[35%]">Metric</TableHead>
                  <TableHead className="text-center font-bold text-base text-blue-600 dark:text-blue-400">Basic RAG</TableHead>
                  <TableHead className="text-center font-bold text-base text-purple-600 dark:text-purple-400">Advanced RAG</TableHead>
                  <TableHead className="text-center font-bold text-base text-gray-900 dark:text-gray-100">Improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricsToShow.map((metric, index) => {
                  const basicValue = basicRAG[metric.key]
                  const advancedValue = advancedRAG[metric.key]
                  const basicScore = typeof basicValue === 'number' ? basicValue : 0
                  const advancedScore = typeof advancedValue === 'number' ? advancedValue : 0
                  const difference = advancedScore - basicScore
                  const improvementPercent = basicScore > 0 ? ((difference / basicScore) * 100) : 0
                  
                  return (
                    <TableRow 
                      key={metric.key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0 mt-1 ring-2 ring-white dark:ring-gray-900 shadow-sm" 
                            style={{ backgroundColor: metric.color }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base text-gray-900 dark:text-gray-100">
                              {metric.label}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {metric.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                            {(basicScore * 100).toFixed(1)}%
                          </span>
                          <Progress 
                            value={basicScore * 100} 
                            className="w-28 h-3 [&>div]:bg-blue-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                            {(advancedScore * 100).toFixed(1)}%
                          </span>
                          <Progress 
                            value={advancedScore * 100} 
                            className="w-28 h-3 [&>div]:bg-purple-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-center gap-2">
                          {difference > 0.001 ? (
                            <div className="flex items-center gap-1.5">
                              <ArrowUp className="w-5 h-5 text-green-600" />
                              <span className="text-lg font-bold text-green-600 tabular-nums">
                                +{(difference * 100).toFixed(1)}%
                              </span>
                            </div>
                          ) : difference < -0.001 ? (
                            <div className="flex items-center gap-1.5">
                              <ArrowDown className="w-5 h-5 text-red-600" />
                              <span className="text-lg font-bold text-red-600 tabular-nums">
                                {(difference * 100).toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Minus className="w-5 h-5 text-gray-400" />
                              <span className="text-base font-medium text-gray-500">No change</span>
                            </div>
                          )}
                          {Math.abs(improvementPercent) > 0.1 && (
                            <Badge 
                              variant={improvementPercent > 0 ? "default" : "destructive"}
                              className="text-xs px-2.5 py-0.5 font-semibold tabular-nums"
                            >
                              {improvementPercent > 0 ? '+' : ''}{improvementPercent.toFixed(0)}% change
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 border-t-2 border-gray-300 dark:border-gray-600">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">Overall Average</span>
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {metricsToShow.length} metrics
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {(() => {
                          const scores = metricsToShow.map(m => basicRAG[m.key]).filter((s): s is number => typeof s === 'number')
                          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
                          return `${(avg * 100).toFixed(1)}%`
                        })()}
                      </span>
                      <Progress 
                        value={(() => {
                          const scores = metricsToShow.map(m => basicRAG[m.key]).filter((s): s is number => typeof s === 'number')
                          return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0
                        })()} 
                        className="w-28 h-3 [&>div]:bg-blue-600"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                        {(() => {
                          const scores = metricsToShow.map(m => advancedRAG[m.key]).filter((s): s is number => typeof s === 'number')
                          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
                          return `${(avg * 100).toFixed(1)}%`
                        })()}
                      </span>
                      <Progress 
                        value={(() => {
                          const scores = metricsToShow.map(m => advancedRAG[m.key]).filter((s): s is number => typeof s === 'number')
                          return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0
                        })()} 
                        className="w-28 h-3 [&>div]:bg-purple-600"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex justify-center">
                      {(() => {
                        const basicScores = metricsToShow.map(m => basicRAG[m.key]).filter((s): s is number => typeof s === 'number')
                        const advancedScores = metricsToShow.map(m => advancedRAG[m.key]).filter((s): s is number => typeof s === 'number')
                        const basicAvg = basicScores.length > 0 ? basicScores.reduce((a, b) => a + b, 0) / basicScores.length : 0
                        const advancedAvg = advancedScores.length > 0 ? advancedScores.reduce((a, b) => a + b, 0) / advancedScores.length : 0
                        const diff = (advancedAvg - basicAvg) * 100
                        return (
                          <Badge 
                            variant={diff > 0 ? "default" : diff < 0 ? "destructive" : "secondary"} 
                            className="text-base px-4 py-2 font-bold tabular-nums"
                          >
                            {diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                          </Badge>
                        )
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}