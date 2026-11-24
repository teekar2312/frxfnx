'use client'

import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { cn } from '@/lib/utils'

// News Overlay untuk chart — menampilkan marker waktu berita
// + highlight Fase 1 (0-2 menit) dan Fase 2 (2-15 menit)
export function NewsOverlay({ symbol }: { symbol: string }) {
  const news = useMarketStore((s) => s.news)
  const prices = useMarketStore((s) => s.prices)

  // Ambil berita yang sudah rilis dalam 1 jam terakhir + upcoming
  const nowMs = Date.now()
  const recentNews = useMemo(() => {
    return news.filter((n) => {
      const t = new Date(n.eventTime).getTime()
      return Math.abs(t - nowMs) < 3600 * 1000 // ±1 jam
    })
  }, [news, nowMs])

  if (recentNews.length === 0) return null

  const p = prices[symbol]
  if (!p || !p.history.length) return null
  const minTime = p.history[0].t
  const maxTime = p.history[p.history.length - 1].t
  const range = maxTime - minTime || 1

  return (
    <div className="absolute inset-0 pointer-events-none">
      {recentNews.map((n) => {
        const t = new Date(n.eventTime).getTime()
        if (t < minTime || t > maxTime) return null
        const xPct = ((t - minTime) / range) * 100
        const isReleased = n.actual !== undefined
        return (
          <div key={n.id} className="absolute top-0 bottom-0" style={{ left: `${xPct}%` }}>
            {/* News marker line */}
            <div className={cn(
              'absolute top-0 bottom-0 w-0.5',
              n.impact === 'high' ? 'bg-red-500' : n.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-400',
            )} />
            {/* Fase 1 (0-2 min) highlight */}
            <div className="absolute top-0 bottom-0 w-2 bg-red-500/10" />
            {/* Fase 2 (2-15 min) */}
            <div className="absolute top-0 bottom-0 w-6 bg-amber-500/10 -left-2" />
            {/* Label */}
            <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1 py-0.5 text-[9px] text-white">
              {n.title.slice(0, 18)}{n.title.length > 18 && '…'} {isReleased ? '✓' : '⏱'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
