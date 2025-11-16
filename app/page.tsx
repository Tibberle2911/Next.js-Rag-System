"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChatMessage, type Message } from "@/components/chat-message"
import { SourcesPanel, type Source } from "@/components/sources-panel"
import { InputForm } from "@/components/input-form"
import { LoadingSpinner } from "@/components/loading-spinner"
import { RAGModeSelector } from "@/components/rag-mode-selector"
import { PuterSignIn } from "@/components/puter-signin"
import { usePuterAuth } from "@/lib/puter-auth"
import { ragQuery, RAGMode } from "@/app/actions"
import { AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"
import { streamPuterAIResponse, streamPuterAIWithRetrieval } from "@/lib/puter-ai-client"
import { streamAdvancedPuterRAG } from "@/lib/advanced-puter-rag-client"
import { getCanonicalName } from "@/lib/canonical-name"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Settings, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function Page() {
  const { isAuthenticated, isLoading: authLoading, getAuthToken, getPuterClient } = usePuterAuth()
  
  // Always require authentication - no fallback to Gemini/Groq
  // User MUST sign in with Puter to use the application
  const requiresAuth = !isAuthenticated
  const canonicalName = getCanonicalName()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: `Hi! I'm virtual ${canonicalName}. Ask me about my experience, skills, projects, or career goals. I can provide detailed information about my professional background.`,
      timestamp: new Date(0),
    },
  ])
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [ragMode, setRagMode] = useState<RAGMode>("basic")
  const [advancedConfig, setAdvancedConfig] = useState<Partial<AdvancedRAGConfig>>(DEFAULT_ADVANCED_CONFIG)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update initial message timestamp on client after hydration
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m, idx) => (idx === 0 ? { ...m, timestamp: new Date() } : m)),
    )
  }, [])

  const handleSubmit = useCallback(async (question: string) => {
    setError("")

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        throw new Error('Please sign in with Puter to use the Digital Twin')
      }

      // Prepare a streaming assistant message placeholder
      const assistantId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      let usedFallback = false
      try {
        // Ensure Puter SDK is ready
        if (typeof (window as any).puter?.ai?.chat !== 'function') {
          throw new Error('Puter SDK not available or user not authenticated. Please sign in and refresh the page.')
        }

        if (ragMode === "advanced") {
          // Use advanced Puter RAG pipeline (multi-query, fusion, etc.) then stream final answer
          const { final } = await streamAdvancedPuterRAG({
            question,
            config: advancedConfig as any,
            canonicalName,
            temperature: 0.7,
            maxTokens: 1500,
            topK: 8,
            onContext: (ctxSources) => setSources(ctxSources),
            onChunk: (delta) => {
              setMessages((prev) => prev.map(m => {
                if (m.id === assistantId) {
                  return { ...m, content: (m.content || "") + delta }
                }
                return m
              }))
            },
            onDone: () => {},
          })
          console.log('✅ Streaming (advanced) finished, length:', final.length)
        } else {
          // Basic mode: perform retrieval inside streaming pipeline
          try {
            const { final } = await streamPuterAIWithRetrieval({
              question,
              canonicalName,
              temperature: 0.7,
              maxTokens: 1500,
              topK: 8,
              onContext: (ctxSources) => setSources(ctxSources),
              onChunk: (delta) => {
                setMessages((prev) => prev.map(m => {
                  if (m.id === assistantId) {
                    return { ...m, content: (m.content || "") + delta }
                  }
                  return m
                }))
              },
              onDone: () => {},
            })
            console.log('✅ Streaming (basic) finished, length:', final.length)
          } catch (streamErr: any) {
            const streamMsg = (streamErr?.message || '').toLowerCase()
            const isModeration = streamMsg.includes('no working moderation service')
            if (isModeration) {
              console.warn('⚠️ Moderation service unavailable. Falling back to pipeline /api/chat.')
              usedFallback = true
              // Call server-side pipeline for an answer
              try {
                const resp = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: question, mode: 'basic' })
                })
                const data = await resp.json()
                const fallbackText = data.message || 'Fallback pipeline produced no answer.'
                setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: fallbackText + (usedFallback ? '\n\n[Used fallback provider]' : '') } : m))
                setSources(data.sources || [])
              } catch (fallbackErr) {
                setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: 'Fallback provider failed: ' + (fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)) } : m))
              }
            } else {
              throw streamErr
            }
          }
        }
      } catch (puterError: any) {
        console.error('❌ Puter AI streaming failed:', puterError)
        let errMsg = (puterError && (puterError.message || (typeof puterError === 'string' ? puterError : ''))) || ''
        if (!errMsg) {
          try {
            const asJson = JSON.stringify(puterError)
            if (asJson && asJson !== '{}') errMsg = asJson
          } catch {}
        }
        if (!errMsg) {
          const asStr = puterError?.toString?.()
          errMsg = asStr && asStr !== '[object Object]' ? asStr : 'Unknown Puter error'
        }
        // Provide actionable guidance for common permission/usage errors
        const lower = errMsg.toLowerCase()
        const isRateLimit = lower.includes('rate') || lower.includes('quota') || lower.includes('429')
        const reason = isRateLimit ? 'rate_limit' : lower.includes('permission') ? 'permission_denied' : 'error'
        
        // Log Puter→Gemini fallback to database
        fetch('/api/metrics/client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'fallback',
            from: 'puter',
            to: 'gemini',
            reason,
            query: question.substring(0, 512),
            originalStatus: isRateLimit ? 429 : 500,
            message: errMsg.substring(0, 256)
          })
        }).catch(e => console.warn('Failed to log Puter→Gemini fallback:', e))
        
        if (lower.includes('permission denied') || lower.includes('usage-limited') || lower.includes('quota') || lower.includes('rate')) {
          errMsg += ' — This may be due to account usage limits. Try logging out (top right) and signing in with a different Puter account.'
        }
        setMessages((prev) => prev.map(m => (
          m.id === assistantId
            ? { ...m, content: usedFallback
                ? (m.content && m.content.length ? m.content : 'Fallback completed.')
                : `Puter AI generation failed: ${errMsg}. Please check browser console.` }
            : m
        )))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMsg)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error: ${errorMsg}. Please check your configuration and try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [ragMode, advancedConfig, getAuthToken])

  // Show authentication UI only if Puter is available AND user is not authenticated
  // If Puter is unavailable, allow access (will use Gemini/Groq fallback)
  if (authLoading || requiresAuth) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto">
            <PuterSignIn />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
      
      {/* RAG Mode Configuration */}
      <Collapsible open={showModeSelector} onOpenChange={setShowModeSelector}>
        <div className="border-b border-border/40 bg-card/50 backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto gap-3 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full shadow-sm transition-all duration-300 ${ 
                ragMode === "advanced" 
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 shadow-purple-500/30" 
                  : "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30"
              }`} />
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {ragMode === "advanced" ? "Advanced RAG" : "Basic RAG"} Mode
                </span>
                {ragMode === "advanced" && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {Object.values(advancedConfig).filter(v => typeof v === 'boolean' && v).length} techniques enabled
                  </div>
                )}
              </div>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-accent/80 transition-colors w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>        <CollapsibleContent>
          <div className="border-b border-border/40 bg-gradient-to-r from-muted/50 to-accent/30 backdrop-blur">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
              <RAGModeSelector
                currentMode={ragMode}
                onModeChange={setRagMode}
                advancedConfig={advancedConfig}
                onAdvancedConfigChange={setAdvancedConfig}
                isLoading={isLoading}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex-1 overflow-hidden flex flex-col xl:flex-row max-w-7xl mx-auto w-full">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
                  <ChatMessage message={message} />
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start py-4 animate-in slide-in-from-bottom-2 fade-in-0">
                  <div className="bg-gradient-to-r from-secondary/80 to-accent/60 text-secondary-foreground border border-border/50 rounded-xl px-3 sm:px-4 py-3 shadow-lg shadow-accent/10 backdrop-blur max-w-full">
                    <LoadingSpinner className="h-5 sm:h-6" />
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                      {ragMode === "advanced" ? "Processing with advanced techniques..." : "Searching your profile..."}
                    </p>
                  </div>
                </div>
              )}

              {error && !isLoading && (
                <div className="animate-in slide-in-from-bottom-2 fade-in-0">
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border/40 bg-card/50 backdrop-blur px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
            <div className="max-w-4xl mx-auto">
              <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* Sources sidebar */}
        <div className="w-full xl:w-80 2xl:w-96 border-t xl:border-t-0 xl:border-l border-border/40 bg-gradient-to-b from-card/60 to-muted/40 overflow-y-auto backdrop-blur">
          <div className="p-4 sm:p-6">
            <SourcesPanel sources={sources} isLoading={isLoading} />

            {!isLoading && sources.length === 0 && (
              <div className="text-center text-xs sm:text-sm text-muted-foreground space-y-4 mt-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary/60" />
                </div>
                <div>
                  <p className="font-semibold text-foreground/80 mb-1 text-sm sm:text-base">Retrieved sources will appear here</p>
                  <p className="text-xs sm:text-sm">Ask me a question to see relevant information from my professional profile.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
