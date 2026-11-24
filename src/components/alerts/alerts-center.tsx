'use client'

import { useState } from 'react'
import { Bell, BellOff, Check, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function AlertsCenter() {
  const alerts = useExtMarketStore((s) => s.alertEvents)
  const rules = useExtMarketStore((s) => s.alertRules)
  const { ackAlert, setAlertRules, addAlertRule, deleteAlertRule } = useMt5Socket()
  const [newType, setNewType] = useState<'price_above' | 'price_below' | 'spread_wide' | 'margin_low'>('price_above')
  const [newSymbol, setNewSymbol] = useState('XAU/USD')
  const [newThreshold, setNewThreshold] = useState(2700)
  const [newSev, setNewSev] = useState<'info' | 'warn' | 'critical'>('warn')

  const toggleRule = (id: string) => {
    const updated = rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r)
    // Optimistic local update
    useExtMarketStore.getState().setAlertRules(updated)
    setAlertRules(updated)
  }

  const addRule = () => {
    addAlertRule({
      id: 'rule_' + Math.random().toString(36).slice(2),
      type: newType,
      symbol: newSymbol,
      condition: newType === 'price_above' || newType === 'price_below' ? { price: newThreshold } : { pips: newThreshold, pct: newThreshold },
      message: `${newSymbol} ${newType.replace('_', ' ')} ${newThreshold}`,
      severity: newSev,
      enabled: true,
      triggerCount: 0,
    })
    toast.success('Alert rule ditambahkan')
  }

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Bell className="size-4" /> Active Alerts</span>
              <Badge variant="outline" className="text-xs">{alerts.filter((a) => !a.acknowledged).length} baru</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <BellOff className="mx-auto mb-2 size-8 text-muted-foreground" />
                  Belum ada alert. Konfigurasi rule di kanan.
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className={cn(
                    'flex items-start gap-2 border-b px-3 py-2 text-xs',
                    a.severity === 'critical' ? 'bg-red-500/5' : a.severity === 'warn' ? 'bg-amber-500/5' : '',
                    a.acknowledged && 'opacity-50',
                  )}>
                    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', a.severity === 'critical' ? 'bg-red-500 text-white' : a.severity === 'warn' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white')}>
                      {a.severity}
                    </span>
                    <div className="flex-1">
                      <div className="text-foreground">{a.message}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleString('id-ID')}</div>
                    </div>
                    {!a.acknowledged ? (
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { useExtMarketStore.getState().ackAlert(a.id); ackAlert(a.id) }}>
                        <Check className="size-3" /> Ack
                      </Button>
                    ) : (
                      <Check className="size-3 text-emerald-500" />
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add Alert Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_above">Price Above</SelectItem>
                  <SelectItem value="price_below">Price Below</SelectItem>
                  <SelectItem value="spread_wide">Spread Wide (pips)</SelectItem>
                  <SelectItem value="margin_low">Margin Low (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newType === 'price_above' || newType === 'price_below' || newType === 'spread_wide') && (
              <div>
                <Label className="text-xs">Symbol</Label>
                <Select value={newSymbol} onValueChange={setNewSymbol}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Threshold {newType === 'spread_wide' ? '(pips)' : newType === 'margin_low' ? '(%)' : '(price)'}</Label>
              <Input type="number" step={newType === 'price_above' || newType === 'price_below' ? 0.01 : 1} value={newThreshold} onChange={(e) => setNewThreshold(parseFloat(e.target.value) || 0)} className="h-8 text-xs tabular-nums" />
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={newSev} onValueChange={(v) => setNewSev(v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addRule} className="w-full text-xs">Add Rule</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alert Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
              <div className="flex items-center gap-2">
                <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} className="scale-75" />
                <div>
                  <div className="font-medium">{r.type.replace('_', ' ')} {r.symbol ?? ''} {r.condition?.price ?? r.condition?.pips ?? r.condition?.pct ?? ''}</div>
                  <div className="text-[10px] text-muted-foreground">{r.message} · triggered {r.triggerCount}×</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px]', r.severity === 'critical' ? 'border-red-500/40 text-red-500' : r.severity === 'warn' ? 'border-amber-500/40 text-amber-500' : '')}>
                  {r.severity}
                </Badge>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => deleteAlertRule(r.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
