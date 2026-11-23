'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Mt5StatusBadge } from '@/components/mt5/mt5-status-badge'
import { DensityToggle } from '@/components/density-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { useUIStore } from '@/store/ui'

interface HeaderProps {
  onToggleSidebar: () => void
  collapsed: boolean
}

export function Header({ onToggleSidebar, collapsed }: HeaderProps) {
  const broker = useUIStore((s) => s.settings.brokerName ?? 'FINEX Indonesia')
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background/70 px-3 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle sidebar" className="size-9">
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      </Button>
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-sm font-semibold">{broker}</span>
        <span className="text-xs text-muted-foreground">· Forex Trading Platform</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Mt5StatusBadge />
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
