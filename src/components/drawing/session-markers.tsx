'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Session markers untuk chart
// Asia: 07:00-16:00 WIB (UTC+7)
// London: 15:00-24:00 WIB
// New York: 21:00-06:00 WIB (overlap)

interface SessionMarker {
  hour: number
  label: string
  color: string
}

const SESSIONS: SessionMarker[] = [
  { hour: 7, label: 'Asia', color: 'bg-amber-500/15' },
  { hour: 15, label: 'London', color: 'bg-emerald-500/15' },
  { hour: 21, label: 'New York', color: 'bg-sky-500/15' },
]

export function getSessionAtHour(hour: number): SessionMarker | null {
  for (const s of SESSIONS) {
    if (s.hour === 7 && hour >= 7 && hour < 15) return s
    if (s.hour === 15 && hour >= 15 && hour < 21) return s
    if (s.hour === 21 && (hour >= 21 || hour < 6)) return s
  }
  return null
}

export function SessionMarkers() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  if (!now) return null
  const curHour = now.getHours()
  const curSession = getSessionAtHour(curHour)

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Clock className="size-3 text-muted-foreground" />
      {SESSIONS.map((s) => {
        const active = curSession?.hour === s.hour
        return (
          <div
            key={s.hour}
            className={cn(
              'rounded border px-2 py-0.5',
              active ? s.color.replace('/15', '/40') : 'bg-muted/30 text-muted-foreground',
              active && 'border-primary',
            )}
          >
            <span className="font-medium">{s.label}</span>
            <span className="ml-1 text-[10px] opacity-70">{s.hour}:00 WIB</span>
          </div>
        )
      })}
    </div>
  )
}
