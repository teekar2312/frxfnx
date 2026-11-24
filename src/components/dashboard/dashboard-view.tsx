'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Bell, Bot, CalendarClock, CandlestickChart, Clock, DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { dayName, formatCountdown, isTradingAllowedNow } from '@/lib/mt5/schedule'
import { CurrencyStrengthMeter } from '@/components/indicators/currency-strength-meter'
import { cn } from '@/lib/utils'

function RecentAlertsWidget() {
  const alerts = useExtMarketStore((s) => s.alertEvents).slice(0, 5)
  const { ackAlert } = useMt5Socket()
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4" /> Recent Alerts
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-xs text-red-500">{alerts.filter((a) => !a.acknowledged).length} baru</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada alert aktif</div>
        ) : (
          <div className="space-y-1 p-2">
            {alerts.map((a) => (
              <div key={a.id} className={cn(
                'flex items-center justify-between rounded-md border px-2 py-1.5 text-xs',
                a.severity === 'critical' && 'border-red-500/40 bg-red-500/5',
                a.severity === 'warn' && 'border-amber-500/40 bg-amber-500/5',
                a.acknowledged && 'opacity-50',
              )}>
                <span className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warn' ? 'bg-amber-500' : 'bg-sky-500')} />
                  <span>{a.message}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString('id-ID')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon,
  trend,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}) {
  const d = useUIStore((s) => s.density)
  const pad = d === 'dense' ? 'p-2' : d === 'minimal' ? 'p-6' : 'p-4'
  return (
    <Card className={cn('relative overflow-hidden', pad)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={cn('font-semibold tracking-tight', d === 'dense' ? 'text-lg' : d === 'minimal' ? 'text-2xl' : 'text-xl')}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-md',
            trend === 'up' ? 'bg-emerald-500/15 text-emerald-500' : trend === 'down' ? 'bg-red-500/15 text-red-500' : 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function DashboardView() {
  const mt5 = useMarketStore((s) => s.mt5)
  const positions = useMarketStore((s) => s.positions)
  const prices = useMarketStore((s) => s.prices)
  const news = useMarketStore((s) => s.news)
  const logs = useMarketStore((s) => s.logs)
  const settings = useUIStore((s) => s.settings)
  const [now, setNow] = useState<Date | null>(null)
  const { analyzeNews } = useMt5Socket()
  const d = useUIStore((s) => s.density)
  const rowPad = d === 'dense' ? 'py-1 px-2' : d === 'minimal' ? 'py-3 px-4' : 'py-2 px-3'

  useEffect(() => {
    // Set initial now only on client to avoid hydration mismatch
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const effectiveNow = now ?? new Date(0) // fallback ke epoch untuk render awal

  const allowed = isTradingAllowedNow(
    { start: settings.tradingStart ?? '08:00', end: settings.tradingEnd ?? '23:30', blockWeekend: settings.blockWeekend ?? true },
    effectiveNow,
  )

  const nextSessionMs = useMemo(() => {
    if (allowed || !now) return 0
    const cand = new Date(now)
    cand.setHours(Number((settings.tradingStart ?? '08:00').split(':')[0]), Number((settings.tradingStart ?? '08:00').split(':')[1]), 0, 0)
    if (cand.getTime() < now.getTime() || (settings.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6))) {
      cand.setDate(cand.getDate() + 1)
      while (settings.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6)) cand.setDate(cand.getDate() + 1)
      cand.setHours(Number((settings.tradingStart ?? '08:00').split(':')[0]), Number((settings.tradingStart ?? '08:00').split(':')[1]), 0, 0)
    }
    return cand.getTime() - now.getTime()
  }, [allowed, now, settings])

  const floatingProfit = positions.reduce((acc, p) => acc + (p.profit ?? 0), 0)
  const totalLots = positions.reduce((acc, p) => acc + p.lots, 0)
  const symbols = Object.keys(prices)
  const upcomingNews = news.filter((n) => new Date(n.eventTime).getTime() > effectiveNow.getTime()).slice(0, 5)

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Equity"
          value={`$${mt5.equity.toFixed(2)}`}
          sub={`Balance: $${mt5.balance.toFixed(2)}`}
          icon={<Wallet className="size-5" />}
          trend={floatingProfit >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Floating P&L"
          value={`${floatingProfit >= 0 ? '+' : ''}$${floatingProfit.toFixed(2)}`}
          sub={`${positions.length} posisi · ${totalLots.toFixed(2)} lot`}
          icon={floatingProfit >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
          trend={floatingProfit >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Margin Level"
          value={`${mt5.marginLevel.toFixed(1)}%`}
          sub={`Used: $${mt5.margin.toFixed(0)} · Free: $${mt5.freeMargin.toFixed(0)}`}
          icon={<DollarSign className="size-5" />}
          trend={mt5.marginLevel > 200 ? 'up' : mt5.marginLevel > 50 ? 'neutral' : 'down'}
        />
        <StatCard
          title="Trading Session"
          value={allowed ? 'ACTIVE' : formatCountdown(nextSessionMs)}
          sub={now ? `${dayName(now)} · ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '—'}
          icon={allowed ? <Activity className="size-5" /> : <Clock className="size-5" />}
          trend={allowed ? 'up' : 'neutral'}
        />
      </div>

      {/* Currency Strength Meter + Recent Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CurrencyStrengthMeter />
        <RecentAlertsWidget />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Watchlist harga */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CandlestickChart className="size-4" /> Watchlist
            </CardTitle>
            <Badge variant="outline" className="text-xs">{symbols.length} symbols</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className={cn('text-left', rowPad)}>Symbol</th>
                  <th className={cn('text-right', rowPad)}>Bid</th>
                  <th className={cn('text-right', rowPad)}>Ask</th>
                  <th className={cn('text-right', rowPad)}>Spread (pip)</th>
                  <th className={cn('text-right', rowPad)}>Trend 1m</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((s) => {
                  const p = prices[s]
                  const spreadPips = ((p.ask - p.bid) / (s.includes('JPY') ? 0.01 : s.includes('XAU') ? 0.1 : 0.0001)).toFixed(1)
                  const hist = p.history
                  const oneMinAgo = hist.length > 60 ? hist[hist.length - 60] : hist[0]
                  const change = hist.length ? p.bid - oneMinAgo.bid : 0
                  return (
                    <tr key={s} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className={cn('font-medium', rowPad)}>{s}</td>
                      <td className={cn('text-right tabular-nums text-red-500', rowPad)}>{p.bid.toFixed(p.digits)}</td>
                      <td className={cn('text-right tabular-nums text-emerald-500', rowPad)}>{p.ask.toFixed(p.digits)}</td>
                      <td className={cn('text-right tabular-nums', rowPad)}>{spreadPips}</td>
                      <td className={cn('text-right tabular-nums', rowPad, change >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {change >= 0 ? <ArrowUpRight className="ml-auto inline size-3" /> : <ArrowDownRight className="ml-auto inline size-3" />}
                        {Math.abs(change).toFixed(p.digits)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* News countdown */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> News Countdown
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                if (upcomingNews[0]) analyzeNews(upcomingNews[0].id)
              }}
            >
              <Bot className="mr-1 size-3" /> Analisa
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            <ScrollArea className="h-[260px]">
              {upcomingNews.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada berita terjadwal</div>
              ) : (
                upcomingNews.map((n) => {
                  const ms = now ? new Date(n.eventTime).getTime() - now.getTime() : 0
                  const impactColor = n.impact === 'high' ? 'border-red-500/40' : n.impact === 'medium' ? 'border-amber-500/40' : 'border-slate-400/40'
                  return (
                    <div key={n.id} className={cn('border-b px-3 py-2', impactColor, 'border-l-2')}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">{n.country} · {n.impact}</div>
                          <div className="text-sm font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Prev {n.previous ?? '—'} · Fcst {n.forecast ?? '—'}
                            {n.actual !== undefined && <> · Actual {n.actual}</>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs tabular-nums">{formatCountdown(ms)}</Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[180px]">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Belum ada aktivitas</div>
            ) : (
              logs.slice(0, 50).map((l) => (
                <div key={l.id} className="flex items-center gap-3 border-b px-3 py-1.5 text-xs last:border-b-0">
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      l.level === 'error' ? 'bg-red-500/15 text-red-500' : l.level === 'warn' ? 'bg-amber-500/15 text-amber-500' : l.level === 'debug' ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/15 text-emerald-500',
                    )}
                  >
                    {l.level}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">{l.source}</span>
                  <span className="flex-1 truncate">{l.message}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{new Date(l.timestamp).toLocaleTimeString('id-ID')}</span>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
