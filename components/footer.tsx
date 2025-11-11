"use client"

import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-gradient-to-r from-background via-card/30 to-background backdrop-blur py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
            <p>Digital Twin RAG &copy; 2025</p>
            <span className="hidden sm:inline text-muted-foreground/60">•</span>
            <span className="hidden sm:inline">Building the future of AI</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-blue-300 fill-current" />
            <span>using Next.js 15, React 19, and Groq</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
