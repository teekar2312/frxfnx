'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calculator, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useMt5Socket } from '@/lib/mt5/socket'
import { calcLots, PIP_VALUE_PER_LOT, STOP_PIPS_MAX, TP_PIPS_TARGET } from '@/lib/risk/sizing'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY']

export function OrderTicket() {
  const mt5 = useMarketStore((s) => s.mt5)
  const positions = useMarketStore((s) => s.positions)
  const settings = useUIStore((s) => s.settings)
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  const setActiveSymbol = useUIStore((s) => s.setActiveSymbol)
  const { openTrade } = useMt5Socket()
  const d = useUIStore((s) => s.density)
  const pad = d === 'dense' ? 'p-2' : d === 'minimal' ? 'p-6' : 'p-4'

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [lots, setLots] = useState(0.01)
  const [slPips, setSlPips] = useState(STOP_PIPS_MAX[activeSymbol] ?? 20)
  const [tpPips, setTpPips] = useState(TP_PIPS_TARGET[activeSymbol] ?? 15)
  const [busy, setBusy] = useState(false)

  const slDefault = STOP_PIPS_MAX[activeSymbol] ?? 20
  const tpDefault = TP_PIPS_TARGET[activeSymbol] ?? 15
  const pipValue = PIP_VALUE_PER_LOT[activeSymbol] ?? 10

  const calc = useMemo(() => {
    return calcLots({
      equity: mt5.equity,
      riskPct: settings.riskPerTradePct ?? 0.5,
      stopPips: slPips,
      pipValuePerLot: pipValue,
    })
  }, [mt5.equity, settings.riskPerTradePct, slPips, pipValue])

  // Auto-set SL/TP saat symbol ganti
  useEffect(() => {
    setSlPips(STOP_PIPS_MAX[activeSymbol] ?? 20)
    setTpPips(TP_PIPS_TARGET[activeSymbol] ?? 15)
  }, [activeSymbol])

  // R:R check
  const rr = slPips > 0 ? tpPips / slPips : 0
  const rrOk = rr >= (settings.rrMin ?? 1.5)

  const submit = async (s: 'BUY' | 'SELL') => {
    if (!mt5.connected) {
      toast.error('MT5 belum terhubung. Klik Start MT5 di header.')
      return
    }
    setBusy(true)
    const r: any = await openTrade({ symbol: activeSymbol, side: s, lots, sl: undefined, tp: undefined, isAuto: false })
    setBusy(false)
    if (r?.ok) {
      toast.success(`${s} ${lots} lot ${activeSymbol} berhasil (ticket #${r.ticket})`)
    } else {
      toast.error(`Gagal order: ${r?.msg ?? 'unknown error'}`)
    }
  }

  // SL/TP dalam price ticks
  const computeSlTp = () => {
    // hitung harga SL/TP dari pips
    let sl: number | undefined = undefined
    let tp: number | undefined = undefined
    const bid = useMarketStore.getState().prices[activeSymbol]?.bid ?? 0
    const ask = useMarketStore.getState().prices[activeSymbol]?.ask ?? 0
    const digits = useMarketStore.getState().prices[activeSymbol]?.digits ?? 2
    const pipSize = activeSymbol.includes('JPY') ? 0.01 : activeSymbol.includes('XAU') ? 0.1 : 0.0001
    if (side === 'BUY') {
      sl = +(ask - slPips * pipSize).toFixed(digits)
      tp = +(ask + tpPips * pipSize).toFixed(digits)
    } else {
      sl = +(bid + slPips * pipSize).toFixed(digits)
      tp = +(bid - tpPips * pipSize).toFixed(digits)
    }
    return { sl, tp }
  }

  const positionsCount = positions.filter((p) => p.symbol === activeSymbol).length

  return (
    <Card className={cn(pad)}>
      <CardHeader className="p-0 pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Order Ticket</span>
          <Badge variant="outline" className="text-xs">{positionsCount} posisi</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <div>
          <Label className="mb-1 text-xs">Symbol</Label>
          <div className="grid grid-cols-4 gap-1">
            {SYMBOLS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === activeSymbol ? 'default' : 'outline'}
                className={cn('h-8 px-1 text-[11px]', s === activeSymbol && 'bg-primary/15')}
                onClick={() => setActiveSymbol(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 text-xs">Lots</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={lots}
              onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="h-8 text-sm tabular-nums"
            />
          </div>
          <div>
            <Label className="mb-1 text-xs">Risk %</Label>
            <Input
              type="number"
              step="0.05"
              min="0.05"
              max="5"
              value={settings.riskPerTradePct ?? 0.5}
              readOnly
              className="h-8 bg-muted/30 text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 text-xs">SL (pips) · max {slDefault}</Label>
            <Input
              type="number"
              step="1"
              min="1"
              max={slDefault}
              value={slPips}
              onChange={(e) => setSlPips(Math.max(1, parseInt(e.target.value || '1')))}
              className="h-8 text-sm tabular-nums"
            />
          </div>
          <div>
            <Label className="mb-1 text-xs">TP (pips) · target {tpDefault}</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={tpPips}
              onChange={(e) => setTpPips(Math.max(1, parseInt(e.target.value || '1')))}
              className="h-8 text-sm tabular-nums"
            />
          </div>
        </div>

        {/* Risk summary */}
        <div className="rounded-md border bg-muted/30 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Risk Amount</span>
            <span className="tabular-nums font-medium">${calc.riskAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Suggested Lots</span>
            <span className="tabular-nums font-medium">{calc.lots.toFixed(2)} lot</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">R:R</span>
            <span className={cn('tabular-nums font-medium', rrOk ? 'text-emerald-500' : 'text-amber-500')}>
              1:{rr.toFixed(2)} {rrOk ? '✓' : '✗ (min 1:' + (settings.rrMin ?? 1.5) + ')'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant="default"
            className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={busy || !mt5.connected}
            onClick={() => submit('BUY')}
          >
            BUY
            <br />
            <span className="text-[10px] opacity-80">{useMarketStore.getState().prices[activeSymbol]?.ask.toFixed(useMarketStore.getState().prices[activeSymbol]?.digits ?? 2) ?? '—'}</span>
          </Button>
          <Button
            size="lg"
            variant="default"
            className="h-10 bg-red-600 text-white hover:bg-red-700"
            disabled={busy || !mt5.connected}
            onClick={() => submit('SELL')}
          >
            SELL
            <br />
            <span className="text-[10px] opacity-80">{useMarketStore.getState().prices[activeSymbol]?.bid.toFixed(useMarketStore.getState().prices[activeSymbol]?.digits ?? 2) ?? '—'}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="size-3" />
          Server-side SL & TP wajib (broker-side). Lot disarankan {calc.lots.toFixed(2)} berdasarkan risk {settings.riskPerTradePct}%.
        </div>
      </CardContent>
    </Card>
  )
}
