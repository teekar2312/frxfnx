'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PriceChart } from '@/components/trading/price-chart'
import { OrderTicket } from '@/components/trading/order-ticket'
import { PositionsTable } from '@/components/trading/positions-table'
import { useUIStore } from '@/store/ui'

export function TradingView() {
  const [tf, setTf] = useState<'1s' | '5s' | '15s'>('1s')
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  return (
    <div className="grid grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Live Chart · {activeSymbol}</CardTitle>
            <Tabs value={tf} onValueChange={(v) => setTf(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="1s" className="text-xs">1s</TabsTrigger>
                <TabsTrigger value="5s" className="text-xs">M1</TabsTrigger>
                <TabsTrigger value="15s" className="text-xs">M15</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <PriceChart symbol={activeSymbol} height={320} />
          </CardContent>
        </Card>
        <PositionsTable />
      </div>
      <div className="space-y-4">
        <OrderTicket />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Eksekusi Cepat (One-Click)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              One-click execution memerlukan konfirmasi SL/TP berbasis pips & server-side stop. Lot mengikuti risk {`{riskPerTradePct}`}%.
            </p>
            <p className="text-amber-500">
              Catatan: Hindari pending order dekat dengan jam rilis berita (slippage risk).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
