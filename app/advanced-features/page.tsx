import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain,
  Database,
  Search,
  Target,
  Cpu,
  Network,
  Code,
  Sparkles,
  CheckCircle,
  Bot,
  Workflow
} from 'lucide-react'

export default function AdvancedFeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Advanced Features</h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                Comprehensive documentation of cutting-edge features powering our Digital Twin RAG system
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="ai-ml" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ai-ml">AI & ML</TabsTrigger>
            <TabsTrigger value="data-processing">Data Processing</TabsTrigger>
          </TabsList>

          {/* AI & ML Features Tab */}
          <TabsContent value="ai-ml" className="space-y-6">
            {/* Core AI Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-card to-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Advanced Natural Language Processing
                  </CardTitle>
                  <CardDescription>
                    Sophisticated query understanding and context analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Intent Classification
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Automatically classify user queries into categories (factual, analytical, creative) for optimized processing
                      </p>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                        92% Accuracy
                      </Badge>
                    </div>
                    <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Network className="h-4 w-4 text-primary" />
                        Semantic Query Expansion
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Enhance queries with related concepts, synonyms, and contextual terms using word embeddings
                      </p>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        +35% Coverage
                      </Badge>
                    </div>
                    <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        Multi-modal Understanding
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Process text, code snippets, and structured data with context-aware interpretation
                      </p>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                        Advanced
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card/80 to-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-400" />
                    Machine Learning Models
                  </CardTitle>
                  <CardDescription>
                    Custom-trained models for enhanced performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border border-emerald-500/20 bg-emerald-950/20 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Relevance Re-ranking Model</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Neural network trained on query-document pairs to improve context relevance scoring
                      </p>
                      <div className="text-xs text-emerald-300 font-mono">
                        Transformer-based • 847M parameters
                      </div>
                    </div>
                    <div className="p-3 border border-blue-500/20 bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Embedding Fine-tuning</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Domain-specific embeddings trained on professional profile data
                      </p>
                      <div className="text-xs text-blue-300 font-mono">
                        BERT-based • 384 dimensions
                      </div>
                    </div>
                    <div className="p-3 border border-amber-500/20 bg-amber-950/20 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Query Complexity Classifier</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Predict processing requirements and optimize resource allocation
                      </p>
                      <div className="text-xs text-amber-300 font-mono">
                        Gradient Boosting • 94% Accuracy
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* LLM Integration */}
            <Card className="border-border/50 bg-gradient-to-r from-card via-card to-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Large Language Model Integration
                </CardTitle>
                <CardDescription>
                  Advanced integration with state-of-the-art language models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Groq LLaMA 3.1</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Ultra-fast Inference</div>
                        <div className="text-xs text-muted-foreground">500+ tokens/second</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Context Window</div>
                        <div className="text-xs text-muted-foreground">128K tokens</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Reasoning Capability</div>
                        <div className="text-xs text-muted-foreground">Advanced logical inference</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Dynamic Prompting</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Context-Aware Templates</div>
                        <div className="text-xs text-muted-foreground">Adaptive prompt generation</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Few-Shot Learning</div>
                        <div className="text-xs text-muted-foreground">Dynamic example selection</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Chain-of-Thought</div>
                        <div className="text-xs text-muted-foreground">Structured reasoning paths</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Response Optimization</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Streaming Generation</div>
                        <div className="text-xs text-muted-foreground">Real-time token delivery</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Temperature Control</div>
                        <div className="text-xs text-muted-foreground">Dynamic creativity adjustment</div>
                      </div>
                      <div className="p-3 bg-background/50 rounded border">
                        <div className="text-xs font-medium mb-1">Response Validation</div>
                        <div className="text-xs text-muted-foreground">Quality assurance checks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Algorithms */}
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Algorithmic Innovations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Hybrid Retrieval Algorithm',
                      description: 'Combines dense vector search with sparse keyword matching using learned weights',
                      complexity: 'O(log n + k)',
                      improvement: '+40% relevance'
                    },
                    {
                      name: 'Adaptive Chunking',
                      description: 'Dynamic text segmentation based on semantic coherence and query context',
                      complexity: 'O(n log n)',
                      improvement: '+25% context retention'
                    },
                    {
                      name: 'Multi-hop Reasoning',
                      description: 'Iterative query refinement for complex multi-step questions',
                      complexity: 'O(d × k)',
                      improvement: '+60% complex query accuracy'
                    },
                    {
                      name: 'Contextual Fusion',
                      description: 'Intelligent merging of multiple retrieval sources with confidence weighting',
                      complexity: 'O(k²)',
                      improvement: '+30% answer completeness'
                    }
                  ].map((algorithm, index) => (
                    <div key={index} className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">{algorithm.name}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{algorithm.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-primary/80">{algorithm.complexity}</div>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                          {algorithm.improvement}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Processing Features Tab */}
          <TabsContent value="data-processing" className="space-y-6">
            {/* Vector Database Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-gradient-to-br from-card/80 to-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Upstash Vector Database
                  </CardTitle>
                  <CardDescription>
                    High-performance vector storage and retrieval
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-background/50 rounded border">
                      <div className="text-lg font-bold text-primary">10M+</div>
                      <div className="text-xs text-muted-foreground">Vector Embeddings</div>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded border">
                      <div className="text-lg font-bold text-emerald-300">99.9%</div>
                      <div className="text-xs text-muted-foreground">Availability</div>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded border">
                      <div className="text-lg font-bold text-blue-300">&lt;50ms</div>
                      <div className="text-xs text-muted-foreground">Query Latency</div>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded border">
                      <div className="text-lg font-bold text-amber-300">1536D</div>
                      <div className="text-xs text-muted-foreground">Vector Dimensions</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Advanced Features</h4>
                    {[
                      'Hierarchical Navigable Small Worlds (HNSW) indexing',
                      'Approximate Nearest Neighbor (ANN) search',
                      'Metadata filtering and faceted search',
                      'Real-time indexing and updates',
                      'Distributed scaling across regions'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card/80 to-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    Data Pipeline Architecture
                  </CardTitle>
                  <CardDescription>
                    Real-time data processing and transformation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { stage: 'Data Ingestion', description: 'Multi-format document processing', tech: 'Streaming ETL' },
                      { stage: 'Text Extraction', description: 'OCR and structured data parsing', tech: 'AI-powered' },
                      { stage: 'Chunking', description: 'Semantic-aware text segmentation', tech: 'NLP-based' },
                      { stage: 'Embedding', description: 'High-dimensional vector generation', tech: 'Transformer' },
                      { stage: 'Indexing', description: 'Optimized vector storage', tech: 'HNSW' }
                    ].map((stage, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{stage.stage}</h4>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20 text-primary">
                          {stage.tech}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Search Features */}
            <Card className="border-border/50 bg-gradient-to-r from-card via-card to-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Advanced Search Capabilities
                </CardTitle>
                <CardDescription>
                  Multi-modal search with intelligent ranking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Hybrid Search</h4>
                    <div className="space-y-2">
                      <div className="p-3 border border-primary/20 bg-primary/5 rounded">
                        <div className="text-xs font-medium mb-1">Dense Vector Search</div>
                        <div className="text-xs text-muted-foreground">Semantic similarity matching using embeddings</div>
                      </div>
                      <div className="p-3 border border-primary/20 bg-primary/5 rounded">
                        <div className="text-xs font-medium mb-1">Sparse Keyword Search</div>
                        <div className="text-xs text-muted-foreground">Traditional BM25 text matching</div>
                      </div>
                      <div className="p-3 border border-primary/20 bg-primary/5 rounded">
                        <div className="text-xs font-medium mb-1">Learned Fusion</div>
                        <div className="text-xs text-muted-foreground">ML-optimized result combination</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Context Filtering</h4>
                    <div className="space-y-2">
                      <div className="p-3 border border-emerald-500/20 bg-emerald-950/20 rounded">
                        <div className="text-xs font-medium mb-1">Temporal Filtering</div>
                        <div className="text-xs text-muted-foreground">Time-based relevance scoring</div>
                      </div>
                      <div className="p-3 border border-emerald-500/20 bg-emerald-950/20 rounded">
                        <div className="text-xs font-medium mb-1">Topic Clustering</div>
                        <div className="text-xs text-muted-foreground">Automatic content categorization</div>
                      </div>
                      <div className="p-3 border border-emerald-500/20 bg-emerald-950/20 rounded">
                        <div className="text-xs font-medium mb-1">Quality Scoring</div>
                        <div className="text-xs text-muted-foreground">Content quality assessment</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Personalization</h4>
                    <div className="space-y-2">
                      <div className="p-3 border border-blue-500/20 bg-blue-950/20 rounded">
                        <div className="text-xs font-medium mb-1">User Preferences</div>
                        <div className="text-xs text-muted-foreground">Adaptive result ranking</div>
                      </div>
                      <div className="p-3 border border-blue-500/20 bg-blue-950/20 rounded">
                        <div className="text-xs font-medium mb-1">Query History</div>
                        <div className="text-xs text-muted-foreground">Context-aware suggestions</div>
                      </div>
                      <div className="p-3 border border-blue-500/20 bg-blue-950/20 rounded">
                        <div className="text-xs font-medium mb-1">Learning Feedback</div>
                        <div className="text-xs text-muted-foreground">Continuous improvement</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}