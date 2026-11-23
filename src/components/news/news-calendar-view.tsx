'use client'

import { useEffect, useState } from 'react'
import { Bot, CalendarClock, Plus, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useMt5Socket } from '@/lib/mt5/socket'
import { analyzeNewsEvent, directionBadge, formatValue, intensityBadge } from '@/lib/news/analyzer'
import { dayName, formatCountdown } from '@/lib/mt5/schedule'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { NewsEvent } from '@/types'

export function NewsCalendarView() {
  const news = useMarketStore((s) => s.news)
  const upsertNews = useMarketStore((s) => s.upsertNews)
  const settings = useUIStore((s) => s.settings)
  const { analyzeNews, addNews } = useMt5Socket()
  const [now, setNow] = useState<Date | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'released'>('all')
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [openAdd, setOpenAdd] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const effectiveNow = now ?? new Date(0)
  const nowMs = effectiveNow.getTime()

  const filtered = news.filter((n) => {
    const t = new Date(n.eventTime).getTime()
    if (filter === 'upcoming' && t <= nowMs) return false
    if (filter === 'released' && t > nowMs) return false
    if (impactFilter !== 'all' && n.impact !== impactFilter) return false
    return true
  })

  const handleAnalyze = async (id: string) => {
    const r: any = await analyzeNews(id)
    if (r?.ok) {
      upsertNews({ ...r.event, ...r.analysis })
      toast.success('Analisis 3 Angka Emas selesai')
    }
  }

  // Tiingo fetch handler (mock - in production panggil /api/news/tiingo)
  const handleTiingoFetch = async () => {
    try {
      const res = await fetch('/api/news/tiingo')
      const data = await res.json()
      if (data?.events?.length) {
        for (const ev of data.events) upsertNews(ev)
        toast.success(`Fetched ${data.events.length} event dari Tiingo`)
      } else {
        toast.info('Tiingo: ' + (data?.msg ?? 'Tidak ada event baru'))
      }
    } catch (e) {
      toast.error('Gagal fetch Tiingo')
    }
  }

  return (
    <div className="space-y-4 p-3 md:p-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" /> Kalender Berita Ekonomi · 3 Angka Emas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="released">Released</SelectItem>
              </SelectContent>
            </Select>
            <Select value={impactFilter} onValueChange={(v) => setImpactFilter(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleTiingoFetch}>
              <RefreshCw className="size-3" /> Tiingo
            </Button>
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                  <Plus className="size-3" /> Manual
                </Button>
              </DialogTrigger>
              <AddNewsDialog onSubmit={(ev) => { addNews(ev); upsertNews(ev); setOpenAdd(false); toast.success('Berita manual ditambahkan') }} />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left">Waktu</th>
                  <th className="px-3 py-2 text-left">Negara</th>
                  <th className="px-3 py-2 text-left">Event</th>
                  <th className="px-3 py-2 text-right">Previous</th>
                  <th className="px-3 py-2 text-right">Forecast</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Deviasi</th>
                  <th className="px-3 py-2 text-center">USD</th>
                  <th className="px-3 py-2 text-center">XAU</th>
                  <th className="px-3 py-2 text-center">EUR</th>
                  <th className="px-3 py-2 text-center">JPY</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">
                      Tidak ada berita yang cocok. Coba fetch Tiingo atau tambah manual.
                    </td>
                  </tr>
                ) : (
                  filtered.map((n) => {
                    const analysis = analyzeNewsEvent(n)
                    const isReleased = n.actual !== undefined
                    const t = new Date(n.eventTime).getTime()
                    const countdown = now ? t - now.getTime() : 0
                    return (
                      <tr key={n.id} className={cn('border-b last:border-b-0 hover:bg-muted/30', isReleased && 'bg-emerald-500/5')}>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium tabular-nums">
                            {new Date(n.eventTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {dayName(new Date(n.eventTime))} · {countdown > 0 ? formatCountdown(countdown) : 'released'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-xs">{n.country}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium">{n.title}</div>
                          <Badge className={cn('mt-0.5 text-[10px]', n.impact === 'high' ? 'bg-red-600' : n.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-500')}>
                            {n.impact.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatValue(n.previous)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatValue(n.forecast)}</td>
                        <td className={cn('px-3 py-2 text-right tabular-nums font-medium', isReleased ? 'text-foreground' : 'text-muted-foreground/50')}>
                          {formatValue(n.actual)}
                        </td>
                        <td className={cn('px-3 py-2 text-right tabular-nums', Math.abs(analysis.deviation ?? 0) > 5 ? 'font-bold text-amber-500' : '')}>
                          {analysis.deviation !== null ? `${analysis.deviation > 0 ? '+' : ''}${analysis.deviation}%` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn('text-xs', directionBadge(analysis.directionUsd).color)}>
                            {directionBadge(analysis.directionUsd).label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn('text-xs', directionBadge(analysis.directionXau).color)}>
                            {directionBadge(analysis.directionXau).label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn('text-xs', directionBadge(analysis.directionEur).color)}>
                            {directionBadge(analysis.directionEur).label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn('text-xs', directionBadge(analysis.directionJpy).color)}>
                            {directionBadge(analysis.directionJpy).label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => handleAnalyze(n.id)}>
                            <Bot className="size-3" /> {isReleased ? 'Re-Analyze' : 'Release'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Kamus Reaksi Kilat */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kamus Reaksi Kilat (Fokus USD)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-md border p-3">
            <div className="font-semibold">NFP & Retail Sales</div>
            <div>Actual &gt; Forecast → USD Naik</div>
            <div className="text-muted-foreground">USD naik → XAU &amp; EUR anjlok</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">CPI &amp; PPI (Inflasi)</div>
            <div>Inflasi panas → Fed naik rate → USD Naik</div>
            <div className="text-muted-foreground">Inflasi dingingin → Fed turun → USD Turun</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">Unemployment Rate</div>
            <div className="text-amber-500">Kebalikan NFP!</div>
            <div>Actual &gt; Forecast → USD Turun</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">GDP &amp; PMI</div>
            <div>Actual &gt; Forecast → USD Naik</div>
            <div className="text-muted-foreground">Konfirmasi kesehatan ekonomi fundamental</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AddNewsDialog({ onSubmit }: { onSubmit: (ev: NewsEvent) => void }) {
  const [title, setTitle] = useState('')
  const [country, setCountry] = useState('US')
  const [impact, setImpact] = useState<'high' | 'medium' | 'low'>('high')
  const [eventTime, setEventTime] = useState(() => {
    const d = new Date(Date.now() + 3600 * 1000)
    return d.toISOString().slice(0, 16)
  })
  const [previous, setPrevious] = useState('')
  const [forecast, setForecast] = useState('')

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Tambah Berita Manual</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Judul</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CPI m/m" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Negara</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" />
          </div>
          <div>
            <Label className="text-xs">Impact</Label>
            <Select value={impact} onValueChange={(v) => setImpact(v as any)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Waktu (local)</Label>
          <Input type="datetime-local" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Previous</Label>
            <Input type="number" step="0.01" value={previous} onChange={(e) => setPrevious(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Forecast</Label>
            <Input type="number" step="0.01" value={forecast} onChange={(e) => setForecast(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Batal</Button>
        </DialogClose>
        <Button
          onClick={() => {
            onSubmit({
              id: 'manual_' + Date.now(),
              title: title || 'Untitled',
              country,
              currency: country,
              impact,
              eventTime: new Date(eventTime).toISOString(),
              previous: previous ? parseFloat(previous) : undefined,
              forecast: forecast ? parseFloat(forecast) : undefined,
              source: 'manual',
            })
          }}
        >
          Tambah
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
