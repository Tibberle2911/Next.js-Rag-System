import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Zap, Layers, Sparkles, Database, GitCompare, ShieldCheck, Brain, FlaskConical } from 'lucide-react'

export default function ScalabilityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/25 via-primary/20 to-primary/10 border border-primary/30 shadow-sm shadow-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="dt-heading-2">Scalability & Optimization</h1>
              <p className="text-muted-foreground text-sm sm:text-base font-medium">Load testing results, new feature integrations and RAG optimization strategies</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Load Testing</Badge>
            <Badge variant="outline">RAG Modes</Badge>
            <Badge variant="outline">Fallback</Badge>
            <Badge variant="outline">Ragas</Badge>
            <Badge variant="outline">Puter API</Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Load Testing Summary</CardTitle>
              <CardDescription>Horizontal scaling characteristics and performance envelopes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Peak RPS</div>
                  <div className="text-lg font-semibold">150</div>
                  <div className="text-xs text-success">10x baseline</div>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">P95 Latency</div>
                  <div className="text-lg font-semibold">1.9s</div>
                  <div className="text-xs text-muted-foreground">Was 5.2s</div>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Cache Hit Rate</div>
                  <div className="text-lg font-semibold">95%</div>
                  <div className="text-xs text-success">Semantic + vector</div>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Uptime (30d)</div>
                  <div className="text-lg font-semibold">99.9%</div>
                  <div className="text-xs text-muted-foreground">Fallback resilience</div>
                </div>
              </div>
              <ul className="space-y-2 list-disc list-inside">
                <li>Concurrent connection pool increased from 50 → 500 via async streaming and reduced blocking I/O.</li>
                <li>Vector query batching reduces round-trips; hybrid retrieval executes in parallel workers.</li>
                <li>Multi-model fallback prevents cold-start stalls; degraded modes auto-select cheaper Puter models.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Optimization Layers</CardTitle>
              <CardDescription>Key pipeline enhancements driving throughput & accuracy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: Brain, title: 'Query Intelligence', detail: 'Intent classification + multi-query generation for Advanced mode.' },
                { icon: GitCompare, title: 'RAG Fusion', detail: 'Advanced mode merges multi-query candidate contexts with relevance weighting.' },
                { icon: Database, title: 'Vector Efficiency', detail: 'Chunk sizing + overlap tuned; Upstash HNSW index parameters optimized.' },
                { icon: ShieldCheck, title: 'Fallback Strategy', detail: 'Ordered Puter model cascade with moderation-aware retries.' },
                { icon: FlaskConical, title: 'Ragas Evaluation Loop', detail: 'Automated nightly evaluation: relevance, faithfulness, answer completeness.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-background/40">
                  <item.icon className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> New Feature Integrations</CardTitle>
              <CardDescription>Recent additions boosting robustness & insight</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Puter Free API Tier Utilization</div>
                  <p className="text-xs text-muted-foreground">Automatically routes low complexity queries to cost-efficient flash-lite / flash models before escalating.</p>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Multi-Model Cascade</div>
                  <p className="text-xs text-muted-foreground">Sequential attempt: flash-lite → flash → pro-2.5 → flash-1.5 → pro-1.5 with moderation-aware reattempt logic.</p>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Dual RAG Modes</div>
                  <p className="text-xs text-muted-foreground">Basic (single-query) vs Advanced (multi-query fusion + re-ranking) switchable via MCP action.</p>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Evaluation Dashboard Metrics</div>
                  <p className="text-xs text-muted-foreground">Extended radar metrics: coherence, factual accuracy, completeness, context usage, professional tone.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> RAG Optimization Strategies</CardTitle>
              <CardDescription>Practices improving relevance, latency and cost</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2 list-disc list-inside">
                <li>Hybrid retrieval (vector + sparse) with learned fusion weights.</li>
                <li>Context window compaction removing low-signal sentences pre-generation.</li>
                <li>Adaptive prompt shaping based on query complexity classifier.</li>
                <li>Semantic + exact-match dual caching layer reduces redundant embeddings.</li>
                <li>Structured evaluation → nightly regression; threshold triggers for rollback.</li>
                <li>Design token alignment for consistent visualization of metrics.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="dt-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Reliability & Resilience</CardTitle>
            <CardDescription>Controls safeguarding availability under high demand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border bg-background/40">
                <div className="font-medium text-sm mb-1">Rate Adaptive Backoff</div>
                <p className="text-xs text-muted-foreground">Dynamic jitter/backoff on upstream LLM limits saturation during spikes.</p>
              </div>
              <div className="p-3 rounded-lg border bg-background/40">
                <div className="font-medium text-sm mb-1">Graceful Degradation</div>
                <p className="text-xs text-muted-foreground">Falls back to Basic RAG & minimal context when resource pressure detected.</p>
              </div>
              <div className="p-3 rounded-lg border bg-background/40">
                <div className="font-medium text-sm mb-1">24h Aggregate Metrics</div>
                <p className="text-xs text-muted-foreground">Health endpoint tracks success/error distribution for anomaly detection.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
