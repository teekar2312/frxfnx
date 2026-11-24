'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Gauge, Shield, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { calcLots, DRAWDOWN_LADDER, getCurrentLadder, PIP_VALUE_PER_LOT, STOP_PIPS_MAX } from '@/lib/risk/sizing'
import { cn } from '@/lib/utils'

export function RiskManagerView() {
  const mt5 = useMarketStore((s) => s.mt5)
  const positions = useMarketStore((s) => s.positions)
  const settings = useUIStore((s) => s.settings)
  const setSettings = useUIStore((s) => s.setSettings)

  const equity = mt5.equity || 10000
  const [riskPct, setRiskPct] = useState(settings.riskPerTradePct ?? 0.5)
  const [stopPips, setStopPips] = useState(STOP_PIPS_MAX['XAU/USD'])
  const [symbol, setSymbol] = useState<keyof typeof PIP_VALUE_PER_LOT>('XAU/USD')

  const calc = useMemo(() => {
    return calcLots({
      equity,
      riskPct,
      stopPips,
      pipValuePerLot: PIP_VALUE_PER_LOT[symbol] ?? 10,
    })
  }, [equity, riskPct, stopPips, symbol])

  // Aggregate exposure (USD notional per side)
  const longNotional = positions.filter((p) => p.side === 'BUY').reduce((a, p) => a + p.lots * 100000, 0)
  const shortNotional = positions.filter((p) => p.side === 'SELL').reduce((a, p) => a + p.lots * 100000, 0)
  const netNotional = longNotional - shortNotional
  const totalRisk = positions.reduce((a, p) => a + (Math.abs(p.openPrice - (p.sl ?? p.openPrice)) * p.lots * 100), 0)

  // Effective leverage
  const totalNotional = longNotional + shortNotional
  const effLev = mt5.equity > 0 ? totalNotional / mt5.equity : 0
  const marginUsagePct = mt5.equity > 0 ? (mt5.margin / mt5.equity) * 100 : 0

  // Drawdown ladder
  const peakEquity = Math.max(mt5.equity, mt5.balance, 10000) // simplified
  const drawdown = mt5.equity - peakEquity
  const drawdownPct = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0
  const ladder = getCurrentLadder(drawdownPct)

  return (
    <div className="space-y-4 p-3 md:p-5">
      {/* Pillar 1: Fixed-fractional sizing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" /> Pillar 1: Fixed-Fractional Sizing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Equity saat ini ($)</Label>
              <Input type="number" value={equity} onChange={(e) => setEquity(parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Risk per trade (%)</Label>
                <Input type="number" step="0.05" value={riskPct} onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Stop (pips)</Label>
                <Input type="number" value={stopPips} onChange={(e) => setStopPips(parseInt(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Symbol</Label>
              <div className="flex gap-2">
                {Object.keys(PIP_VALUE_PER_LOT).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === symbol ? 'default' : 'outline'}
                    className={cn('h-8 text-xs', s === symbol && 'bg-primary/15')}
                    onClick={() => setSymbol(s as any)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Amount</span>
              <span className="font-medium tabular-nums">${calc.riskAmount.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Pip value (per 1.0 lot)</span>
              <span className="tabular-nums">${PIP_VALUE_PER_LOT[symbol] ?? 10}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Suggested Lots</span>
              <span className="text-lg font-bold tabular-nums text-emerald-500">{calc.lots.toFixed(2)} lot</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Lots = (Equity × Risk%) ÷ (stop pips × pip value)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pillar 2 & 3: Stops & Asymmetry */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" /> Pillar 2-3: Stops & Asymmetry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">Stop harus broker-side (server-side). Place by market structure + volatility (ATR), bukan by loss tolerance.</p>
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="flex items-center justify-between">
                <span>Min R:R</span>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.rrMin ?? 1.5}
                  onChange={(e) => setSettings({ rrMin: parseFloat(e.target.value) || 1.5 })}
                  className="h-7 w-20 text-xs tabular-nums"
                />
              </div>
              <div className="mt-1 text-muted-foreground">Win-rate @ 1:2 R:R = ~33%+ · @ 1:1.5 = ~40%+ · @ 1:1 = 55%+</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4" /> Pillar 4: Leverage Discipline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Effective Leverage</span>
              <span className={cn('font-semibold tabular-nums', effLev > 5 ? 'text-red-500' : effLev > 3 ? 'text-amber-500' : 'text-emerald-500')}>
                {effLev.toFixed(2)} : 1
              </span>
            </div>
            <Progress value={Math.min((effLev / (settings.maxLeverageRatio ?? 5)) * 100, 100)} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Max allowed: {settings.maxLeverageRatio ?? 5}:1</span>
              <span>Margin usage: {marginUsagePct.toFixed(1)}% (cap {(settings.maxMarginUsagePct ?? 30)}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillar 5: Aggregate exposure */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" /> Pillar 5: Aggregate Exposure
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Long Notional</div>
            <div className="text-lg font-semibold tabular-nums text-emerald-500">${(longNotional / 1000).toFixed(1)}K</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Short Notional</div>
            <div className="text-lg font-semibold tabular-nums text-red-500">${(shortNotional / 1000).toFixed(1)}K</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Net Exposure</div>
            <div className={cn('text-lg font-semibold tabular-nums', netNotional >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              ${(netNotional / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Open Risk</div>
            <div className="text-lg font-semibold tabular-nums">${totalRisk.toFixed(2)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Pillar 6: Loss limits & drawdown ladder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="size-4" /> Pillar 6: Loss Limits & Drawdown Protocol
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Daily Stop (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.dailyStopPct ?? 3}
                onChange={(e) => setSettings({ dailyStopPct: parseFloat(e.target.value) || 3 })}
                className="h-9 tabular-nums"
              />
            </div>
            <div>
              <Label className="text-xs">Weekly Stop (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.weeklyStopPct ?? 5}
                onChange={(e) => setSettings({ weeklyStopPct: parseFloat(e.target.value) || 5 })}
                className="h-9 tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Drawdown dari peak</span>
              <Badge variant={ladder.level === 0 ? 'outline' : 'destructive'} className={cn('text-xs', ladder.level === -5 && 'bg-amber-500 text-white', ladder.level === -10 && 'bg-red-500 text-white')}>
                {drawdownPct.toFixed(2)}% · {ladder.action}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {DRAWDOWN_LADDER.map((l) => (
                <div key={l.level} className={cn('rounded-md border p-2', ladder.level === l.level && 'border-primary bg-primary/10')}>
                  <div className="font-semibold">{l.level}%</div>
                  <div className="text-muted-foreground">{l.action}</div>
                  <div className="mt-1 text-xs">Size: ×{l.sizeMultiplier}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pillar 7: Event & gap risk */}
      <Card className="border-amber-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-500">
            <AlertTriangle className="size-4" /> Pillar 7: Event & Gap Risk
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="font-semibold">High-Impact News</div>
            <div className="text-muted-foreground">NFP, FOMC, CPI: flatten atau reduce sebelum rilis kecuali news adalah strategi Anda.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">No Weekend Holds (Short-Term)</div>
            <div className="text-muted-foreground">Sunday gaps tidak menghormati Friday stops.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">CHF January 2015 Lessons</div>
            <div className="text-muted-foreground">Stops filled 20%+ past their levels saat liquidity event. Hanya small size yang melindungi.</div>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix & Aggregate Exposure (Pillar 5 extension) */}
      <CorrelationMatrix />

      {/* Risk of Ruin Calculator (new fitur) */}
      <RiskOfRuinCalculator />

      {/* Auto-Disable Pre-News */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-500">
            <AlertTriangle className="size-4" /> Auto-Disable Trading Pre-News
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">Sistem akan otomatis flatten posisi X menit sebelum rilis berita high-impact untuk hindari gap risk (Pilar 7).</p>
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <div className="font-medium">Aturan aktif:</div>
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              <li>Pre-News Flatten: 2 menit sebelum high-impact USD news</li>
              <li>Max Daily Loss 3%: flatten semua jika hari ini loss 3%+</li>
              <li>Max Weekly Loss 5%: flatten semua jika minggu ini loss 5%+</li>
            </ul>
            <div className="mt-2 text-amber-500">Konfigurasi via Settings {`>`} Auto-Trade Rules</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Inline import to avoid circular ref
import { CorrelationMatrix } from '@/components/indicators/correlation-matrix'
import { RiskOfRuinCalculator } from '@/components/risk/risk-of-ruin'
