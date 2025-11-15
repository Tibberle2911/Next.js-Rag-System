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
  // RAGAS metrics (5 metrics - answer_relevancy removed due to Groq compatibility)
  faithfulness: number
  context_precision: number
  context_recall: number
  context_relevancy: number
  answer_correctness?: number
  overall_score: number
  num_contexts: number
  rag_mode: string
  run_number?: number
  test_case_index?: number
  evaluation_method?: string
}

interface EvaluationSummary {
  total_cases: number
  avg_overall_score: number
  avg_response_time: number
  metrics: {
    // RAGAS metrics (5 metrics - answer_relevancy removed due to Groq compatibility)
    faithfulness: number
    context_precision: number
    context_recall: number
    context_relevancy: number
    answer_correctness?: number
  }
  performance_by_category: Record<string, { mean: number; std: number }>
  category_averages: Record<string, number>
  evaluation_methods?: string[]
  method_performance?: Record<string, {
    count: number
    mean: number
    std: number
  }>
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
  const metricsComparisonRef = useRef<SVGSVGElement>(null)
  const performanceTrendRef = useRef<SVGSVGElement>(null)
  
  const [selectedMetric, setSelectedMetric] = useState<string>('overall_score')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any>(null)
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('dark')
  
  // Enhanced color schemes for different chart types
  const colorSchemes = {
    primary: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
    secondary: ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee'],
    accent: ['#1d4ed8', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'],
    gradient: [
      'url(#gradient-blue)', 'url(#gradient-purple)', 'url(#gradient-green)',
      'url(#gradient-orange)', 'url(#gradient-red)', 'url(#gradient-cyan)'
    ]
  }
  
  // Create comprehensive gradients
  const createGradientDefs = (svg: any) => {
    const defs = svg.append('defs')
    
    const gradients = [
      { id: 'gradient-blue', colors: ['#3b82f6', '#1e40af'] },
      { id: 'gradient-purple', colors: ['#8b5cf6', '#6d28d9'] },
      { id: 'gradient-green', colors: ['#10b981', '#047857'] },
      { id: 'gradient-orange', colors: ['#f59e0b', '#d97706'] },
      { id: 'gradient-red', colors: ['#ef4444', '#dc2626'] },
      { id: 'gradient-cyan', colors: ['#06b6d4', '#0891b2'] },
      { id: 'radar-fill', colors: ['#3b82f6', '#8b5cf6'], opacity: [0.4, 0.1] }
    ]
    
    gradients.forEach(grad => {
      const gradient = defs.append('linearGradient')
        .attr('id', grad.id)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%')
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', grad.colors[0])
        .attr('stop-opacity', grad.opacity?.[0] || 1)
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', grad.colors[1])
        .attr('stop-opacity', grad.opacity?.[1] || 1)
    })
    
    // Add shadow filter
    const filter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    filter.append('feDropShadow')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('stdDeviation', 3)
      .attr('flood-opacity', 0.3)
    
    return defs
  }

  // Enhanced metrics radar chart with advanced features
  useEffect(() => {
    if (!summary || !results || results.length === 0 || !radarChartRef.current) return

    // Clear previous content
    d3.select(radarChartRef.current).selectAll("*").remove()

    // Create radar chart for comprehensive metrics overview
    const svg = d3.select(radarChartRef.current)
    const width = 600
    const height = 600
    const margin = 120

    svg.attr("width", width).attr("height", height)
    
    // Create gradients and filters
    createGradientDefs(svg)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - margin

    // RAGAS metrics (5 metrics - answer_relevancy removed due to Groq compatibility)
    const allMetricsConfig = [
      { key: 'faithfulness' as keyof EvaluationResult, label: 'Faithfulness', color: '#ec4899', category: 'ragas' },
      { key: 'context_precision' as keyof EvaluationResult, label: 'Context Precision', color: '#f97316', category: 'ragas' },
      { key: 'context_recall' as keyof EvaluationResult, label: 'Context Recall', color: '#84cc16', category: 'ragas' },
      { key: 'context_relevancy' as keyof EvaluationResult, label: 'Context Relevancy', color: '#a855f7', category: 'ragas' },
      { key: 'answer_correctness' as keyof EvaluationResult, label: 'Answer Correctness', color: '#f43f5e', category: 'ragas' }
    ]
    
    // Include all RAGAS metrics that have valid values in the dataset
    const metricsConfig = allMetricsConfig.filter(metric => {
      const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null && !isNaN(Number(r[metric.key])))
      if (hasValues) {
        console.log(`D3 Visualization - Including metric: ${metric.label} (${metric.category})`, {
          sampleValues: results.slice(0, 3).map(r => ({ [metric.key]: r[metric.key] })),
          availableCount: results.filter(r => r[metric.key] !== undefined && r[metric.key] !== null).length
        })
      }
      return hasValues
    })

    // Filter out undefined metrics and calculate average values
    const validMetrics = metricsConfig.filter(metric => {
      const hasValues = results.some(r => r[metric.key] !== undefined && r[metric.key] !== null)
      return hasValues
    }).map(metric => {
      const validResults = results.filter(r => r[metric.key] !== undefined && r[metric.key] !== null)
      const sum = validResults.reduce((acc, result) => {
        const value = result[metric.key]
        return acc + (typeof value === 'number' ? value : 0)
      }, 0)
      return {
        ...metric,
        value: validResults.length > 0 ? sum / validResults.length : 0
      }
    })

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
      const labelNode = label.node()
      const bbox = labelNode?.getBBox()
      if (bbox && labelNode) {
        g.insert("rect", () => labelNode)
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
    if (!summary || !summary.category_averages || !barChartRef.current) return

    d3.select(barChartRef.current).selectAll("*").remove()

    const svg = d3.select(barChartRef.current)
    const width = 600
    const height = 350
    const margin = { top: 40, right: 50, bottom: 80, left: 100 }

    svg.attr("width", width).attr("height", height)
    createGradientDefs(svg)

    const categoryData = Object.entries(summary.category_averages || {}).map(([category, average]) => ({
      category,
      average: typeof average === 'number' ? average : 0,
      std: summary.performance_by_category?.[category]?.std || 0
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
      .attr("fill", (d, i) => colorSchemes.gradient[i % colorSchemes.gradient.length])
      .attr("opacity", 0.85)
      .attr("stroke", (d, i) => colorSchemes.primary[i % colorSchemes.primary.length])
      .attr("stroke-width", 2)
      .attr("rx", 4)
      .attr("filter", "url(#drop-shadow)")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1)
        
        // Add tooltip
        const tooltip = svg.append("g").attr("class", "tooltip")
        
        const currentBar = d3.select(this)
        const barX = currentBar.attr("x")
        const barY = currentBar.attr("y")
        
        if (barX && barY) {
          const xPos = parseFloat(barX) || 0
          const yPos = parseFloat(barY) || 0
          
          tooltip.append("rect")
            .attr("x", xPos + xScale.bandwidth()/2 - 40)
            .attr("y", yPos - 35)
            .attr("width", 80)
            .attr("height", 25)
            .attr("fill", "#1f2937")
            .attr("rx", 4)
            .attr("opacity", 0.9)
            
          tooltip.append("text")
            .attr("x", xPos + xScale.bandwidth()/2)
            .attr("y", yPos - 20)
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
    if (!results || results.length === 0 || !scatterPlotRef.current) return

    d3.select(scatterPlotRef.current).selectAll("*").remove()

    const svg = d3.select(scatterPlotRef.current)
    const width = 650
    const height = 400
    const margin = { top: 40, right: 100, bottom: 80, left: 100 }

    svg.attr("width", width).attr("height", height)
    createGradientDefs(svg)

    const xScale = d3.scaleLinear()
      .domain(d3.extent(results, d => d.response_time) as [number, number])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    const categories = [...new Set(results.map(d => d.category))]
    const colorScale = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(d3.schemeCategory10.slice(0, categories.length))

    // Add points
    svg.selectAll(".dot")
      .data(results)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.response_time))
      .attr("cy", d => yScale(d.overall_score))
      .attr("r", d => {
        const metricValue = d[selectedMetric as keyof EvaluationResult]
        const value = typeof metricValue === 'number' ? metricValue : 0
        return 4 + value * 3
      })
      .attr("fill", d => colorScale(d.category) || "#6b7280")
      .attr("opacity", 0.75)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("filter", "url(#drop-shadow)")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 7).attr("opacity", 1)
        
        // Enhanced tooltip
        const tooltip = svg.append("g").attr("class", "tooltip")
        
        const tooltipX = Math.min(xScale(d.response_time) + 10, width - 170)
        const tooltipY = Math.max(yScale(d.overall_score) - 40, margin.top)
        
        tooltip.append("rect")
          .attr("x", tooltipX)
          .attr("y", tooltipY)
          .attr("width", 160)
          .attr("height", 60)
          .attr("fill", "#1f2937")
          .attr("rx", 4)
          .attr("opacity", 0.95)
          .attr("stroke", colorScale(d.category) || "#6b7280")
          .attr("stroke-width", 2)

        tooltip.append("text")
          .attr("x", tooltipX + 80)
          .attr("y", tooltipY + 15)
          .attr("text-anchor", "middle")
          .style("font-size", "11px")
          .style("fill", "white")
          .style("font-weight", "600")
          .text(`${d.category} | ${d.rag_mode}`)

        tooltip.append("text")
          .attr("x", tooltipX + 80)
          .attr("y", tooltipY + 30)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#d1d5db")
          .text(`Score: ${(d.overall_score * 100).toFixed(1)}%`)

        tooltip.append("text")
          .attr("x", tooltipX + 80)
          .attr("y", tooltipY + 45)
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

  // Metrics comparison chart (Basic vs Advanced RAG)
  useEffect(() => {
    if (!results || results.length === 0 || !metricsComparisonRef.current) return

    d3.select(metricsComparisonRef.current).selectAll("*").remove()

    const svg = d3.select(metricsComparisonRef.current)
    const width = 700
    const height = 400
    const margin = { top: 40, right: 100, bottom: 80, left: 100 }

    svg.attr("width", width).attr("height", height)
    createGradientDefs(svg)

    // Separate basic and advanced results
    const basicResults = results.filter(r => r.rag_mode === 'basic')
    const advancedResults = results.filter(r => r.rag_mode === 'advanced')

    if (basicResults.length === 0 && advancedResults.length === 0) return

    // Calculate averages for comparison - use ALL 12+ available metrics
    const allMetricsToCompare: (keyof EvaluationResult)[] = [
      // Individual/LangChain metrics
      'relevance', 'coherence', 'factual_accuracy', 'completeness', 'context_usage', 'professional_tone',
      // RAGAS metrics  
      'faithfulness', 'answer_relevancy', 'context_precision', 'context_recall', 'context_relevancy', 'answer_correctness',
      // Overall score
      'overall_score'
    ]
    
    // Filter to only include metrics that have actual data in the results
    const metricsToCompare = allMetricsToCompare.filter(metric => {
      const hasBasicData = basicResults.some(r => r[metric] !== undefined && r[metric] !== null && !isNaN(Number(r[metric])))
      const hasAdvancedData = advancedResults.some(r => r[metric] !== undefined && r[metric] !== null && !isNaN(Number(r[metric])))
      return hasBasicData || hasAdvancedData
    })
    
    console.log(`D3 Metrics Comparison - Using ${metricsToCompare.length} metrics:`, metricsToCompare)
    
    const comparisonData = metricsToCompare.map(metric => {
      const basicAvg = basicResults.length > 0 
        ? basicResults.reduce((sum, r) => {
            const value = r[metric]
            return sum + (typeof value === 'number' ? value : 0)
          }, 0) / basicResults.length
        : 0
      const advancedAvg = advancedResults.length > 0
        ? advancedResults.reduce((sum, r) => {
            const value = r[metric]
            return sum + (typeof value === 'number' ? value : 0)
          }, 0) / advancedResults.length
        : 0
      
      return {
        metric: metric.toString().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        basic: basicAvg,
        advanced: advancedAvg,
        difference: advancedAvg - basicAvg
      }
    })

    const xScale = d3.scaleBand()
      .domain(comparisonData.map(d => d.metric))
      .range([margin.left, width - margin.right])
      .padding(0.3)

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    const barWidth = xScale.bandwidth() / 2

    // Add grouped bars
    const barGroup = svg.append('g').attr('class', 'bar-groups')

    comparisonData.forEach((d, i) => {
      const x = xScale(d.metric)!
      
      // Basic RAG bars
      barGroup.append('rect')
        .attr('x', x)
        .attr('y', yScale(d.basic))
        .attr('width', barWidth)
        .attr('height', yScale(0) - yScale(d.basic))
        .attr('fill', 'url(#gradient-blue)')
        .attr('opacity', 0.8)
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('filter', 'url(#drop-shadow)')
        .on('mouseover', function() {
          d3.select(this).attr('opacity', 1).attr('stroke-width', 3)
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.8).attr('stroke-width', 2)
        })

      // Advanced RAG bars
      barGroup.append('rect')
        .attr('x', x + barWidth)
        .attr('y', yScale(d.advanced))
        .attr('width', barWidth)
        .attr('height', yScale(0) - yScale(d.advanced))
        .attr('fill', 'url(#gradient-purple)')
        .attr('opacity', 0.8)
        .attr('stroke', '#8b5cf6')
        .attr('stroke-width', 2)
        .attr('filter', 'url(#drop-shadow)')
        .on('mouseover', function() {
          d3.select(this).attr('opacity', 1).attr('stroke-width', 3)
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.8).attr('stroke-width', 2)
        })

      // Add value labels
      svg.append('text')
        .attr('x', x + barWidth/2)
        .attr('y', yScale(d.basic) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#3b82f6')
        .style('font-weight', '600')
        .text(`${(d.basic * 100).toFixed(1)}%`)

      svg.append('text')
        .attr('x', x + barWidth * 1.5)
        .attr('y', yScale(d.advanced) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#8b5cf6')
        .style('font-weight', '600')
        .text(`${(d.advanced * 100).toFixed(1)}%`)

      // Add improvement indicator
      const improvement = d.difference
      if (Math.abs(improvement) > 0.01) {
        const indicatorY = Math.min(yScale(d.basic), yScale(d.advanced)) - 20
        svg.append('text')
          .attr('x', x + xScale.bandwidth()/2)
          .attr('y', indicatorY)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('fill', improvement > 0 ? '#10b981' : '#ef4444')
          .style('font-weight', 'bold')
          .text(`${improvement > 0 ? '+' : ''}${(improvement * 100).toFixed(1)}%`)
      }
    })

    // Add axes with enhanced styling
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#374151')
      .style('font-weight', '500')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${(+d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280')

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 90}, ${margin.top})`)

    legend.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', 15).attr('height', 15)
      .attr('fill', 'url(#gradient-blue)')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)

    legend.append('text')
      .attr('x', 20).attr('y', 12)
      .style('font-size', '12px')
      .style('fill', '#374151')
      .style('font-weight', '500')
      .text('Basic RAG')

    legend.append('rect')
      .attr('x', 0).attr('y', 25)
      .attr('width', 15).attr('height', 15)
      .attr('fill', 'url(#gradient-purple)')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-width', 1)

    legend.append('text')
      .attr('x', 20).attr('y', 37)
      .style('font-size', '12px')
      .style('fill', '#374151')
      .style('font-weight', '500')
      .text('Advanced RAG')

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#1f2937')
      .style('font-weight', '600')
      .text('RAG Method Performance Comparison')

  }, [results])

  // Performance trend analysis
  useEffect(() => {
    if (!results || results.length === 0 || !performanceTrendRef.current) return

    d3.select(performanceTrendRef.current).selectAll("*").remove()

    const svg = d3.select(performanceTrendRef.current)
    const width = 700
    const height = 300
    const margin = { top: 30, right: 120, bottom: 60, left: 80 }

    svg.attr("width", width).attr("height", height)
    createGradientDefs(svg)

    // Sort results by response time for trend analysis
    const sortedResults = [...results].sort((a, b) => a.response_time - b.response_time)
    
    // Create trend data with moving average
    const windowSize = Math.max(3, Math.floor(sortedResults.length / 10))
    const trendData = sortedResults.map((result, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2))
      const end = Math.min(sortedResults.length, index + Math.ceil(windowSize / 2))
      const window = sortedResults.slice(start, end)
      const avgScore = window.reduce((sum, r) => sum + r.overall_score, 0) / window.length
      
      return {
        index,
        response_time: result.response_time,
        score: result.overall_score,
        moving_avg: avgScore,
        category: result.category,
        rag_mode: result.rag_mode
      }
    })

    const xScale = d3.scaleLinear()
      .domain(d3.extent(trendData, d => d.response_time) as [number, number])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    // Create line generator for trend
    const line = d3.line<any>()
      .x(d => xScale(d.response_time))
      .y(d => yScale(d.moving_avg))
      .curve(d3.curveCardinal)

    // Add trend line
    svg.append('path')
      .datum(trendData)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'url(#gradient-blue)')
      .attr('stroke-width', 3)
      .attr('opacity', 0.8)
      .attr('filter', 'url(#drop-shadow)')

    // Add confidence band
    const area = d3.area<any>()
      .x(d => xScale(d.response_time))
      .y0(d => yScale(Math.max(0, d.moving_avg - 0.1)))
      .y1(d => yScale(Math.min(1, d.moving_avg + 0.1)))
      .curve(d3.curveCardinal)

    svg.append('path')
      .datum(trendData)
      .attr('d', area)
      .attr('fill', 'url(#gradient-blue)')
      .attr('opacity', 0.2)

    // Add individual points
    const categories = [...new Set(results.map(d => d.category))]
    const categoryColorScale = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(colorSchemes.primary.slice(0, categories.length))

    svg.selectAll('.trend-point')
      .data(trendData)
      .enter()
      .append('circle')
      .attr('class', 'trend-point')
      .attr('cx', d => xScale(d.response_time))
      .attr('cy', d => yScale(d.score))
      .attr('r', 4)
      .attr('fill', d => categoryColorScale(d.category))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0.7)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6).attr('opacity', 1)
        setHoveredDataPoint(d)
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 4).attr('opacity', 0.7)
        setHoveredDataPoint(null)
      })

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(+d).toFixed(1)}s`))

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${(+d * 100).toFixed(0)}%`))

    // Add labels
    svg.append('text')
      .attr('x', (width - margin.left - margin.right) / 2 + margin.left)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text('Response Time (seconds)')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 20)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text('Performance Score')

  }, [results])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="radar" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="radar">Metrics Radar</TabsTrigger>
          <TabsTrigger value="comparison">RAG Comparison</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="scatter">Time Analysis</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="radar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Comprehensive Metrics Radar Chart</span>
                <div className="flex space-x-2">
                  {selectedCategory && (
                    <Badge variant="outline" className="text-xs">
                      Filtered: {selectedCategory}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {Object.keys(summary.metrics).length} Metrics
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Interactive radar chart showing all evaluation metrics. Click on points to explore individual metrics.
                Hover over data points for detailed insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4 mb-4">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded text-xs ${
                    selectedCategory === null ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  All Categories
                </button>
                {Object.keys(summary.category_averages || {}).map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded text-xs capitalize ${
                      selectedCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <svg ref={radarChartRef}></svg>
              {hoveredDataPoint && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                  <strong>Metric Details:</strong> {hoveredDataPoint.label} - {(hoveredDataPoint.value * 100).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic vs Advanced RAG Performance</CardTitle>
              <CardDescription>
                Comprehensive comparison between Basic and Advanced RAG methods across all metrics.
                Green indicators show improvement, red indicators show decline.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg ref={metricsComparisonRef}></svg>
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
                Interactive scatter plot showing the relationship between response time and evaluation scores.
                Different colors represent categories, and size indicates confidence level.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4 mb-4">
                <select 
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="overall_score">Overall Score</option>
                  <option value="faithfulness">Faithfulness</option>
                  <option value="answer_relevancy">Answer Relevancy</option>
                  <option value="context_precision">Context Precision</option>
                  <option value="context_recall">Context Recall</option>
                </select>
              </div>
              <svg ref={scatterPlotRef}></svg>
              {hoveredDataPoint && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm max-w-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Category:</strong> {hoveredDataPoint.category}</div>
                    <div><strong>Mode:</strong> {hoveredDataPoint.rag_mode}</div>
                    <div><strong>Score:</strong> {(hoveredDataPoint.score * 100).toFixed(1)}%</div>
                    <div><strong>Time:</strong> {hoveredDataPoint.response_time?.toFixed(2)}s</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend Analysis</CardTitle>
              <CardDescription>
                Performance trends over response time with moving average smoothing.
                Individual points show actual results, line shows trend direction.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg ref={performanceTrendRef}></svg>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evaluation Overview</CardTitle>
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
                  <span className="text-sm text-muted-foreground">Avg Time:</span>
                  <Badge variant="outline">{summary.avg_response_time.toFixed(2)}s</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Best Score:</span>
                  <Badge variant="default">{(Math.max(...results.map(r => r.overall_score)) * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Categories:</span>
                  <Badge variant="secondary">{Object.keys(summary.category_averages || {}).length}</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const scores = results.map(r => r.overall_score)
                  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
                  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
                  const stdDev = Math.sqrt(variance)
                  const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
                  
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Mean:</span>
                        <Badge variant="outline">{(mean * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Median:</span>
                        <Badge variant="outline">{(median * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Std Dev:</span>
                        <Badge variant="outline">{(stdDev * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Min Score:</span>
                        <Badge variant="destructive">{(Math.min(...scores) * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Range:</span>
                        <Badge variant="secondary">{((Math.max(...scores) - Math.min(...scores)) * 100).toFixed(1)}%</Badge>
                      </div>
                    </>
                  )
                })()}
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
                      const value = summary.metrics[metric as keyof typeof summary.metrics]
                      return value !== undefined && value !== null ? (
                        <div key={metric} className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground capitalize">
                            {metric.replace('_', ' ')}:
                          </span>
                          <Badge variant="outline" className="text-xs">{((value as number) * 100).toFixed(1)}%</Badge>
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
                        const value = summary.metrics[metric as keyof typeof summary.metrics]
                        return value !== undefined && value !== null ? (
                          <div key={metric} className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground capitalize">
                              {metric.replace('_', ' ')}:
                            </span>
                            <Badge variant="outline" className="text-xs">{((value as number) * 100).toFixed(1)}%</Badge>
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
                {Object.entries(summary.category_averages || {}).map(([category, average]) => {
                  const avgValue = typeof average === 'number' ? average : 0
                  const categoryResults = results.filter(r => r.category === category)
                  const bestInCategory = Math.max(...categoryResults.map(r => r.overall_score))
                  
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground capitalize">
                          {category}:
                        </span>
                        <Badge 
                          variant={avgValue > 0.7 ? "default" : avgValue > 0.5 ? "secondary" : "destructive"}
                        >
                          {(avgValue * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-xs text-muted-foreground">Best:</span>
                        <Badge variant="outline" className="text-xs">
                          {(bestInCategory * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-xs text-muted-foreground">Cases:</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryResults.length}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">RAG Method Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const basicResults = results.filter(r => r.rag_mode === 'basic')
                  const advancedResults = results.filter(r => r.rag_mode === 'advanced')
                  
                  const basicAvg = basicResults.length > 0 
                    ? basicResults.reduce((sum, r) => sum + r.overall_score, 0) / basicResults.length
                    : 0
                  
                  const advancedAvg = advancedResults.length > 0
                    ? advancedResults.reduce((sum, r) => sum + r.overall_score, 0) / advancedResults.length
                    : 0
                  
                  const improvement = advancedAvg - basicAvg
                  
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Basic RAG:</span>
                        <Badge variant="secondary">{(basicAvg * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Advanced RAG:</span>
                        <Badge variant="default">{(advancedAvg * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Improvement:</span>
                        <Badge 
                          variant={improvement > 0 ? "default" : improvement < 0 ? "destructive" : "outline"}
                        >
                          {improvement > 0 ? '+' : ''}{(improvement * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Basic Cases:</span>
                        <Badge variant="outline">{basicResults.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Advanced Cases:</span>
                        <Badge variant="outline">{advancedResults.length}</Badge>
                      </div>
                    </>
                  )
                })()}
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