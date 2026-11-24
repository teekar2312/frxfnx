'use client'

import { useMemo, useState } from 'react'
import { Activity, BarChart3, BookOpen, Calendar, DollarSign, FileText, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useExtMarketStore } from '@/store/extended'
import { useMarketStore } from '@/store/market'
import { analyzeTrades, generatePnlReport } from '@/lib/journal/analytics'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function AnalyticsView() {
  const trades = useExtMarketStore((s) => s.tradeHistory)
  const mt5 = useMarketStore((s) => s.mt5)
  const analytics = useMemo(() => analyzeTrades(trades, 10000), [trades])

  // Equity curve SVG
  const equityPath = useMemo(() => {
    if (analytics.equityCurve.length < 2) return ''
    const w = 100, h = 100
    const balances = analytics.equityCurve.map((e) => e.balance)
    const min = Math.min(...balances, 9500)
    const max = Math.max(...balances, 10500)
    const range = max - min || 1
    const step = w / Math.max(1, analytics.equityCurve.length - 1)
    return analytics.equityCurve.map((e, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - ((e.balance - min) / range) * h).toFixed(2)}`).join(' ')
  }, [analytics])

  const exportPnlReport = () => {
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 1000)
    const report = generatePnlReport(analytics, 'weekly', weekAgo.toISOString(), today.toISOString())
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finex-pnl-report-${today.toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('P&L report di-download (markdown)')
  }

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-5" /> Trade Journal & Performance Analytics
        </h2>
        <Button onClick={exportPnlReport} variant="outline" size="sm" className="gap-1 text-xs">
          <FileText className="size-3" /> Export P&L Report
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total Trades" value={analytics.totalTrades} icon={<Activity className="size-4" />} />
        <StatCard label="Win Rate" value={`${analytics.winRate}%`} icon={<TrendingUp className="size-4" />} color={analytics.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'} />
        <StatCard label="Profit Factor" value={analytics.profitFactor} icon={<BarChart3 className="size-4" />} color={analytics.profitFactor >= 1.5 ? 'text-emerald-500' : 'text-amber-500'} />
        <StatCard label="Total P&L" value={`$${analytics.totalPnl}`} icon={<DollarSign className="size-4" />} color={analytics.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'} />
        <StatCard label="Expectancy" value={`$${analytics.expectancy}`} icon={<Activity className="size-4" />} color={analytics.expectancy >= 0 ? 'text-emerald-500' : 'text-red-500'} />
        <StatCard label="Max Consec Loss" value={analytics.maxConsecutiveLosses} icon={<TrendingDown className="size-4" />} color={analytics.maxConsecutiveLosses >= 5 ? 'text-red-500' : 'text-amber-500'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Equity curve */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Equity Curve</span>
              <span className={cn('text-xs', analytics.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {analytics.totalPnl >= 0 ? '+' : ''}${analytics.totalPnl}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equityPath ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 w-full">
                <defs>
                  <linearGradient id="equity-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={analytics.totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={analytics.totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${equityPath} L100,100 L0,100 Z`} fill="url(#equity-grad)" stroke="none" />
                <path d={equityPath} fill="none" stroke={analytics.totalPnl >= 0 ? '#10b981' : '#ef4444'} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Belum ada trade history. Lakukan trade untuk melihat equity curve.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best/worst */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trade Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Best Trade" value={`+$${analytics.bestTrade}`} color="text-emerald-500" />
            <Row label="Worst Trade" value={`$${analytics.worstTrade}`} color="text-red-500" />
            <Row label="Avg Win" value={`+$${analytics.avgWin}`} color="text-emerald-500" />
            <Row label="Avg Loss" value={`$${analytics.avgLoss}`} color="text-red-500" />
            <Row label="Avg Duration" value={`${(analytics.avgDurationMs / 60000).toFixed(1)} min`} />
            <Row label="Total Lots" value={analytics.totalLots} />
            <Row label="Max Consec Wins" value={analytics.maxConsecutiveWins} color="text-emerald-500" />
            <Row label="Max Consec Losses" value={analytics.maxConsecutiveLosses} color="text-red-500" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="by_pair">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="by_pair" className="text-xs">By Pair</TabsTrigger>
          <TabsTrigger value="by_strategy" className="text-xs">By Strategy</TabsTrigger>
          <TabsTrigger value="by_session" className="text-xs">By Session</TabsTrigger>
          <TabsTrigger value="by_day" className="text-xs">By Day</TabsTrigger>
        </TabsList>
        <TabsContent value="by_pair">
          <Card>
            <CardContent className="p-0">
              <BreakdownTable title="P&L per Pair" data={analytics.pnlBySymbol} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by_strategy">
          <Card>
            <CardContent className="p-0">
              <BreakdownTable title="P&L per Strategy" data={analytics.pnlByStrategy} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by_session">
          <Card>
            <CardContent className="p-0">
              <BreakdownTable title="P&L per Sesi (Asia/London/NewYork)" data={analytics.pnlBySession} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by_day">
          <Card>
            <CardContent className="p-0">
              <BreakdownTable title="P&L per Hari" data={analytics.pnlByDay} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trade history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Trade History ({trades.length})</span>
            <Badge variant="outline" className="text-xs">last 50</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {trades.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Belum ada trade history</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/30 backdrop-blur">
                  <tr className="text-[10px] uppercase text-muted-foreground">
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Symbol</th>
                    <th className="px-2 py-1 text-left">Side</th>
                    <th className="px-2 py-1 text-right">Lots</th>
                    <th className="px-2 py-1 text-right">Open</th>
                    <th className="px-2 py-1 text-right">Close</th>
                    <th className="px-2 py-1 text-right">Pips</th>
                    <th className="px-2 py-1 text-right">P&L</th>
                    <th className="px-2 py-1 text-left">Reason</th>
                    <th className="px-2 py-1 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 50).map((t) => (
                    <tr key={t.ticket} className="border-b">
                      <td className="px-2 py-1 tabular-nums text-muted-foreground">{t.ticket}</td>
                      <td className="px-2 py-1 font-medium">{t.symbol}</td>
                      <td className="px-2 py-1">
                        <Badge variant="outline" className={cn('text-[10px]', t.side === 'BUY' ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                          {t.side}
                        </Badge>
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.lots}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.openPrice}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{t.closePrice}</td>
                      <td className={cn('px-2 py-1 text-right tabular-nums', t.pnlPips >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {t.pnlPips >= 0 ? '+' : ''}{t.pnlPips}
                      </td>
                      <td className={cn('px-2 py-1 text-right tabular-nums font-medium', t.profit >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground">{t.closeReason}</td>
                      <td className="px-2 py-1 text-right text-[10px] tabular-nums">{(t.durationMs / 60000).toFixed(1)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon?: React.ReactNode; color?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
          <p className={cn('text-base font-semibold tabular-nums', color)}>{value}</p>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </Card>
  )
}

function Row({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums', color)}>{value}</span>
    </div>
  )
}

function BreakdownTable({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Belum ada data. Lakukan trade untuk melihat breakdown.</div>
  }
  return (
    <div>
      <div className="border-b px-3 py-2 text-sm font-medium">{title}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-muted-foreground">
            <th className="px-3 py-1 text-left">Key</th>
            <th className="px-3 py-1 text-right">P&L</th>
            <th className="px-3 py-1 text-right">% / bar</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => {
            const maxAbs = Math.max(...entries.map((e) => Math.abs(e[1])), 1)
            const pct = (Math.abs(v) / maxAbs) * 100
            return (
              <tr key={k} className="border-b last:border-b-0">
                <td className="px-3 py-2 font-medium">{k}</td>
                <td className={cn('px-3 py-2 text-right tabular-nums', v >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {v >= 0 ? '+' : ''}${v.toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <div className="relative h-3 w-full rounded bg-muted overflow-hidden">
                    <div
                      className={cn('h-full', v >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                      style={{ width: `${pct}%`, marginLeft: v >= 0 ? '50%' : `${50 - pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
