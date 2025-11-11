"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, MessageSquare } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Digital Twin</h1>
            <p className="text-sm text-muted-foreground">AI-Powered Professional Profile Assistant</p>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
              </Link>
              <Link href="/evaluation">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Evaluation
                </Button>
              </Link>
            </nav>
            
            <div className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-primary">Groq</span> &{" "}
              <span className="font-semibold text-primary">Upstash</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
