"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface InputFormProps {
  onSubmit: (question: string) => void
  isLoading?: boolean
  disabled?: boolean
}

export function InputForm({ onSubmit, isLoading, disabled }: InputFormProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading && !disabled) {
      onSubmit(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="flex gap-2 sm:gap-3 p-1 bg-gradient-to-r from-card via-background to-card rounded-xl border border-border/50 shadow-lg shadow-primary/5 backdrop-blur">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about experience, skills, projects, or career goals..."
            disabled={isLoading || disabled}
            aria-label="Question input"
            aria-describedby="input-help"
            className={cn(
              "flex-1 min-h-10 sm:min-h-12 max-h-24 sm:max-h-32 resize-none rounded-lg border-0 bg-transparent px-3 sm:px-4 py-2 sm:py-3 text-sm",
              "placeholder:text-muted-foreground/70",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus:ring-0",
              "transition-all duration-200"
            )}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 self-end rounded-lg transition-all duration-200",
              "bg-gradient-to-r from-primary via-primary to-primary/90",
              "hover:scale-105 hover:shadow-md hover:shadow-primary/30",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
            )}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 sm:mt-3 px-1 gap-1 sm:gap-0">
        <p id="input-help" className="text-xs text-muted-foreground/80">Press Ctrl+Enter to send</p>
        <div className={cn(
          "text-xs transition-colors duration-200",
          input.length > 500 ? "text-destructive" : "text-muted-foreground/60"
        )}
        aria-label={`Character count: ${input.length} of 1000`}
        >
          {input.length}/1000
        </div>
      </div>
    </form>
  )
}
