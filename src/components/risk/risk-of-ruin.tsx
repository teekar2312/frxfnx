'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { calcRiskOfRuin } from '@/lib/risk/ruin'
import { cn } from '@/lib/utils'

export function RiskOfRuinCalculator() {
  const [winRate, setWinRate] = useState(55)
  const [rr, setRr] = useState(2)
  const [riskPerTrade, setRiskPerTrade] = useState(0.5)
  const [ruinLevel, setRuinLevel] = useState(50)
  const [trades, setTrades] = useState(100)
  const [runId, setRunId] = useState(0)

  const result = useMemo(() => calcRiskOfRuin({ winRate, rr, riskPerTrade, ruinLevel, trades }), [winRate, rr, riskPerTrade, ruinLevel, trades, runId])

  // Equity curve mini chart
  const equityPath = useMemo(() => {
    if (!result.simulatedEquity.length) return ''
    const min = Math.min(...result.simulatedEquity.map((e) => e.min))
    const max = Math.max(...result.simulatedEquity.map((e) => e.max))
    const range = max - min || 1
    const w = 100, h = 100
    const step = w / Math.max(1, result.simulatedEquity.length - 1)
    return result.simulatedEquity.map((e, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - ((e.equity - min) / range) * h).toFixed(2)}`).join(' ')
  }, [result])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Risk of Ruin Calculator</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRunId((r) => r + 1)}>Re-simulate</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Win Rate (%)</Label>
              <Input type="number" step="1" min="1" max="99" value={winRate} onChange={(e) => setWinRate(parseFloat(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">R:R ratio</Label>
              <Input type="number" step="0.1" min="0.1" value={rr} onChange={(e) => setRr(parseFloat(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">Risk per trade (%)</Label>
              <Input type="number" step="0.05" min="0.1" max="10" value={riskPerTrade} onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">Ruin Level (% loss)</Label>
              <Input type="number" step="5" min="10" max="90" value={ruinLevel} onChange={(e) => setRuinLevel(parseFloat(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">Trades</Label>
              <Input type="number" step="10" min="10" max="1000" value={trades} onChange={(e) => setTrades(parseInt(e.target.value) || 100)} className="h-8 text-sm tabular-nums" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2 text-xs">
            <span>Risk of Ruin</span>
            <Badge variant={result.probability > 30 ? 'destructive' : result.probability > 10 ? 'outline' : 'outline'} className={cn('tabular-nums', result.probability > 30 ? 'bg-red-500 text-white' : result.probability > 10 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white')}>
              {result.probability.toFixed(2)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Expected growth/trade</span>
            <span className={cn('font-medium tabular-nums', result.expectedGrowthPerTrade >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {result.expectedGrowthPerTrade >= 0 ? '+' : ''}{result.expectedGrowthPerTrade}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Kelly optimal risk</span>
            <span className="font-medium tabular-nums">{result.kelly.toFixed(2)}%</span>
          </div>
          {equityPath && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full border rounded">
              <path d={equityPath} fill="none" stroke="#10b981" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          <div className="text-[10px] text-muted-foreground">{result.advice}</div>
        </div>
      </CardContent>
    </Card>
  )
}
