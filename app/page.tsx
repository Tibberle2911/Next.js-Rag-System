"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { ChatMessage, type Message } from "@/components/chat-message"
import { SourcesPanel, type Source } from "@/components/sources-panel"
import { InputForm } from "@/components/input-form"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ragQuery } from "@/app/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
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
      const result = await ragQuery(question)

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
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.answer || "I couldn't generate a response. Please try again.",
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
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex justify-start py-4">
                  <div className="bg-secondary text-secondary-foreground border border-border rounded-lg px-4 py-3">
                    <LoadingSpinner className="h-6" />
                    <p className="text-sm text-muted-foreground mt-2">Searching your profile...</p>
                  </div>
                </div>
              )}

              {error && !isLoading && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-background/50 backdrop-blur px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="max-w-5xl mx-auto">
              <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* Sources sidebar */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card/50 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <SourcesPanel sources={sources} isLoading={isLoading} />

            {!isLoading && sources.length === 0 && (
              <div className="text-center text-sm text-muted-foreground space-y-3">
                <p className="font-medium">Retrieved sources will appear here</p>
                <p>Ask me a question to see relevant information from my professional profile.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
