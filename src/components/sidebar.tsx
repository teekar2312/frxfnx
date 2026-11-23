'use client'

import { Activity, Bot, CalendarClock, Gauge, LayoutDashboard, ListChecks, Settings, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'

export type TabId = 'dashboard' | 'trading' | 'news' | 'strategy' | 'ai' | 'risk' | 'logs' | 'settings'

const NAV: { id: TabId; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, group: 'Trading' },
  { id: 'trading', label: 'Trading', icon: <TrendingUp className="size-4" />, group: 'Trading' },
  { id: 'news', label: 'News Calendar', icon: <CalendarClock className="size-4" />, group: 'Data' },
  { id: 'strategy', label: 'Strategi', icon: <ListChecks className="size-4" />, group: 'Data' },
  { id: 'ai', label: 'AI Assistant', icon: <Bot className="size-4" />, group: 'Intelligence' },
  { id: 'risk', label: 'Risk Manager', icon: <Gauge className="size-4" />, group: 'Intelligence' },
  { id: 'logs', label: 'Logs & Audit', icon: <Activity className="size-4" />, group: 'System' },
  { id: 'settings', label: 'Settings', icon: <Settings className="size-4" />, group: 'System' },
]

interface SidebarProps {
  active: TabId
  onChange: (t: TabId) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ active, onChange, collapsed }: SidebarProps) {
  const density = useUIStore((s) => s.density)
  const pad = density === 'dense' ? 'px-2 py-1.5' : density === 'minimal' ? 'px-4 py-3.5' : 'px-3 py-2.5'
  const groups = Array.from(new Set(NAV.map((n) => n.group)))

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-sidebar/70 backdrop-blur transition-all',
        collapsed ? 'w-[60px]' : 'w-[200px]',
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">F</div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">FINEX Forex</span>
            <span className="text-[10px] text-muted-foreground">MT5 · Groq · Tiingo</span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map((g) => (
          <div key={g} className="mb-3">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g}</div>
            )}
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => (
                <button
                  key={n.id}
                  onClick={() => onChange(n.id)}
                  title={collapsed ? n.label : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md text-left font-medium transition-colors',
                    pad,
                    active === n.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center',
                  )}
                >
                  {n.icon}
                  {!collapsed && <span className="text-sm">{n.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-2">
        <div className={cn('rounded-md bg-muted/40 px-2 py-1.5', collapsed && 'px-1.5')}>
          {collapsed ? (
            <div className="text-center text-[10px] text-muted-foreground">v1.0</div>
          ) : (
            <>
              <div className="text-[10px] text-muted-foreground">Broker</div>
              <div className="text-xs font-medium">FINEX Indonesia</div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
