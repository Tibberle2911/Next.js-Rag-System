"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
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
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Sources ({sources.length})</CardTitle>
        <p className="text-xs text-muted-foreground mt-2">Retrieved from your professional profile</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source, idx) => (
            <div key={source.id || idx} className="space-y-2 pb-4 border-b border-border last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm line-clamp-2">{source.title}</h4>
                <Badge variant="outline" className="text-xs shrink-0">
                  {(source.score * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{source.content}</p>
              <div className="flex gap-2 flex-wrap">
                {source.category && (
                  <Badge variant="secondary" className="text-xs">
                    {source.category}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
