"use client"

import dynamic from 'next/dynamic'
const LiveMetricsClientOnly = dynamic(() => import('@/components/monitoring/live-metrics'), { ssr: false })
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MonitoringPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-1">Monitoring & Validation</h1>
        <p className="text-sm text-muted-foreground mb-6">Live system metrics.</p>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid grid-cols-1 w-full">
            <TabsTrigger value="live">Live Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-6">
            <LiveMetricsClientOnly />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
