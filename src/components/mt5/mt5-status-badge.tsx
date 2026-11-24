'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, WifiOff, Zap, RefreshCw, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useMt5Socket } from '@/lib/mt5/socket'
import { dayName, formatCountdown, isTradingAllowedNow } from '@/lib/mt5/schedule'
import { cn } from '@/lib/utils'

export function Mt5StatusBadge() {
  const mt5 = useMarketStore((s) => s.mt5)
  const socketReady = useMarketStore((s) => s.socketReady)
  const settings = useUIStore((s) => s.settings)
  const [now, setNow] = useState<Date | null>(null)
  const { launchMt5, disconnectMt5 } = useMt5Socket()
  const [launchingDisplay, setLaunchingDisplay] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const effectiveNow = now ?? new Date(0)
  const allowed = isTradingAllowedNow(
    { start: settings.tradingStart ?? '08:00', end: settings.tradingEnd ?? '23:30', blockWeekend: settings.blockWeekend ?? true },
    effectiveNow,
  )

  // Next session countdown
  const nextAllowed = allowed || !now ? 0 : (() => {
    const cand = new Date(now)
    cand.setHours(Number((settings.tradingStart ?? '08:00').split(':')[0]), Number((settings.tradingStart ?? '08:00').split(':')[1]), 0, 0)
    if (cand.getTime() < now.getTime() || (settings.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6))) {
      cand.setDate(cand.getDate() + 1)
      while (settings.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6)) cand.setDate(cand.getDate() + 1)
      cand.setHours(Number((settings.tradingStart ?? '08:00').split(':')[0]), Number((settings.tradingStart ?? '08:00').split(':')[1]), 0, 0)
    }
    return cand.getTime() - now.getTime()
  })()

  const triggerLaunch = () => {
    setLaunchingDisplay(true)
    launchMt5({ path: settings.mt5Path, login: settings.mt5Login, server: settings.mt5Server }).finally(() => {
      setLaunchingDisplay(false)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Socket */}
      <Badge variant="outline" className={cn('gap-1', socketReady ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
        {socketReady ? <WifiOff className="size-3 opacity-0" /> : <WifiOff className="size-3" />}
        <span className="size-2 rounded-full" style={{ background: socketReady ? '#10b981' : '#ef4444' }} />
        {socketReady ? 'WS Live' : 'WS Off'}
      </Badge>

      {/* Trading window */}
      <Badge variant="outline" className={cn('gap-1', allowed ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500')}>
        {allowed ? <Play className="size-3" /> : <Pause className="size-3" />}
        <span className="hidden sm:inline">{allowed ? 'Trade Active' : 'Trade Pause'}</span>
        <span className="text-[10px] opacity-70 hidden md:inline">
          {now ? `${dayName(now)} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '—'}
        </span>
        {!allowed && nextAllowed > 0 && (
          <span className="ml-1 text-[10px] opacity-80 hidden md:inline">{formatCountdown(nextAllowed)}</span>
        )}
      </Badge>

      {/* MT5 connection */}
      <Badge
        variant="outline"
        className={cn(
          'gap-1',
          mt5.connected ? 'border-emerald-500/40 text-emerald-500' : mt5.launching ? 'border-amber-500/40 text-amber-500' : 'border-red-500/40 text-red-500',
        )}
      >
        <Zap className="size-3" />
        {mt5.connected ? 'MT5 Live' : (mt5.launching || launchingDisplay) ? 'Launching…' : 'MT5 Off'}
        {mt5.connected && mt5.login && <span className="text-[10px] opacity-70 hidden md:inline">#{mt5.login}</span>}
      </Badge>

      {/* Launch button */}
      {!mt5.connected && (
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1 text-xs"
          onClick={triggerLaunch}
          disabled={launchingDisplay}
        >
          {launchingDisplay ? <RefreshCw className="size-3 animate-spin" /> : <Power className="size-3" />}
          {launchingDisplay ? 'Starting' : 'Start MT5'}
        </Button>
      )}
      {mt5.connected && (
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={disconnectMt5}>
          <Power className="size-3" /> Disconnect
        </Button>
      )}
    </div>
  )
}
