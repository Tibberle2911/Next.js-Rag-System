import { Header } from '@/components/header'
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
  CheckCircle
} from 'lucide-react'

export default function GithubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
              <Github className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">GitHub Repository</h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                Explore the advanced implementation of our Next.js RAG System
              </p>
            </div>
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
                This repository contains the complete implementation of our advanced Digital Twin RAG system, 
                featuring cutting-edge AI capabilities, optimized vector search, and comprehensive MCP server integration.
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

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Advanced AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Groq LLaMA Integration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Multi-Query Generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  RAG Fusion Techniques
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Semantic Search
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Vector Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Upstash Vector
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  High-Speed Retrieval
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Embedding Models
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Similarity Search
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Modern Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Next.js 15.5.3+
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  TypeScript
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  ShadCN UI
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  MCP Server
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>



        {/* Technology Stack */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Technology Stack
            </CardTitle>
            <CardDescription>
              Modern technologies powering this implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Next.js 15.5.3+</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">React 18+</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">ShadCN UI</Badge>
              <Badge variant="outline">Upstash Vector</Badge>
              <Badge variant="outline">Groq API</Badge>
              <Badge variant="outline">LLaMA 3.1</Badge>
              <Badge variant="outline">MCP Server</Badge>
              <Badge variant="outline">RAG Fusion</Badge>
              <Badge variant="outline">Vector Embeddings</Badge>
              <Badge variant="outline">Semantic Search</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}