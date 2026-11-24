'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { BacktestResult } from '@/lib/types/trade'

export function BacktestView() {
  const { runBacktest } = useMt5Socket()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [cfg, setCfg] = useState({
    symbol: 'XAU/USD',
    strategy: 'sma_crossover',
    initialBalance: 10000,
    lots: 0.1,
    smaPeriod: 20,
    startDate: '',
    endDate: '',
  })

  const run = async () => {
    setBusy(true)
    const r: any = await runBacktest(cfg)
    setBusy(false)
    if (r?.ok) {
      setResult(r)
      toast.success(`Backtest selesai: ${r.totalTrades} trades, win ${r.winRate}%`)
    } else {
      toast.error(r?.msg ?? 'Backtest gagal - tunggu lebih banyak tick history')
    }
  }

  // Equity curve from result
  const equityPath = (() => {
    if (!result?.trades?.length) return ''
    let cum = cfg.initialBalance
    const points: string[] = []
    const w = 100, h = 100
    const balances = [cfg.initialBalance]
    for (const t of result.trades) { cum += t.profit; balances.push(cum) }
    const min = Math.min(...balances)
    const max = Math.max(...balances)
    const range = max - min || 1
    const step = w / Math.max(1, balances.length - 1)
    return balances.map((b, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - ((b - min) / range) * h).toFixed(2)}`).join(' ')
  })()

  return (
    <div className="space-y-4 p-3 md:p-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Backtesting Engine</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label className="text-xs">Symbol</Label>
            <Select value={cfg.symbol} onValueChange={(v) => setCfg({ ...cfg, symbol: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={cfg.strategy} onValueChange={(v) => setCfg({ ...cfg, strategy: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sma_crossover">SMA Crossover</SelectItem>
                <SelectItem value="rsi_oversold">RSI Oversold/Overbought</SelectItem>
                <SelectItem value="breakout_15min">15-Min Breakout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Initial Balance ($)</Label>
            <Input type="number" value={cfg.initialBalance} onChange={(e) => setCfg({ ...cfg, initialBalance: parseFloat(e.target.value) || 10000 })} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Lots per trade</Label>
            <Input type="number" step="0.01" value={cfg.lots} onChange={(e) => setCfg({ ...cfg, lots: parseFloat(e.target.value) || 0.1 })} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">SMA Period</Label>
            <Input type="number" min="2" max="200" value={cfg.smaPeriod} onChange={(e) => setCfg({ ...cfg, smaPeriod: parseInt(e.target.value) || 20 })} className="h-8 text-xs tabular-nums" />
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={busy} className="w-full gap-1">
              {busy ? 'Running...' : 'Run Backtest'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hasil Backtest</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
              <Stat label="Total Trades" value={result.totalTrades} />
              <Stat label="Win Rate" value={`${result.winRate}%`} color={result.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'} />
              <Stat label="Profit Factor" value={result.profitFactor} color={result.profitFactor >= 1.5 ? 'text-emerald-500' : 'text-amber-500'} />
              <Stat label="Wins" value={result.wins} color="text-emerald-500" />
              <Stat label="Losses" value={result.losses} color="text-red-500" />
              <Stat label="Max Drawdown" value={`${result.maxDrawdown}%`} color={result.maxDrawdown > 20 ? 'text-red-500' : 'text-amber-500'} />
              <Stat label="Final Balance" value={`$${result.finalBalance}`} color={result.finalBalance >= cfg.initialBalance ? 'text-emerald-500' : 'text-red-500'} />
              <Stat label="P&L Total" value={`${result.finalBalance - cfg.initialBalance >= 0 ? '+' : ''}$${(result.finalBalance - cfg.initialBalance).toFixed(2)}`} color={result.finalBalance >= cfg.initialBalance ? 'text-emerald-500' : 'text-red-500'} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              {equityPath ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
                  <path d={equityPath} fill="none" stroke="#10b981" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <div className="text-sm text-muted-foreground">Belum ada trade</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {result?.trades && result.trades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Trade History ({result.trades.length})</span>
              <Badge variant="outline" className="text-xs">last 100</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/30 backdrop-blur">
                  <tr className="text-[10px] uppercase text-muted-foreground">
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Side</th>
                    <th className="px-2 py-1 text-right">Entry</th>
                    <th className="px-2 py-1 text-right">Exit</th>
                    <th className="px-2 py-1 text-right">P&L Pips</th>
                    <th className="px-2 py-1 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.slice(-100).map((t, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1">
                        <Badge variant="outline" className={cn('text-[10px]', t.side === 'BUY' ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                          {t.side}
                        </Badge>
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.entry.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.exit.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.pnlPips.toFixed(1)}</td>
                      <td className={cn('px-2 py-1 text-right tabular-nums', t.profit >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Catatan Backtest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>Backtest menggunakan tick history yang tersimpan in-memory (maks 5000 ticks ≈ 80 menit). Untuk backtest historis panjang, gunakan data MT5 via Python bridge.</p>
          <p>Strategi yang tersedia: SMA Crossover (BUY when price {`>`} SMA, SELL when price {`<`} SMA), RSI Oversold, 15-Min Breakout.</p>
          <p><span className="font-medium text-amber-500">Disclaimer:</span> Past performance tidak menjamin hasil future. Selalu uji di akun demo sebelum live.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-semibold tabular-nums', color)}>{value}</div>
    </div>
  )
}
