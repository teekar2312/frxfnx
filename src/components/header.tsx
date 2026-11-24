'use client'

import { PanelLeftClose, PanelLeftOpen, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Mt5StatusBadge } from '@/components/mt5/mt5-status-badge'
import { DensityToggle } from '@/components/density-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { MultiAccountSwitch } from '@/components/account/multi-account-switch'
import { useUIStore } from '@/store/ui'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
        <span className="text-xs text-muted-foreground">· Forex Trading Platform v2.0</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <MultiAccountSwitch />
        <Mt5StatusBadge />
        <DensityToggle />
        <ThemeToggle />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Hot keys">
                <Keyboard className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <div className="font-semibold">Hot Keys</div>
                <div><kbd className="rounded bg-muted px-1">F1</kbd> BUY market (active symbol, 0.01 lot)</div>
                <div><kbd className="rounded bg-muted px-1">F2</kbd> SELL market</div>
                <div><kbd className="rounded bg-muted px-1">F4</kbd> Reverse last position</div>
                <div><kbd className="rounded bg-muted px-1">F7</kbd> Flatten all</div>
                <div><kbd className="rounded bg-muted px-1">F8</kbd> Close all</div>
                <div><kbd className="rounded bg-muted px-1">F9</kbd> Open Settings</div>
                <div><kbd className="rounded bg-muted px-1">ESC</kbd> Cancel pending</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}
