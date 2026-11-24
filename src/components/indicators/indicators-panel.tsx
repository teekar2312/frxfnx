'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { rsi, stochastic, bollingerBands, atr, sma, ema, ticksToCandles, lastN, detectSupportResistance } from '@/lib/indicators'
import { cn } from '@/lib/utils'

type IndicatorType = 'rsi' | 'stoch' | 'bb' | 'atr' | 'sma' | 'ema' | 'sr'

export function IndicatorsPanel() {
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  const prices = useMarketStore((s) => s.prices)
  const [enabled, setEnabled] = useState<Record<IndicatorType, boolean>>({
    rsi: false, stoch: false, bb: true, atr: false, sma: true, ema: false, sr: false,
  })
  const [period, setPeriod] = useState(14)
  const [smaPeriod, setSmaPeriod] = useState(20)
  const [emaPeriod, setEmaPeriod] = useState(9)

  const candles = useMemo(() => {
    const p = prices[activeSymbol]
    if (!p) return []
    return ticksToCandles(p.history, 60000) // 1-minute candles
  }, [prices, activeSymbol])

  const closes = useMemo(() => candles.map((c) => c.close), [candles])

  const indicators = useMemo(() => {
    return {
      rsi: lastN(rsi(closes, period), 2),
      stoch: lastN(stochastic(candles, period, 3).k, 2),
      bb: lastN(bollingerBands(closes, smaPeriod, 2).upper, 1),
      bbLower: lastN(bollingerBands(closes, smaPeriod, 2).lower, 1),
      atr: lastN(atr(candles, period), 2),
      sma: lastN(sma(closes, smaPeriod), 2),
      ema: lastN(ema(closes, emaPeriod), 2),
      sr: detectSupportResistance(candles, 20),
    }
  }, [closes, candles, period, smaPeriod, emaPeriod])

  const toggle = (k: IndicatorType) => setEnabled((p) => ({ ...p, [k]: !p[k] }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Indikator Teknikal · {activeSymbol}</span>
          <span className="text-xs text-muted-foreground">{candles.length} candles</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
          {[
            { k: 'sma', label: 'SMA', value: indicators.sma[0]?.toFixed(prices[activeSymbol]?.digits ?? 2) ?? '—' },
            { k: 'ema', label: 'EMA', value: indicators.ema[0]?.toFixed(prices[activeSymbol]?.digits ?? 2) ?? '—' },
            { k: 'rsi', label: 'RSI', value: indicators.rsi[0]?.toFixed(1) ?? '—' },
            { k: 'stoch', label: 'Stoch %K', value: indicators.stoch[0]?.toFixed(1) ?? '—' },
            { k: 'bb', label: 'BB Upper', value: indicators.bb[0]?.toFixed(prices[activeSymbol]?.digits ?? 2) ?? '—' },
            { k: 'atr', label: 'ATR', value: indicators.atr[0]?.toFixed(prices[activeSymbol]?.digits ?? 2) ?? '—' },
          ].map((row) => (
            <div key={row.k} className={cn('flex items-center justify-between rounded-md border p-2', enabled[row.k as IndicatorType] ? 'border-primary/40 bg-primary/5' : '')}>
              <div className="flex items-center gap-2">
                <Switch checked={enabled[row.k as IndicatorType]} onCheckedChange={() => toggle(row.k as IndicatorType)} className="scale-75" />
                <span className="font-medium">{row.label}</span>
              </div>
              <span className="tabular-nums text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">RSI/Stoch Period</Label>
            <Input type="number" min="2" max="50" value={period} onChange={(e) => setPeriod(parseInt(e.target.value) || 14)} className="h-7 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">SMA Period</Label>
            <Input type="number" min="2" max="200" value={smaPeriod} onChange={(e) => setSmaPeriod(parseInt(e.target.value) || 20)} className="h-7 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">EMA Period</Label>
            <Input type="number" min="2" max="200" value={emaPeriod} onChange={(e) => setEmaPeriod(parseInt(e.target.value) || 9)} className="h-7 text-xs tabular-nums" />
          </div>
        </div>

        {enabled.sr && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <div className="font-semibold">Support / Resistance (auto)</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {indicators.sr.resistances.map((r, i) => (
                <span key={i} className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-500">R: {r.toFixed(prices[activeSymbol]?.digits ?? 2)}</span>
              ))}
              {indicators.sr.supports.map((s, i) => (
                <span key={i} className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-500">S: {s.toFixed(prices[activeSymbol]?.digits ?? 2)}</span>
              ))}
              {indicators.sr.resistances.length === 0 && indicators.sr.supports.length === 0 && <span className="text-muted-foreground">Belum terdeteksi (butuh ≥40 candles)</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
