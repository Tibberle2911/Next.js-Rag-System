"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { ChatMessage, type Message } from "@/components/chat-message"
import { SourcesPanel, type Source } from "@/components/sources-panel"
import { InputForm } from "@/components/input-form"
import { LoadingSpinner } from "@/components/loading-spinner"
import { RAGModeSelector } from "@/components/rag-mode-selector"
import { ragQuery, RAGMode } from "@/app/actions"
import { AdvancedRAGConfig, DEFAULT_ADVANCED_CONFIG } from "@/lib/advanced-rag-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Settings, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "Hi! I'm your Digital Twin assistant. Ask me about my experience, skills, projects, or career goals. I can provide detailed information about my professional background.",
      // Use a stable timestamp for prerender; update on mount
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
      const result = await ragQuery(question, ragMode, advancedConfig)

      if (result.error) {
        setError(result.error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${result.error}. Please try again.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } else {
        setSources(result.sources)
        
        // Add metadata to response if available
        let responseContent = result.answer || "I couldn't generate a response. Please try again."
        if (result.metadata?.techniquesUsed && result.metadata.techniquesUsed.length > 0) {
          responseContent += `\n\n*Enhanced using: ${result.metadata.techniquesUsed.join(", ")}*`
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
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
  }, [ragMode, advancedConfig])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
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
