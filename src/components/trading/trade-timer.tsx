'use client'

import { Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TradeTimer({ durationMs, maxMinutes = 15 }: { durationMs: number; maxMinutes?: number }) {
  const minutes = durationMs / 60000
  const overhold = minutes > maxMinutes
  const colorClass = overhold ? 'text-red-500' : minutes > maxMinutes * 0.7 ? 'text-amber-500' : 'text-muted-foreground'

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}j ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums', colorClass)} title={`Max ${maxMinutes} menit untuk scalper`}>
      <Timer className="size-3" />
      {formatDuration(durationMs)}
      {overhold && <span className="ml-1 rounded bg-red-500 px-1 text-[9px] text-white">OVERHOLD</span>}
    </span>
  )
}
