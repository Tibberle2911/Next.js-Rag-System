/**
 * RAG Mode Selector Component
 * Allows users to choose between basic and advanced RAG processing
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Zap, Settings, Brain, Search } from "lucide-react"
import { RAGMode } from "@/app/actions"
import { AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"

interface RAGModeSelectorProps {
  currentMode: RAGMode
  onModeChange: (mode: RAGMode) => void
  advancedConfig: Partial<AdvancedRAGConfig>
  onAdvancedConfigChange: (config: Partial<AdvancedRAGConfig>) => void
  isLoading?: boolean
}

export function RAGModeSelector({
  currentMode,
  onModeChange,
  advancedConfig,
  onAdvancedConfigChange,
  isLoading = false
}: RAGModeSelectorProps) {
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  
  const mergedConfig = { ...DEFAULT_ADVANCED_CONFIG, ...advancedConfig }

  const handleTechniqueToggle = (technique: keyof AdvancedRAGConfig, value: boolean) => {
    onAdvancedConfigChange({
      ...advancedConfig,
      [technique]: value
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>RAG Processing Mode</CardTitle>
          </div>
          <CardDescription>
            Choose between basic retrieval or advanced query transformation techniques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentMode} onValueChange={(value) => onModeChange(value as RAGMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" disabled={isLoading}>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Basic RAG</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="advanced" disabled={isLoading}>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Advanced RAG</span>
                  <Badge variant="secondary" className="ml-1">Beta</Badge>
                </div>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-3 mt-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Basic RAG Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Vector similarity search</li>
                  <li>• Behavioral query optimization</li>
                  <li>• Standard response generation</li>
                  <li>• Fast processing (~1-2 seconds)</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-3 mt-4">
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Advanced Techniques</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        mergedConfig.useMultiQuery ? 'bg-blue-300 shadow-blue-400/50' : 'bg-muted border border-border'
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Multi-Query Generation</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generates multiple perspectives of your question for better recall</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        mergedConfig.useRagFusion ? 'bg-blue-300 shadow-blue-400/50' : 'bg-muted border border-border'
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">RAG-Fusion (RRF)</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Intelligently re-ranks documents using Reciprocal Rank Fusion</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        mergedConfig.useDecomposition ? 'bg-blue-300 shadow-blue-400/50' : 'bg-muted border border-border'
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Query Decomposition</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Breaks complex queries into manageable sub-questions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        mergedConfig.useStepBack ? 'bg-blue-300 shadow-blue-400/50' : 'bg-muted border border-border'
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Step-Back Prompting</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Transforms specific queries into broader, more retrievable questions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        mergedConfig.useHyde ? 'bg-blue-300 shadow-blue-400/50' : 'bg-muted border border-border'
                      }`} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">HyDE</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hypothetical Document Embeddings for semantic similarity</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="text-muted-foreground">
                      Processing: ~3-6 seconds
                    </div>
                  </div>
                </div>
                
                {/* Advanced Configuration Panel */}
                {showAdvancedConfig && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Advanced Configuration</CardTitle>
                      <CardDescription>
                        Customize which techniques to apply for optimal performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="multi-query">Multi-Query Generation</Label>
                            <Switch
                              id="multi-query"
                              checked={mergedConfig.useMultiQuery}
                              onCheckedChange={(checked) => handleTechniqueToggle('useMultiQuery', checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="rag-fusion">RAG-Fusion (RRF)</Label>
                            <Switch
                              id="rag-fusion"
                              checked={mergedConfig.useRagFusion}
                              onCheckedChange={(checked) => handleTechniqueToggle('useRagFusion', checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="decomposition">Query Decomposition</Label>
                            <Switch
                              id="decomposition"
                              checked={mergedConfig.useDecomposition}
                              onCheckedChange={(checked) => handleTechniqueToggle('useDecomposition', checked)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="step-back">Step-Back Prompting</Label>
                            <Switch
                              id="step-back"
                              checked={mergedConfig.useStepBack}
                              onCheckedChange={(checked) => handleTechniqueToggle('useStepBack', checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="hyde">HyDE</Label>
                            <Switch
                              id="hyde"
                              checked={mergedConfig.useHyde}
                              onCheckedChange={(checked) => handleTechniqueToggle('useHyde', checked)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onAdvancedConfigChange(DEFAULT_ADVANCED_CONFIG)}
                          >
                            Reset to Defaults
                          </Button>
                          
                          <div className="text-sm text-muted-foreground">
                            {Object.values(mergedConfig).filter(v => typeof v === 'boolean' && v).length} techniques enabled
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Performance Comparison */}
      {currentMode === "advanced" && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-lg">Expected Improvements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-primary/8 border border-primary/15 rounded-xl">
                <div className="font-bold text-lg text-blue-300 mb-1">+15-25%</div>
                <div className="text-muted-foreground">Answer Quality</div>
              </div>
              <div className="text-center p-4 bg-primary/8 border border-primary/15 rounded-xl">
                <div className="font-bold text-lg text-blue-300 mb-1">+20-30%</div>
                <div className="text-muted-foreground">Retrieval Accuracy</div>
              </div>
              <div className="text-center p-4 bg-primary/8 border border-primary/15 rounded-xl">
                <div className="font-bold text-lg text-blue-300 mb-1">Enhanced</div>
                <div className="text-muted-foreground">Complex Queries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}