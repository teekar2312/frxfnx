'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'

export function CopyTradeView() {
  const subs = useExtMarketStore((s) => s.copySubs)
  const { addCopySub, deleteCopySub } = useMt5Socket()
  const [source, setSource] = useState('67890')
  const [target, setTarget] = useState('12345')
  const [scale, setScale] = useState(1)
  const [reverse, setReverse] = useState(false)

  return (
    <div className="space-y-4 p-3 md:p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Users className="size-5" /> Copy Trading / Trade Cloning
      </h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Subscription</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Source (Master) Login</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Target (Subscriber) Login</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Lot Scale (e.g. 0.5 = half)</Label>
            <Input type="number" step="0.1" min="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value) || 1)} className="h-8 text-xs tabular-nums" />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={reverse} onCheckedChange={setReverse} />
            <Label className="text-xs">Reverse mode (BUY→SELL)</Label>
          </div>
          <div className="md:col-span-4">
            <Button
              size="sm"
              onClick={() => {
                addCopySub({
                  id: 'sub_' + Math.random().toString(36).slice(2),
                  sourceLogin: source,
                  targetLogin: target,
                  scaleLots: scale,
                  reverseMode: reverse,
                  enabled: true,
                  totalCopied: 0,
                })
                toast.success('Copy subscription ditambahkan')
              }}
            >
              Add Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Active Subscriptions ({subs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada subscription. Tambahkan untuk mirror master account.
            </div>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]">
                    {s.sourceLogin} → {s.targetLogin}
                  </Badge>
                  <span className="text-muted-foreground">Scale: {s.scaleLots}x</span>
                  {s.reverseMode && <Badge variant="outline" className="text-[10px]">REVERSE</Badge>}
                  <span className="text-muted-foreground">Copied: {s.totalCopied}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => deleteCopySub(s.id)}>
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-500">Catatan Copy Trading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>Copy trading hanya bekerja jika source dan target account keduanya terhubung ke MT5 bridge yang sama.</p>
          <p>Pastikan target account memiliki margin cukup. Sistem akan auto-skip jika margin tidak cukup.</p>
          <p>Reverse mode cocok untuk hedge strategy atau jika master memiliki track record buruk (counter-trend).</p>
        </CardContent>
      </Card>
    </div>
  )
}
