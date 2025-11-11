"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, TrendingUp } from "lucide-react"

export interface Source {
  id: string
  title: string
  content: string
  score: number
  category: string
}

export function SourcesPanel({ sources, isLoading }: { sources: Source[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-card/80 border border-border/50 shadow-lg shadow-black/5">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sources</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3 p-4 bg-gradient-to-r from-background/50 via-card/30 to-background/50 rounded-lg border border-border/30">
                <div className="h-5 bg-muted/60 rounded w-3/4" />
                <div className="h-3 bg-muted/40 rounded w-full" />
                <div className="h-3 bg-muted/40 rounded w-5/6" />
                <div className="h-6 bg-muted/30 rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-card via-card to-card/80 border border-border/50 shadow-lg shadow-black/5 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Sources ({sources.length})</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Retrieved from your professional profile
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source, idx) => (
            <div 
              key={source.id || idx} 
              className="group p-4 bg-gradient-to-r from-background/50 via-card/30 to-background/50 rounded-lg border border-border/30 hover:border-primary/20 transition-all duration-200 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                  {source.title}
                </h4>
                <Badge 
                  variant="outline" 
                  className="text-xs shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-primary"
                >
                  {(source.score * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed mb-3">
                {source.content}
              </p>
              {source.category && (
                <div className="flex gap-2 flex-wrap">
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-gradient-to-r from-secondary via-secondary to-secondary/90 hover:from-primary/10 hover:to-primary/5 transition-all duration-200"
                  >
                    {source.category}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
