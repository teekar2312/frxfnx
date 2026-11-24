'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUIStore } from '@/store/ui'
import { useMarketStore } from '@/store/market'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { STOP_PIPS_MAX, TP_PIPS_TARGET } from '@/lib/risk/sizing'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PendingOrder as PO } from '@/lib/types/trade'

const SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY']

export function PendingOrdersView() {
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  const prices = useMarketStore((s) => s.prices)
  const pending = useExtMarketStore((s) => s.pendingOrders).filter((p) => p.status === 'pending')
  const mt5 = useMarketStore((s) => s.mt5)
  const { placePendingOrder, cancelPendingOrder } = useMt5Socket()

  const [orderType, setOrderType] = useState<PO['orderType']>('BUY_STOP')
  const [lots, setLots] = useState(0.01)
  const [triggerPrice, setTriggerPrice] = useState('')
  const [slPips, setSlPips] = useState(STOP_PIPS_MAX[activeSymbol] ?? 20)
  const [tpPips, setTpPips] = useState(TP_PIPS_TARGET[activeSymbol] ?? 15)
  const [enableExpiry, setEnableExpiry] = useState(false)
  const [expiryMinutes, setExpiryMinutes] = useState(60)
  const [busy, setBusy] = useState(false)

  const p = prices[activeSymbol]
  const digits = p?.digits ?? 2
  const pipSize = activeSymbol.includes('JPY') ? 0.01 : activeSymbol.includes('XAU') ? 0.1 : 0.0001

  const submit = async () => {
    if (!mt5.connected) { toast.error('MT5 belum terhubung'); return }
    setBusy(true)
    const tp = parseFloat(triggerPrice)
    if (!tp || tp <= 0) { toast.error('Trigger price tidak valid'); setBusy(false); return }
    const sl = tp + (orderType.startsWith('SELL') ? +slPips : -slPips) * pipSize  // SELL_STOP sl di atas, BUY_STOP sl di bawah
    const tpPrice = tp + (orderType.startsWith('BUY') ? +tpPips : -tpPips) * pipSize
    const expiresAt = enableExpiry ? new Date(Date.now() + expiryMinutes * 60000).toISOString() : undefined
    const r: any = await placePendingOrder({
      symbol: activeSymbol,
      orderType,
      lots,
      triggerPrice: tp,
      sl: +sl.toFixed(digits),
      tp: +tpPrice.toFixed(digits),
      isAuto: false,
      expiresAt,
    })
    setBusy(false)
    if (r?.ok) toast.success(`${orderType} ${lots} ${activeSymbol} @ ${tp} ditempatkan (ticket #${r.ticket})`)
    else toast.error(r?.msg ?? 'Gagal place pending')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Pending Orders (Strategi B)</span>
          <Badge variant="outline" className="text-xs">{pending.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Symbol</Label>
            <Select value={activeSymbol} onValueChange={(v) => { useUIStore.getState().setActiveSymbol(v); setSlPips(STOP_PIPS_MAX[v] ?? 20); setTpPips(TP_PIPS_TARGET[v] ?? 15) }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Order Type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as PO['orderType'])}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY_STOP">Buy Stop (di atas ask)</SelectItem>
                <SelectItem value="SELL_STOP">Sell Stop (di bawah bid)</SelectItem>
                <SelectItem value="BUY_LIMIT">Buy Limit (di bawah ask)</SelectItem>
                <SelectItem value="SELL_LIMIT">Sell Limit (di atas bid)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Lots</Label>
            <Input type="number" step="0.01" min="0.01" value={lots} onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Trigger Price</Label>
            <Input type="number" step={pipSize} value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} placeholder={p?.bid.toFixed(digits)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">SL (pips) max {STOP_PIPS_MAX[activeSymbol] ?? 20}</Label>
            <Input type="number" value={slPips} onChange={(e) => setSlPips(parseInt(e.target.value) || 0)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">TP (pips) target {TP_PIPS_TARGET[activeSymbol] ?? 15}</Label>
            <Input type="number" value={tpPips} onChange={(e) => setTpPips(parseInt(e.target.value) || 0)} className="h-8 text-xs tabular-nums" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enableExpiry} onCheckedChange={setEnableExpiry} />
          <Label className="text-xs">Auto-expire dalam</Label>
          <Input type="number" min="1" max="1440" value={expiryMinutes} onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 60)} disabled={!enableExpiry} className="h-7 w-20 text-xs tabular-nums" />
          <span className="text-xs text-muted-foreground">menit</span>
        </div>
        <Button onClick={submit} disabled={busy || !mt5.connected} className="w-full gap-1">
          {busy ? 'Processing...' : `Place ${orderType} ${activeSymbol}`}
        </Button>

        <div className="border-t pt-3">
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Active Pending Orders</div>
          {pending.length === 0 ? (
            <div className="text-xs text-muted-foreground">Belum ada pending order aktif</div>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {pending.map((po) => (
                <div key={po.ticket} className={cn('flex items-center justify-between rounded border px-2 py-1 text-xs')}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px]', po.orderType.startsWith('BUY') ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                      {po.orderType}
                    </Badge>
                    <span className="font-medium">{po.symbol}</span>
                    <span className="tabular-nums">{po.lots} @ {po.triggerPrice.toFixed(digits)}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => cancelPendingOrder(po.ticket)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
