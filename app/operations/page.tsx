import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Wrench, Activity, RefreshCcw, KeyRound, AlertTriangle, Clock, Database, FileCheck, ServerCog } from 'lucide-react'

export default function OperationsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/25 via-primary/20 to-primary/10 border border-primary/30 shadow-sm shadow-primary/20">
              <ServerCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="dt-heading-2">Operations & Maintenance</h1>
              <p className="text-muted-foreground text-sm sm:text-base font-medium">Production procedures ensuring reliability, security and data integrity</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">SRE</Badge>
            <Badge variant="outline">Monitoring</Badge>
            <Badge variant="outline">Key Rotation</Badge>
            <Badge variant="outline">Incident Response</Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Daily Operational Checklist</CardTitle>
              <CardDescription>Routine verifications performed at start of each day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2 list-disc list-inside">
                <li>Review 24h success/error metrics for anomalies (spikes &gt; 15% error).</li>
                <li>Confirm vector index health (latency &lt; 60ms, no stale shards).</li>
                <li>Validate fallback cascade logs: ensure no persistent high-tier failures.</li>
                <li>Check evaluation pipeline completion status (Ragas + custom metrics).</li>
                <li>Scan rate-limit dashboard for sustained throttling events.</li>
                <li>Verify environment variable integrity against checksum manifest.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Security & Compliance</CardTitle>
              <CardDescription>Controls protecting credentials and sensitive data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3">
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">API Key Rotation</div>
                  <p className="text-xs text-muted-foreground">Groq + Puter keys rotated every 30 days; automated validation script triggers rollback if unauthorized errors appear.</p>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Configuration Drift Detection</div>
                  <p className="text-xs text-muted-foreground">Nightly diff of deployment manifest vs repository infrastructure descriptors.</p>
                </div>
                <div className="p-3 rounded-lg border bg-background/40">
                  <div className="font-medium text-sm mb-1">Access Minimization</div>
                  <p className="text-xs text-muted-foreground">Scoped read-only Upstash token used for RAG queries; write token restricted to ingestion jobs.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCcw className="h-5 w-5" /> Evaluation & Regression Cycle</CardTitle>
              <CardDescription>Quality assurance and performance guardrails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2 list-disc list-inside">
                <li>Nightly Ragas run (relevance, faithfulness, answer completeness).</li>
                <li>Custom radar metrics aggregated and compared against baseline thresholds.</li>
                <li>Automatic alert if coherence or factual accuracy drops &gt; 8%.</li>
                <li>Fallback model usage ratio monitored; sudden spikes prompt LLM health review.</li>
                <li>Evaluation artifacts stored with immutable timestamp + hash.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="dt-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Maintenance Procedures</CardTitle>
              <CardDescription>Scheduled actions preventing degradation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: Clock, title: 'Weekly Vector Hygiene', desc: 'Remove orphaned embeddings, rebuild HNSW layers if fragmentation > threshold.' },
                { icon: Database, title: 'Monthly Backup Audit', desc: 'Verify restore capability from last three snapshots; perform random sample integrity check.' },
                { icon: KeyRound, title: 'Credential Review', desc: 'Purge unused tokens and rotate master secrets; update secret manager references.' },
                { icon: FileCheck, title: 'Schema Drift Scan', desc: 'Confirm evaluation & logging tables align with migration manifests.' },
                { icon: AlertTriangle, title: 'Incident Postmortem', desc: 'Template-driven analysis within 24h of severity ≥ medium events.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-background/40">
                  <item.icon className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="dt-surface mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Incident Response Workflow</CardTitle>
            <CardDescription>Phased approach for production disruptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="space-y-3 list-decimal list-inside">
              <li><span className="font-medium">Detection:</span> Monitoring anomaly or alert threshold breach (error rate, latency, fallback saturation).</li>
              <li><span className="font-medium">Classification:</span> Assign severity (minor / medium / major) and determine affected subsystem.</li>
              <li><span className="font-medium">Containment:</span> Activate degraded mode (Basic RAG + reduced context) if latency runaway.</li>
              <li><span className="font-medium">Remediation:</span> Patch configuration, rotate compromised key, rebuild index or restart worker pool.</li>
              <li><span className="font-medium">Verification:</span> Re-run smoke tests + targeted evaluation subset.</li>
              <li><span className="font-medium">Postmortem:</span> Produce structured report (timeline, root cause, corrective actions, follow-ups).</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
