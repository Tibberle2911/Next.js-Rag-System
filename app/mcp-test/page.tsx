'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TestTube } from 'lucide-react'
import { runAllMCPTests, testBasicRAG, testAdvancedRAG, testRAGWithMode, testListTools } from '@/app/actions/mcp-test'

export default function MCPTestPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const runTest = async (testFn: () => Promise<any>, testName: string) => {
    setLoading(true)
    try {
      const result = await testFn()
      setResults(prev => [...prev, { name: testName, result, success: true, timestamp: new Date() }])
    } catch (error) {
      setResults(prev => [...prev, { 
        name: testName, 
        result: { error: error instanceof Error ? error.message : 'Unknown error' }, 
        success: false, 
        timestamp: new Date() 
      }])
    }
    setLoading(false)
  }

  const clearResults = () => setResults([])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
              <TestTube className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">MCP Server Testing</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-gradient-to-r from-secondary/80 to-accent/60">
                  Digital Twin RAG
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground font-medium">
            Test the Model Context Protocol server implementation for the Digital Twin RAG system.
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card className="border-border/50 bg-gradient-to-r from-card via-card to-card/80 shadow-lg shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                  <TestTube className="h-4 w-4 text-primary" />
                </div>
                MCP Server Tests
              </CardTitle>
              <CardDescription className="text-base">
                Test individual MCP tools and server actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => runTest(testListTools, 'List Tools')}
                  disabled={loading}
                  variant="outline"
                >
                  Test List Tools
                </Button>
                <Button 
                  onClick={() => runTest(testBasicRAG, 'Basic RAG')}
                  disabled={loading}
                  variant="outline"
                >
                  Test Basic RAG
                </Button>
                <Button 
                  onClick={() => runTest(testAdvancedRAG, 'Advanced RAG')}
                  disabled={loading}
                  variant="outline"
                >
                  Test Advanced RAG
                </Button>
                <Button 
                  onClick={() => runTest(testRAGWithMode, 'RAG with Mode')}
                  disabled={loading}
                  variant="outline"
                >
                  Test RAG with Mode
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => runTest(runAllMCPTests, 'All Tests')}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Running Tests...' : 'Run All Tests'}
                </Button>
                <Button onClick={clearResults} variant="outline">
                  Clear Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            {results.map((result, index) => (
              <Card key={index} className={`${result.success ? 'border-emerald-400/40 bg-emerald-950/20' : 'border-rose-400/40 bg-rose-950/20'} transition-colors`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{result.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Error'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}