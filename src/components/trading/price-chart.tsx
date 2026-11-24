'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useMt5Socket } from '@/lib/mt5/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PriceChart({ symbol, height = 220 }: { symbol: string; height?: number }) {
  const prices = useMarketStore((s) => s.prices)
  const d = useUIStore((s) => s.density)
  const data = prices[symbol]?.history ?? []
  const digits = prices[symbol]?.digits ?? 2

  // Normalize to chart height (line chart SVG)
  const { path, min, max, last, changePct } = useMemo(() => {
    if (data.length < 2) return { path: '', min: 0, max: 0, last: 0, changePct: 0 }
    const bids = data.map((d) => d.bid)
    const min = Math.min(...bids)
    const max = Math.max(...bids)
    const range = max - min || 1
    const w = 100
    const h = 100
    const step = w / (data.length - 1)
    const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - ((p.bid - min) / range) * h).toFixed(2)}`).join(' ')
    const last = data[data.length - 1].bid
    const changePct = ((last - data[0].bid) / data[0].bid) * 100
    return { path, min, max, last, changePct }
  }, [data])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold">{symbol}</div>
          <div className="text-xs text-muted-foreground">{data.length} ticks · 1s interval</div>
        </div>
        <div className="text-right">
          <div className={cn('text-lg font-bold tabular-nums', (changePct ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            {last ? last.toFixed(digits) : '—'}
          </div>
          <div className={cn('text-xs tabular-nums', (changePct ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            {(changePct ?? 0) >= 0 ? '+' : ''}{(changePct ?? 0).toFixed(3)}%
          </div>
        </div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height, width: '100%' }}>
        <defs>
          <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={(changePct ?? 0) >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.35" />
            <stop offset="100%" stopColor={(changePct ?? 0) >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {path && (
          <>
            <path d={`${path} L100,100 L0,100 Z`} fill={`url(#grad-${symbol})`} stroke="none" />
            <path d={path} fill="none" stroke={(changePct ?? 0) >= 0 ? '#10b981' : '#ef4444'} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div className="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground">
        <span>L: {min ? min.toFixed(digits) : '—'}</span>
        <span>H: {max ? max.toFixed(digits) : '—'}</span>
      </div>
    </div>
  )
}
