'use client'

import { useEffect, useState } from 'react'
import { Sidebar, type TabId } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { TradingView } from '@/components/trading/trading-view'
import { NewsCalendarView } from '@/components/news/news-calendar-view'
import { StrategyView } from '@/components/strategy/strategy-view'
import { AiAssistantView } from '@/components/ai/ai-assistant-view'
import { RiskManagerView } from '@/components/risk/risk-manager-view'
import { LogsView } from '@/components/logs/logs-view'
import { SettingsView } from '@/components/settings/settings-view'
import { useMt5Socket } from '@/lib/mt5/socket'
import { useUIStore } from '@/store/ui'
import { useMarketStore } from '@/store/market'
import { isTradingAllowedNow } from '@/lib/mt5/schedule'
import { cn } from '@/lib/utils'

export default function Home() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  // init socket & trading actions
  const { launchMt5 } = useMt5Socket()
  const density = useUIStore((s) => s.density)
  const settings = useUIStore((s) => s.settings)
  const socketReady = useMarketStore((s) => s.socketReady)
  const mt5Connected = useMarketStore((s) => s.mt5.connected)
  const setTradingAllowed = useMarketStore((s) => s.setTradingAllowed)

  // trading-allowed checker setiap 30 detik
  useEffect(() => {
    const tick = () => {
      const allowed = isTradingAllowedNow({
        start: settings.tradingStart ?? '08:00',
        end: settings.tradingEnd ?? '23:30',
        blockWeekend: settings.blockWeekend ?? true,
      })
      setTradingAllowed(allowed)
    }
    tick()
    const t = setInterval(tick, 30 * 1000)
    return () => clearInterval(t)
  }, [settings, setTradingAllowed])

  // Auto-launch MT5: trigger ketika socket ready & MT5 belum connected & setting autoLaunch on
  useEffect(() => {
    if (settings.mt5AutoLaunch && socketReady && !mt5Connected) {
      launchMt5({ path: settings.mt5Path, login: settings.mt5Login, server: settings.mt5Server })
    }
  }, [settings.mt5AutoLaunch, socketReady, mt5Connected, settings.mt5Path, settings.mt5Login, settings.mt5Server, launchMt5])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar active={tab} onChange={setTab} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onToggleSidebar={() => setCollapsed((c) => !c)} collapsed={collapsed} />
        <main className={cn(
          'flex-1 overflow-y-auto',
          density === 'dense' ? 'text-xs' : density === 'minimal' ? 'text-base' : 'text-sm',
        )}>
          {tab === 'dashboard' && <DashboardView />}
          {tab === 'trading' && <TradingView />}
          {tab === 'news' && <NewsCalendarView />}
          {tab === 'strategy' && <StrategyView />}
          {tab === 'ai' && <AiAssistantView />}
          {tab === 'risk' && <RiskManagerView />}
          {tab === 'logs' && <LogsView />}
          {tab === 'settings' && <SettingsView />}
        </main>
        <footer className="mt-auto border-t bg-background/70 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              FINEX Forex Trading Platform · MT5 · Groq · Tiingo · Python 3.14 backend
            </span>
            <span className="hidden md:inline">
              {settings.brokerName} · {settings.mt5Server} · Trading window {settings.tradingStart}-{settings.tradingEnd} {settings.blockWeekend ? '(No Sabtu/Minggu)' : ''}
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
