'use client'

import { Columns3, Rows3, Square } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { Density } from '@/types'

const DENSITIES: { value: Density; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'compact', label: 'Compact', icon: <Square className="size-3.5" />, desc: 'Seimbang' },
  { value: 'dense', label: 'Dense', icon: <Rows3 className="size-3.5" />, desc: 'Maksimal data' },
  { value: 'minimal', label: 'Minimal', icon: <Columns3 className="size-3.5" />, desc: 'Legah dibaca' },
]

export function DensityToggle() {
  const density = useUIStore((s) => s.density)
  const setDensity = useUIStore((s) => s.setDensity)

  return (
    <ToggleGroup
      type="single"
      value={density}
      onValueChange={(v) => v && setDensity(v as Density)}
      className="rounded-md border bg-background/50 p-0.5"
      aria-label="Display density"
    >
      {DENSITIES.map((d) => (
        <ToggleGroupItem
          key={d.value}
          value={d.value}
          aria-label={d.label}
          className={cn('h-7 gap-1 px-2 text-xs', density === d.value && 'bg-primary/15 text-primary')}
        >
          {d.icon}
          <span className="hidden sm:inline">{d.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
