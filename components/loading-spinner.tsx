"use client"

import { cn } from "@/lib/utils"

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5 py-4", className)}>
      <div className="relative flex gap-1.5">
        <div className="h-2.5 w-2.5 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full animate-pulse shadow-sm shadow-primary/30" style={{ animationDelay: "0ms" }} />
        <div className="h-2.5 w-2.5 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full animate-pulse shadow-sm shadow-primary/30" style={{ animationDelay: "200ms" }} />
        <div className="h-2.5 w-2.5 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full animate-pulse shadow-sm shadow-primary/30" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  )
}
