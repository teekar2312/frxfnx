'use client'

import { useState } from 'react'
import { Minus, Pencil, Trash2, TrendingUp, Type } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/store/ui'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type DrawType = 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'text'

export function DrawingToolbar() {
  const [tool, setTool] = useState<DrawType | null>(null)
  const [color, setColor] = useState('#3b82f6')
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  const drawings = useExtMarketStore((s) => s.drawings)
  const { addDrawing, deleteDrawing, clearDrawings } = useMt5Socket()

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7']

  const addHHorizontalLine = () => {
    const prices = useMarketStore.getState().prices
    const p = prices[activeSymbol]
    if (!p) return
    const price = p.bid
    addDrawing({
      id: 'draw_' + Date.now(),
      symbol: activeSymbol,
      type: 'horizontal',
      points: [{ time: Date.now(), price }],
      style: { color, lineWidth: 1 },
      label: 'H-Line',
      visible: true,
      createdAt: new Date().toISOString(),
    })
    toast.success(`Horizontal line @ ${price.toFixed(p.digits)}`)
  }

  const addTrendline = () => {
    const prices = useMarketStore.getState().prices
    const p = prices[activeSymbol]
    if (!p || p.history.length < 2) return
    addDrawing({
      id: 'draw_' + Date.now(),
      symbol: activeSymbol,
      type: 'trendline',
      points: [
        { time: p.history[Math.max(0, p.history.length - 30)].t, price: p.history[Math.max(0, p.history.length - 30)].bid },
        { time: Date.now(), price: p.bid },
      ],
      style: { color, lineWidth: 1 },
      label: 'Trend',
      visible: true,
      createdAt: new Date().toISOString(),
    })
    toast.success('Trendline ditambahkan')
  }

  const addFibonacci = () => {
    const prices = useMarketStore.getState().prices
    const p = prices[activeSymbol]
    if (!p || p.history.length < 30) return
    const recent = p.history.slice(-30)
    const high = Math.max(...recent.map((h) => h.bid))
    const low = Math.min(...recent.map((h) => h.bid))
    addDrawing({
      id: 'draw_' + Date.now(),
      symbol: activeSymbol,
      type: 'fibonacci',
      points: [
        { time: recent[0].t, price: high },
        { time: recent[recent.length - 1].t, price: low },
      ],
      style: { color, lineWidth: 1 },
      label: 'Fib 0-100%',
      visible: true,
      createdAt: new Date().toISOString(),
    })
    toast.success('Fibonacci ditambahkan')
  }

  const symbolDrawings = drawings.filter((d) => d.symbol === activeSymbol)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Drawing Tools · {activeSymbol}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => clearDrawings(activeSymbol)}>
            <Trash2 className="size-3" /> Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addHHorizontalLine}>
            <Minus className="size-3" /> H-Line
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addTrendline}>
            <TrendingUp className="size-3" /> Trend
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addFibonacci}>
            <Pencil className="size-3" /> Fib
          </Button>
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('size-6 rounded border', color === c ? 'ring-2 ring-offset-1' : '')}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Active Drawings ({symbolDrawings.length})</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {symbolDrawings.length === 0 ? (
              <div className="text-xs text-muted-foreground">Belum ada drawing untuk {activeSymbol}</div>
            ) : symbolDrawings.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded" style={{ background: d.style.color }} />
                  {d.type} {d.label && <span className="text-muted-foreground">· {d.label}</span>}
                </span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => deleteDrawing(d.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { useMarketStore } from '@/store/market'
