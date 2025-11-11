"use client"

import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={cn(
      "flex w-full gap-4 py-6 px-1 transition-all duration-200",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 via-primary/30 to-primary/20 border border-primary/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-2xl rounded-xl px-6 py-4 text-sm shadow-sm transition-all duration-200",
          isUser 
            ? "bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/30" 
            : "bg-gradient-to-r from-card via-background to-card border border-border/50 text-foreground shadow-black/5 hover:shadow-primary/5 backdrop-blur",
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p className={cn(
          "mt-3 text-xs transition-colors duration-200",
          isUser ? "text-primary-foreground/80" : "text-muted-foreground/70"
        )}>
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary/90 via-primary to-primary/90 border border-primary/30 flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
