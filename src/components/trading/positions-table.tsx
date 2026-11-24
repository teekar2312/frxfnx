'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMarketStore } from '@/store/market'
import { useUIStore } from '@/store/ui'
import { useMt5Socket } from '@/lib/mt5/socket'
import { TradeTimer } from '@/components/trading/trade-timer'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function PositionsTable() {
  const positions = useMarketStore((s) => s.positions)
  const prices = useMarketStore((s) => s.prices)
  const d = useUIStore((s) => s.density)
  const { closeTrade, modifyTrade, partialClose } = useMt5Socket()
  const [editing, setEditing] = useState<number | null>(null)
  const [slVal, setSlVal] = useState('')
  const [tpVal, setTpVal] = useState('')

  const rowPad = d === 'dense' ? 'py-1 px-2 text-xs' : d === 'minimal' ? 'py-3 px-4' : 'py-2 px-3 text-sm'
  const total = positions.reduce((acc, p) => acc + (p.profit ?? 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Open Positions</span>
          <Badge variant="outline" className={cn('text-xs', total >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            Total {total >= 0 ? '+' : ''}{total.toFixed(2)} USD
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          {positions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada posisi terbuka. Buka trade dari Order Ticket (F1/F2 hot keys).
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 border-b bg-muted/30 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className={cn('text-left', rowPad)}>#</th>
                  <th className={cn('text-left', rowPad)}>Symbol</th>
                  <th className={cn('text-left', rowPad)}>Side</th>
                  <th className={cn('text-right', rowPad)}>Lots</th>
                  <th className={cn('text-right', rowPad)}>Open</th>
                  <th className={cn('text-right', rowPad)}>SL/TP</th>
                  <th className={cn('text-right', rowPad)}>P&L</th>
                  <th className={cn('text-center', rowPad)}>Time</th>
                  <th className={cn('text-right', rowPad)}>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const digits = prices[p.symbol]?.digits ?? 2
                  return (
                    <tr key={p.ticket} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className={cn('tabular-nums text-muted-foreground', rowPad)}>{p.ticket}</td>
                      <td className={cn('font-medium', rowPad)}>
                        {p.symbol}
                        {p.isAuto && <Badge variant="outline" className="ml-1 text-[10px]">AUTO</Badge>}
                      </td>
                      <td className={rowPad}>
                        <Badge variant="outline" className={cn('text-xs', p.side === 'BUY' ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                          {p.side}
                        </Badge>
                      </td>
                      <td className={cn('text-right tabular-nums', rowPad)}>
                        {p.lots.toFixed(2)}
                        {p.partialClosed && <span className="ml-1 text-[10px] text-amber-500">P</span>}
                      </td>
                      <td className={cn('text-right tabular-nums', rowPad)}>{p.openPrice.toFixed(digits)}</td>
                      <td className={cn('text-right tabular-nums', rowPad)}>
                        {editing === p.ticket ? (
                          <div className="flex justify-end gap-1">
                            <Input
                              type="number"
                              step="0.00001"
                              placeholder="SL"
                              value={slVal}
                              onChange={(e) => setSlVal(e.target.value)}
                              className="h-7 w-20 text-xs"
                            />
                            <Input
                              type="number"
                              step="0.00001"
                              placeholder="TP"
                              value={tpVal}
                              onChange={(e) => setTpVal(e.target.value)}
                              className="h-7 w-20 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="text-xs">
                            <span className="text-red-500">{p.sl?.toFixed(digits) ?? '—'}</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="text-emerald-500">{p.tp?.toFixed(digits) ?? '—'}</span>
                          </div>
                        )}
                      </td>
                      <td className={cn('text-right tabular-nums font-medium', rowPad, (p.profit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {(p.profit ?? 0) >= 0 ? '+' : ''}{(p.profit ?? 0).toFixed(2)}
                      </td>
                      <td className={cn('text-center', rowPad)}>
                        <TradeTimer durationMs={p.durationMs ?? (Date.now() - new Date(p.openTime).getTime())} />
                      </td>
                      <td className={cn('text-right', rowPad)}>
                        {editing === p.ticket ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={async () => {
                                const sl = slVal ? parseFloat(slVal) : undefined
                                const tp = tpVal ? parseFloat(tpVal) : undefined
                                const r: any = await modifyTrade(p.ticket, sl, tp)
                                if (r?.ok) toast.success('SL/TP diperbarui')
                                setEditing(null); setSlVal(''); setTpVal('')
                              }}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>
                              <X className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditing(p.ticket)
                                setSlVal(p.sl?.toString() ?? '')
                                setTpVal(p.tp?.toString() ?? '')
                              }}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={async () => {
                                const r: any = await partialClose(p.ticket, 0.5)
                                if (r?.ok) toast.success(`Partial close 50%, P&L ${r.profit?.toFixed(2)}`)
                              }}
                              title="Partial close 50%"
                            >
                              50%
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={async () => {
                                const r: any = await closeTrade(p.ticket)
                                if (r?.ok) toast.success(`Closed #${p.ticket}, P&L ${r.profit?.toFixed(2)}`)
                                else toast.error(r?.msg ?? 'Gagal close')
                              }}
                            >
                              Close
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
