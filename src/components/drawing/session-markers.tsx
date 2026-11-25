'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRADING_SESSIONS, getActiveSessions, formatSessionHours } from '@/lib/mt5/sessions'

// 6 sesi trading (semua bukan hanya 3)
// Sydney (Pasifik), Tokyo (Asia), London (Eropa), New York (Amerika),
// Overlap Sydney-Tokyo, Overlap London-New York

interface SessionMarker {
  startHour: number
  shortName: string
  color: string
  description: string
}

const ALL_SESSION_MARKERS: SessionMarker[] = [
  // Base sessions
  { startHour: 5, shortName: 'Sydney', color: 'bg-purple-500/20 border-purple-500/40', description: 'Sesi Sydney (Pasifik) 05:00-14:00 WIB' },
  { startHour: 7, shortName: 'Tokyo', color: 'bg-amber-500/20 border-amber-500/40', description: 'Sesi Tokyo (Asia) 07:00-16:00 WIB' },
  { startHour: 15, shortName: 'London', color: 'bg-emerald-500/20 border-emerald-500/40', description: 'Sesi London (Eropa) 15:00-24:00 WIB' },
  { startHour: 20, shortName: 'New York', color: 'bg-blue-500/20 border-blue-500/40', description: 'Sesi New York (Amerika) 20:00-05:00+1 WIB' },
  // Overlaps (highlighted)
  { startHour: 7, shortName: 'Syd-Tyo', color: 'bg-pink-500/30 border-pink-500/50', description: 'Overlap Sydney-Tokyo 07:00-14:00 WIB' },
  { startHour: 20, shortName: 'Lon-NY', color: 'bg-red-500/30 border-red-500/50', description: 'Overlap London-New York 20:00-24:00 WIB' },
]

export function getSessionAtHour(hour: number): SessionMarker | null {
  // Cek overlap dulu (lebih spesifik)
  for (const s of ALL_SESSION_MARKERS) {
    if (s.shortName === 'Syd-Tyo' && hour >= 7 && hour < 14) return s
    if (s.shortName === 'Lon-NY' && hour >= 20 && hour < 24) return s
  }
  // Lalu base sessions
  if (hour >= 5 && hour < 14) return ALL_SESSION_MARKERS.find((s) => s.shortName === 'Sydney')!
  if (hour >= 7 && hour < 16) return ALL_SESSION_MARKERS.find((s) => s.shortName === 'Tokyo')!
  if (hour >= 15 && hour < 24) return ALL_SESSION_MARKERS.find((s) => s.shortName === 'London')!
  if (hour >= 20 || hour < 5) return ALL_SESSION_MARKERS.find((s) => s.shortName === 'New York')!
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
  // Gunakan UTC untuk konsistensi timezone
  const curHour = (now.getUTCHours() + 7) % 24
  const activeSessions = getActiveSessions(now)

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Clock className="size-3 text-muted-foreground" />
      {TRADING_SESSIONS.map((s) => {
        const active = activeSessions.some((a) => a.id === s.id)
        return (
          <div
            key={s.id}
            title={`${s.name} · ${formatSessionHours(s)}`}
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
              active
                ? 'border-foreground/30 bg-foreground/10 text-foreground font-medium'
                : 'bg-muted/30 text-muted-foreground',
            )}
            style={active ? { borderColor: s.color, color: s.color } : undefined}
          >
            {s.shortName}
          </div>
        )
      })}
      {activeSessions.length > 0 && (
        <span className="ml-1 text-[10px] text-emerald-500">
          ● {activeSessions.length} sesi aktif
        </span>
      )}
    </div>
  )
}
