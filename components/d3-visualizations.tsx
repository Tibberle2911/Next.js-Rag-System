'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

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

interface Props {
  results: EvaluationResult[]
  summary: EvaluationSummary
}

export default function D3Visualizations({ results, summary }: Props) {
  const metricsChartRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!summary || !metricsChartRef.current) return

    // Clear previous content
    d3.select(metricsChartRef.current).selectAll("*").remove()

    // Create radar chart for metrics overview
    const svg = d3.select(metricsChartRef.current)
    const width = 400
    const height = 400
    const margin = 80

    svg.attr("width", width).attr("height", height)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - margin

    const metrics = Object.entries(summary.metrics)
    const angleSlice = (Math.PI * 2) / metrics.length

    // Create scales
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius])

    // Create background circles
    const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`)
    
    // Add background circles
    const levels = 5
    for (let level = 0; level < levels; level++) {
      g.append("circle")
        .attr("r", (radius / levels) * (level + 1))
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1)
    }

    // Add axis lines and labels
    metrics.forEach((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      // Add axis line
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)

      // Add labels
      const labelX = Math.cos(angle) * (radius + 30)
      const labelY = Math.sin(angle) * (radius + 30)
      
      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(metric[0].replace('_', ' '))
    })

    // Create the data path
    const pathData = metrics.map((metric, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const value = metric[1]
      const x = Math.cos(angle) * rScale(value)
      const y = Math.sin(angle) * rScale(value)
      return [x, y]
    })

    // Create line generator
    const line = d3.line<number[]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveLinearClosed)

    // Add the path
    g.append("path")
      .datum(pathData)
      .attr("d", line)
      .attr("fill", "rgba(59, 130, 246, 0.3)")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)

    // Add points
    pathData.forEach((point, i) => {
      g.append("circle")
        .attr("cx", point[0])
        .attr("cy", point[1])
        .attr("r", 4)
        .attr("fill", "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
    })

  }, [summary])

  return (
    <div className="flex justify-center">
      <svg ref={metricsChartRef}></svg>
    </div>
  )
}