import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Github,
  ExternalLink,
  Code,
  Star,
  GitFork,
  Download,
  Cpu,
  Database,
  Sparkles,
  CheckCircle,
  Zap,
  Layers,
  Brain,
  Network,
  ShieldCheck
} from 'lucide-react'

export default function GithubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/10 border border-primary/30 shadow-sm shadow-primary/20">
              <Github className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="dt-heading-2">Repository & Tech Stack</h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                Core architecture, RAG modes, fallback strategies and evaluation toolchain
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Next.js</Badge>
            <Badge variant="outline">RAG</Badge>
            <Badge variant="outline">Upstash</Badge>
            <Badge variant="outline">Groq</Badge>
            <Badge variant="outline">Puter</Badge>
            <Badge variant="outline">Ragas</Badge>
          </div>
        </div>

        {/* Main Repository Card */}
        <Card className="mb-6 sm:mb-8 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-lg shadow-primary/20">
                  <Github className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Next.js RAG System</CardTitle>
                  <CardDescription className="font-medium text-sm sm:text-base">
                    Advanced Digital Twin with Retrieval-Augmented Generation
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Repository
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  Next.js
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Source for the Digital Twin RAG platform. Implements dual RAG modes (Basic single-query & Advanced multi-query fusion), 
                multi-model Puter fallback cascade, Groq LLaMA 3.1 generation, evaluation loops (Ragas + custom radar metrics) and MCP server actions for tool discovery.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button asChild className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <a 
                    href="https://github.com/Tibberle2911/Next.js-Rag-System" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    View Repository
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <a 
                    href="https://github.com/Tibberle2911/Next.js-Rag-System/archive/main.zip" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download ZIP
                  </a>
                </Button>
                <Button variant="outline" asChild className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <a 
                    href="https://github.com/Tibberle2911/Next.js-Rag-System/fork" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <GitFork className="h-4 w-4" />
                    Fork
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {[
            {
              title: 'AI & Generation',
              icon: Cpu,
              items: ['Groq LLaMA 3.1', 'Streaming tokens', 'Dynamic prompt shaping', 'Moderation-aware retries']
            },
            {
              title: 'Retrieval Layer',
              icon: Database,
              items: ['Upstash Vector', 'Hybrid search (dense+sparse)', 'Multi-query expansion', 'Re-ranking fusion']
            },
            {
              title: 'Resilience & Quality',
              icon: ShieldCheck,
              items: ['Puter model cascade', 'Ragas evaluation', 'Custom radar metrics', 'Design token system']
            }
          ].map((block, i) => (
            <Card key={i} className="dt-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <block.icon className="h-5 w-5 text-primary" />
                  {block.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {block.items.map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      {x}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>



        {/* Technology Stack */}
        <Card className="mt-2 dt-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Detailed Stack Components
            </CardTitle>
            <CardDescription>Grouped by concern for fast discovery</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-primary"><Code className="h-4 w-4" /> Core Framework</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Next.js 15+</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">App Router</Badge>
                  <Badge variant="outline">Server Actions</Badge>
                  <Badge variant="outline">ShadCN UI</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-primary"><Network className="h-4 w-4" /> Retrieval & Storage</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Upstash Vector</Badge>
                  <Badge variant="outline">Hybrid Search</Badge>
                  <Badge variant="outline">Embeddings (Groq)</Badge>
                  <Badge variant="outline">Metadata Filters</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-primary"><Zap className="h-4 w-4" /> Generation & Resilience</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Groq LLaMA 3.1</Badge>
                  <Badge variant="outline">Puter Cascade</Badge>
                  <Badge variant="outline">Advanced RAG</Badge>
                  <Badge variant="outline">Basic RAG</Badge>
                  <Badge variant="outline">Streaming Output</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-primary"><Layers className="h-4 w-4" /> Evaluation & Quality</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Ragas</Badge>
                <Badge variant="outline">Custom Metrics</Badge>
                <Badge variant="outline">Radar Visualization</Badge>
                <Badge variant="outline">24h Aggregates</Badge>
                <Badge variant="outline">Fallback Analytics</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-primary"><Brain className="h-4 w-4" /> Design & UX</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Design Tokens</Badge>
                <Badge variant="outline">dt-heading scale</Badge>
                <Badge variant="outline">Semantic Chart Colors</Badge>
                <Badge variant="outline">Dark Theme</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}