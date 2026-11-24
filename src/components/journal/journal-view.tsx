'use client'

import { useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { JournalEntry } from '@/lib/types/trade'

export function JournalView() {
  const journal = useExtMarketStore((s) => s.journal)
  const [open, setOpen] = useState(false)
  const { addJournalEntry } = useMt5Socket()

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="size-5" /> Trade Journal
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="size-4" /> New Entry</Button>
          </DialogTrigger>
          <AddJournalDialog onSubmit={(e) => {
            addJournalEntry(e)
            useExtMarketStore.getState().addJournalEntry(e)
            setOpen(false)
            toast.success('Journal entry ditambahkan')
          }} />
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Journal Entries ({journal.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            {journal.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <BookOpen className="mx-auto mb-2 size-8 text-muted-foreground" />
                Belum ada journal entry. Tambahkan catatan untuk setiap trade — penting untuk review mingguan dan improvement.
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {journal.map((e) => (
                  <div key={e.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', e.side === 'BUY' ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                          {e.symbol} {e.side}
                        </Badge>
                        {e.setupQuality && (
                          <Badge className={cn('text-[10px]', e.setupQuality === 'A' ? 'bg-emerald-500' : e.setupQuality === 'B' ? 'bg-amber-500' : 'bg-red-500')}>
                            {e.setupQuality}
                          </Badge>
                        )}
                        {e.emotion && (
                          <Badge variant="outline" className="text-[10px]">{e.emotion}</Badge>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-medium tabular-nums">{e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(e.entryTime).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                    {e.strategy && <div className="mt-1 text-xs text-muted-foreground">Strategy: {e.strategy}</div>}
                    {e.mistakes && <div className="mt-1 text-xs"><span className="text-red-500">Mistakes:</span> {e.mistakes}</div>}
                    {e.lessons && <div className="mt-1 text-xs"><span className="text-emerald-500">Lessons:</span> {e.lessons}</div>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function AddJournalDialog({ onSubmit }: { onSubmit: (e: JournalEntry) => void }) {
  const [symbol, setSymbol] = useState('XAU/USD')
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [lots, setLots] = useState(0.01)
  const [pnl, setPnl] = useState(0)
  const [strategy, setStrategy] = useState('discretionary')
  const [setupQuality, setSetupQuality] = useState<'A' | 'B' | 'C'>('B')
  const [emotion, setEmotion] = useState<'calm' | 'anxious' | 'greedy' | 'fearful'>('calm')
  const [mistakes, setMistakes] = useState('')
  const [lessons, setLessons] = useState('')

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Journal Entry</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Side</Label>
            <Select value={side} onValueChange={(v) => setSide(v as any)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Entry Price</Label>
            <Input type="number" step="0.00001" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Exit Price</Label>
            <Input type="number" step="0.00001" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Lots</Label>
            <Input type="number" step="0.01" value={lots} onChange={(e) => setLots(parseFloat(e.target.value) || 0)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">P&L ($)</Label>
            <Input type="number" step="0.01" value={pnl} onChange={(e) => setPnl(parseFloat(e.target.value) || 0)} className="h-8 text-xs tabular-nums" />
          </div>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discretionary">Discretionary</SelectItem>
                <SelectItem value="fade_spike">Fade the Spike</SelectItem>
                <SelectItem value="15min_breakout">15-Min Breakout</SelectItem>
                <SelectItem value="trend_follow">Trend Follow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Setup Quality</Label>
            <Select value={setupQuality} onValueChange={(v) => setSetupQuality(v as any)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A (perfect)</SelectItem>
                <SelectItem value="B">B (good)</SelectItem>
                <SelectItem value="C">C (forced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Emotion</Label>
            <Select value={emotion} onValueChange={(v) => setEmotion(v as any)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="anxious">Anxious</SelectItem>
                <SelectItem value="greedy">Greedy</SelectItem>
                <SelectItem value="fearful">Fearful</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Mistakes</Label>
            <Textarea value={mistakes} onChange={(e) => setMistakes(e.target.value)} placeholder="Contoh: Masuk terlalu cepat sebelum konfirmasi breakout..." className="text-xs" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Lessons</Label>
            <Textarea value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="Contoh: Tunggu close M15 dulu, baru entry..." className="text-xs" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Batal</Button>
        </DialogClose>
        <Button
          onClick={() => onSubmit({
            id: 'je_' + Date.now(),
            symbol, side, entryTime: new Date().toISOString(),
            exitTime: new Date().toISOString(),
            entryPrice: parseFloat(entryPrice) || 0,
            exitPrice: parseFloat(exitPrice) || undefined,
            lots, pnl, strategy, setupQuality, emotion, mistakes, lessons,
          })}
        >
          Save Entry
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
