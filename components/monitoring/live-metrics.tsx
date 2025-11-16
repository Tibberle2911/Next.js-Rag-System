'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { aggregateByMinute, summarizeLatency, useLiveMetrics } from '@/lib/use-live-metrics'
import { Button } from '@/components/ui/button'

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function LiveMetrics() {
  const { requests, fallbacks, totalCounts, backend, loggingEnabled, lastUpdated, updating, update, counts24h } = useLiveMetrics({ auto: false, initial: true, pollMs: 5000 })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const series = useMemo(() => aggregateByMinute(requests, 15), [requests])
  const latency = useMemo(() => summarizeLatency(requests.slice(0, 300)), [requests])

  // Success Rate (recent): last 50 requests
  const recent50 = useMemo(() => requests.slice(0, 50), [requests])
  const okCount50 = recent50.filter(r => r.ok).length
  const errCount50 = recent50.length - okCount50
  const successRate50 = recent50.length ? (okCount50 / recent50.length) : 0

  const serviceSet = Array.from(new Set(requests.map(r => r.service)))
  const serviceColors: Record<string, string> = {
    vector: '#0ea5e9',
    puter: '#22c55e',
    gemini: '#7c3aed',
    groq: '#ef4444',
    mcp: '#f59e0b',
    pipeline: '#64748b',
  }

  // Config for ChartContainer tooltips/legends
  const trafficChartConfig = useMemo(() => {
    return serviceSet.reduce<Record<string, { label: string; color: string }>>((acc, svc) => {
      acc[svc] = { label: svc, color: serviceColors[svc] || '#94a3b8' }
      return acc
    }, {})
  }, [serviceSet])

  const latencyRows = Object.entries(latency).map(([svc, s]) => ({ service: svc, avg: Math.round(s.avg), p95: Math.round(s.p95), p99: Math.round(s.p99), count: s.count }))
  const latencyChartConfig = {
    avg: { label: 'Average', color: '#60a5fa' },
    p95: { label: 'p95', color: '#a78bfa' },
    p99: { label: 'p99', color: '#fda4af' },
  } as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground" suppressHydrationWarning>
          Last updated: {mounted ? (lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—') : '—'}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={update} disabled={updating} variant="default">
            {updating ? 'Updating…' : 'Update now'}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Requests</CardTitle>
            <CardDescription>Across all providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCounts.requests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2" suppressHydrationWarning>
              Updated {mounted ? new Date(lastUpdated).toLocaleTimeString() : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Fallbacks</CardTitle>
            <CardDescription>Advanced→Basic or provider swaps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCounts.fallbacks.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2">Backend: {backend} {loggingEnabled ? '(on)' : '(off)'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Success Rate (recent)</CardTitle>
            <CardDescription>Last 50 events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(successRate50*100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-2">OK: {okCount50} • ERR: {errCount50}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Services Seen</CardTitle>
            <CardDescription>Observed in recent samples</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {serviceSet.map(s => (
              <Badge key={s} variant="outline" style={{ borderColor: serviceColors[s] || '#94a3b8', color: serviceColors[s] || '#334155' }}>{s}</Badge>
            ))}
            {serviceSet.length === 0 && <span className="text-xs text-muted-foreground">No data yet</span>}
          </CardContent>
        </Card>
      </div>

      {/* Requests per minute by service */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic (last 15m)</CardTitle>
          <CardDescription>Requests per minute by service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[280px]">
              <ChartContainer className="h-full w-full" config={trafficChartConfig as any}>
                <AreaChart data={series.map(b => ({
                  time: formatTime(b.ts),
                  ...serviceSet.reduce((acc, svc) => ({ ...acc, [svc]: b.byService[svc] || 0 }), {})
                }))}>
                  <defs>
                    {serviceSet.map(svc => (
                      <linearGradient key={svc} id={`area-${svc}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={serviceColors[svc] || '#94a3b8'} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={serviceColors[svc] || '#94a3b8'} stopOpacity={0.05}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {serviceSet.map(svc => (
                    <Area key={svc} type="monotone" dataKey={svc} stroke={serviceColors[svc] || '#94a3b8'} fill={`url(#area-${svc})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Success vs Error */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Success vs Error (recent)</CardTitle>
            <CardDescription>Based on last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    dataKey="value"
                    data={[
                      { name: 'Success', value: counts24h?.ok || 0 },
                      { name: 'Error', value: counts24h?.err || 0 }
                    ]}
                    cx="50%" cy="50%" outerRadius={80} label
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Total: {(counts24h?.total || 0).toLocaleString()} • OK: {(counts24h?.ok || 0).toLocaleString()} • ERR: {(counts24h?.err || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Latency by service */}
        <Card>
          <CardHeader>
            <CardTitle>Latency by Service (ms)</CardTitle>
            <CardDescription>Average and tail latencies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[240px]">
              <ChartContainer className="h-full w-full" config={latencyChartConfig as any}>
                <BarChart data={latencyRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="service" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="avg" fill="#60a5fa" name="avg" />
                  <Bar dataKey="p95" fill="#a78bfa" name="p95" />
                  <Bar dataKey="p99" fill="#fda4af" name="p99" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fallback Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Analysis</CardTitle>
          <CardDescription>Breakdown of fallback events by type and reason</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fallback by Type */}
            <div className="w-full h-[280px]">
              <h3 className="text-sm font-medium mb-4">Fallbacks by Transition</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const typeMap = new Map<string, number>()
                  fallbacks.forEach(f => {
                    const key = `${f.from_mode}→${f.to_mode}`
                    typeMap.set(key, (typeMap.get(key) || 0) + 1)
                  })
                  return Array.from(typeMap.entries())
                    .map(([transition, count]) => ({ transition, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="transition" angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" name="Occurrences" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Fallback by Reason */}
            <div className="w-full h-[280px]">
              <h3 className="text-sm font-medium mb-4">Fallbacks by Reason</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    dataKey="value"
                    data={(() => {
                      const reasonMap = new Map<string, number>()
                      fallbacks.forEach(f => {
                        reasonMap.set(f.reason, (reasonMap.get(f.reason) || 0) + 1)
                      })
                      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']
                      return Array.from(reasonMap.entries())
                        .map(([reason, count], idx) => ({ 
                          name: reason, 
                          value: count,
                          fill: colors[idx % colors.length]
                        }))
                        .sort((a, b) => b.value - a.value)
                    })()}
                    cx="50%" cy="50%" outerRadius={80} label
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Fallback Details Table */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Recent Fallback Events (Last 20)</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Service</th>
                    <th className="p-2">Transition</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Message</th>
                    <th className="p-2">Query</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbacks.slice(0, 20).map(f => (
                    <tr key={f.id} className="border-t border-border/50">
                      <td className="p-2">{f.service}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {f.from_mode} → {f.to_mode}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant="outline" 
                          className={
                            f.reason === 'rate_limit' ? 'bg-red-500/10 border-red-500/30' :
                            f.reason === 'error' ? 'bg-orange-500/10 border-orange-500/30' :
                            'bg-blue-500/10 border-blue-500/30'
                          }
                        >
                          {f.reason}
                        </Badge>
                      </td>
                      <td className="p-2">{f.original_status || '-'}</td>
                      <td className="p-2 truncate max-w-[200px]" title={f.message || ''}>{f.message || '-'}</td>
                      <td className="p-2 truncate max-w-[200px]" title={f.query || ''}>{f.query || '-'}</td>
                    </tr>
                  ))}
                  {fallbacks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No fallback events recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent events table (compact) - Shows request and fallback events merged */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Most recent 50 events (requests & fallbacks)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Service</th>
                  <th className="p-2">Event Type</th>
                  <th className="p-2">Status/Reason</th>
                  <th className="p-2">Fallback Details</th>
                  <th className="p-2">OK</th>
                  <th className="p-2">Latency</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Query</th>
                </tr>
              </thead>
              <tbody>
                {/* Merge and display both requests and fallbacks */}
                {[
                  ...requests.slice(0, 25).map(r => ({ ...r, type: 'request' as const })),
                  ...fallbacks.slice(0, 25).map(f => ({ ...f, type: 'fallback' as const }))
                ]
                  .sort((a, b) => b.ts - a.ts)
                  .slice(0, 50)
                  .map((event, idx) => {
                    if (event.type === 'fallback') {
                      const fb = event as FallbackRow & { type: 'fallback' }
                      return (
                        <tr key={`fb-${fb.id}`} className="border-t border-border/50 bg-yellow-500/5">
                          <td className="p-2">{fb.service}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30">Fallback</Badge>
                          </td>
                          <td className="p-2">{fb.reason}</td>
                          <td className="p-2">
                            <span className="font-mono text-xs">
                              {fb.from_mode} → {fb.to_mode}
                            </span>
                          </td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">{fb.from_mode || '-'}</td>
                          <td className="p-2 truncate max-w-[280px]" title={fb.query || fb.message || ''}>{fb.query || fb.message || ''}</td>
                        </tr>
                      )
                    } else {
                      const r = event as RequestRow & { type: 'request' }
                      return (
                        <tr key={`req-${r.id}`} className="border-t border-border/50">
                          <td className="p-2">{r.service}</td>
                          <td className="p-2">{r.kind}</td>
                          <td className="p-2">{r.status}</td>
                          <td className="p-2">{r.fallback_used ? <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-xs">Used</Badge> : '-'}</td>
                          <td className="p-2">{r.ok ? '✓' : '✗'}</td>
                          <td className="p-2">{typeof r.duration_ms === 'number' ? `${r.duration_ms}ms` : '-'}</td>
                          <td className="p-2">{r.mode || '-'}</td>
                          <td className="p-2 truncate max-w-[280px]" title={r.query || ''}>{r.query || ''}</td>
                        </tr>
                      )
                    }
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
