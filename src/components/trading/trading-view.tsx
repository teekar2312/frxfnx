'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PriceChart } from '@/components/trading/price-chart'
import { OrderTicket } from '@/components/trading/order-ticket'
import { PositionsTable } from '@/components/trading/positions-table'
import { PendingOrdersView } from '@/components/trading/pending-orders-view'
import { IndicatorsPanel } from '@/components/indicators/indicators-panel'
import { DrawingToolbar } from '@/components/drawing/drawing-toolbar'
import { SessionMarkers } from '@/components/drawing/session-markers'
import { useUIStore } from '@/store/ui'

export function TradingView() {
  const [tf, setTf] = useState<'1s' | '5s' | '15s'>('1s')
  const [tab, setTab] = useState<'market' | 'pending' | 'indicators' | 'drawing'>('market')
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  return (
    <div className="grid grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Live Chart · {activeSymbol}</CardTitle>
            <div className="flex items-center gap-2">
              <SessionMarkers />
              <Tabs value={tf} onValueChange={(v) => setTf(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="1s" className="text-xs">1s</TabsTrigger>
                  <TabsTrigger value="5s" className="text-xs">M1</TabsTrigger>
                  <TabsTrigger value="15s" className="text-xs">M15</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <PriceChart symbol={activeSymbol} height={320} />
          </CardContent>
        </Card>

        <IndicatorsPanel />
        <DrawingToolbar />
        <PositionsTable />
      </div>
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="indicators" className="text-xs">Indikator</TabsTrigger>
            <TabsTrigger value="drawing" className="text-xs">Drawing</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'market' && <OrderTicket />}
        {tab === 'pending' && <PendingOrdersView />}
        {tab === 'indicators' && <IndicatorsPanel />}
        {tab === 'drawing' && <DrawingToolbar />}
      </div>
    </div>
  )
}
