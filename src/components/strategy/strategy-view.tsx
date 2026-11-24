'use client'

import { useState } from 'react'
import { Bot, Clock, Layers, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUIStore } from '@/store/ui'
import { useMarketStore } from '@/store/market'
import { cn } from '@/lib/utils'

interface StrategyDef {
  id: string
  name: string
  type: 'fade_spike' | '15min_breakout' | 'custom'
  description: string
  symbols: string[]
  enabled: boolean
  isAuto: boolean
  waitMinutes: number
  slPipsMax: number
  tpPipsTarget: number
  newsFilterImpact: 'high' | 'medium' | 'low'
  newsFilterCountry: string
  activeStart: string
  activeEnd: string
}

const DEFAULT_STRATEGIES: StrategyDef[] = [
  {
    id: 'fade_spike',
    name: 'Strategi A: Fade the Spike',
    type: 'fade_spike',
    description:
      'Manfaatkan kelelahan momentum. Biarkan spike terjadi di menit pertama, tunggu RSI/Stochastic ekstrem + ekor panjang di M1/M5, lalu entri counter-trend. Target 10-15 pips.',
    symbols: ['XAU/USD', 'EUR/USD'],
    enabled: true,
    isAuto: false,
    waitMinutes: 2,
    slPipsMax: 30,
    tpPipsTarget: 12,
    newsFilterImpact: 'high',
    newsFilterCountry: 'USD',
    activeStart: '08:00',
    activeEnd: '23:30',
  },
  {
    id: '15min_breakout',
    name: 'Strategi B: 15-Minute Breakout',
    type: '15min_breakout',
    description:
      'Tunggu 15 menit pertama agar candle M15 terbentuk. Tandai High/Low. Pasang Sell Stop di bawah Low (untuk XAU/EUR/GBP) atau Buy Stop di atas High (untuk JPY). Target pair-specific.',
    symbols: ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'],
    enabled: true,
    isAuto: true,
    waitMinutes: 15,
    slPipsMax: 40,
    tpPipsTarget: 20,
    newsFilterImpact: 'high',
    newsFilterCountry: 'USD',
    activeStart: '08:00',
    activeEnd: '23:30',
  },
]

const PHASES = [
  {
    name: 'Fase 1: 0-2 Menit',
    icon: <Layers className="size-5" />,
    color: 'text-red-500 bg-red-500/15',
    desc: 'Respon Algoritma/Panik',
    detail: 'Harga melompat acak, spread ekstrem, slippage tinggi. DILARANG MASUK — zona fakeout.',
    rule: 'NO ENTRY',
  },
  {
    name: 'Fase 2: 2-15 Menit',
    icon: <Timer className="size-5" />,
    color: 'text-amber-500 bg-amber-500/15',
    desc: 'Institutional Move (Arah Asli)',
    detail: 'Ekses panik retail dibersihkan. Institusi tempatkan posisi riil sesuai deviasi fundamental.',
    rule: 'ZONA ENTRY UTAMA',
  },
  {
    name: 'Fase 3: 15+ Menit',
    icon: <Clock className="size-5" />,
    color: 'text-sky-500 bg-sky-500/15',
    desc: 'Stabilisasi / Retracement',
    detail: 'Volatilitas mereda, harga kembali ke area teknikal (Support/Resistance).',
    rule: 'HOLD / WATCH',
  },
]

export function StrategyView() {
  const [strategies, setStrategies] = useState<StrategyDef[]>(DEFAULT_STRATEGIES)
  const d = useUIStore((s) => s.density)
  const news = useMarketStore((s) => s.news)
  const mt5 = useMarketStore((s) => s.mt5)

  const toggle = (id: string, field: 'enabled' | 'isAuto') => {
    setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: !s[field] } : s)))
  }
  const update = (id: string, field: keyof StrategyDef, value: any) => {
    setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  return (
    <div className="space-y-4 p-3 md:p-5">
      {/* 3 Fase Pergerakan Berita */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4" /> Anatomi 3 Fase Pergerakan Berita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {PHASES.map((p) => (
              <div key={p.name} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <div className={cn('flex size-9 items-center justify-center rounded-md', p.color)}>{p.icon}</div>
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{p.detail}</p>
                <Badge className={cn('mt-2', p.color.replace('text-', 'bg-').replace(' bg-', '/').replace('15', '500'))}>
                  {p.rule}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daftar strategi */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {strategies.map((s) => (
          <Card key={s.id} className={cn('flex flex-col', !s.enabled && 'opacity-60')}>
            <CardHeader className="flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <div className="text-xs text-muted-foreground">Tipe: {s.type.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Switch checked={s.isAuto} onCheckedChange={() => toggle(s.id, 'isAuto')} disabled={!s.enabled} />
                  <span className="text-xs">Auto</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={s.enabled} onCheckedChange={() => toggle(s.id, 'enabled')} />
                  <span className="text-xs">On</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <p className="text-xs text-muted-foreground">{s.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Symbol</Label>
                  <div className="flex flex-wrap gap-1">
                    {s.symbols.map((sym) => (
                      <Badge key={sym} variant="outline" className="text-[10px]">{sym}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Wait after release</Label>
                  <Input
                    type="number"
                    step="1"
                    value={s.waitMinutes}
                    onChange={(e) => update(s.id, 'waitMinutes', parseInt(e.target.value || '0'))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">SL Max (pips)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={s.slPipsMax}
                    onChange={(e) => update(s.id, 'slPipsMax', parseInt(e.target.value || '0'))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">TP Target (pips)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={s.tpPipsTarget}
                    onChange={(e) => update(s.id, 'tpPipsTarget', parseInt(e.target.value || '0'))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">News Impact</Label>
                  <Select value={s.newsFilterImpact} onValueChange={(v) => update(s.id, 'newsFilterImpact', v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">News Country</Label>
                  <Input value={s.newsFilterCountry} onChange={(e) => update(s.id, 'newsFilterCountry', e.target.value.toUpperCase())} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Active Start</Label>
                  <Input type="time" value={s.activeStart} onChange={(e) => update(s.id, 'activeStart', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Active End</Label>
                  <Input type="time" value={s.activeEnd} onChange={(e) => update(s.id, 'activeEnd', e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between rounded-md border bg-muted/30 p-2 text-xs">
                <span className="text-muted-foreground">Win rate</span>
                <span className="font-medium tabular-nums">— / —</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  disabled={!mt5.connected || !s.enabled || !s.isAuto}
                >
                  <Bot className="size-3" /> Test Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Golden Rules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Golden Rules Risiko Scalping Berita</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-md border p-3">
            <div className="font-semibold text-amber-500">Kurangi Ukuran Lot</div>
            <div className="text-muted-foreground">Potong lot menjadi 50% atau 25% dari ukuran normal saat news volatil.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold text-sky-500">ECN Broker</div>
            <div className="text-muted-foreground">Pastikan akun ECN dengan spread tipis pada majors.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold text-red-500">Hindari Pending Order Pre-News</div>
            <div className="text-muted-foreground">Buy/Sell Stop dekat jam rilis berisiko slippage ekstrem saat likuiditas kosong.</div>
          </div>
        </CardContent>
      </Card>

      {/* Aset characteristics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Karakteristik Aset Saat Rilis Data Makro AS</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-md border p-3">
            <div className="font-semibold">XAU/USD · The Monster</div>
            <div className="text-muted-foreground">Volatilitas tertinggi. NFP/CPI deviasi besar → 50-150 pips dalam 5-15 menit. Rawan slippage, untung terbesar.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">USD/JPY · The Trend Runner</div>
            <div className="text-muted-foreground">Cenderung langsung membentuk tren searah kuat jika data selaras dengan The Fed vs BOJ divergence.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">EUR/USD &amp; GBP/USD · Liquid Majors</div>
            <div className="text-muted-foreground">Pair paling likuid. Spread paling cepat kembali normal setelah menit ke-2. GBP/USD lebih agresif.</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-semibold">Cross-Currency Noise</div>
            <div className="text-muted-foreground">Jika ada berita GBP/EUR bersamaan, volatilitas GBP/USD dan EUR/USD bisa acak. USD/JPY &amp; XAU/USD biasanya lebih bersih.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
