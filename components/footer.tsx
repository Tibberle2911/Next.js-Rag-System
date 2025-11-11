"use client"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 py-4 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-muted-foreground">
          <p>Digital Twin RAG &copy; 2025</p>
          <div className="flex gap-4">
            <p>Built with Next.js 15, React 19, and Groq</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
