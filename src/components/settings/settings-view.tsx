'use client'

import { useEffect, useState } from 'react'
import { Save, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useUIStore } from '@/store/ui'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { DEFAULT_HOTKEYS } from '@/lib/hotkeys'
import { useVault } from '@/lib/vault'
import { TRADING_SESSIONS, SESSION_ALL, getSession, isSessionActive, formatSessionHours, volatilityLabel, type SessionId, type TradingSession } from '@/lib/mt5/sessions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AiProvider, LocalAiType } from '@/types'
import { ModelSelectorGroq } from '@/components/ai/model-selector-groq'
import { ModelSelectorLocal } from '@/components/ai/model-selector-local'

export function SettingsView() {
  const settings = useUIStore((s) => s.settings)
  const setSettings = useUIStore((s) => s.setSettings)

  const [draft, setDraft] = useState(settings)

  const save = () => {
    setSettings(draft)
    toast.success('Settings disimpan')
  }

  const update = (k: keyof typeof draft, v: any) => setDraft((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <SettingsIcon className="size-5" /> Settings
        </h2>
        <Button onClick={save} className="gap-1">
          <Save className="size-4" /> Simpan
        </Button>
      </div>

      <Tabs defaultValue="mt5">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
          <TabsTrigger value="mt5" className="text-xs">MT5 / Broker</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs">Jadwal</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI Providers</TabsTrigger>
          <TabsTrigger value="news" className="text-xs">News API</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
          <TabsTrigger value="vault" className="text-xs">API Vault</TabsTrigger>
          <TabsTrigger value="autotrade" className="text-xs">Auto-Trade</TabsTrigger>
        </TabsList>

        <TabsContent value="mt5" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">MT5 & Broker (FINEX Indonesia)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Broker Name</Label>
                <Input value={draft.brokerName ?? ''} onChange={(e) => update('brokerName', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">MT5 Server</Label>
                <Input value={draft.mt5Server ?? ''} onChange={(e) => update('mt5Server', e.target.value)} className="h-9" placeholder="FINEX-Live" />
              </div>
              <div>
                <Label className="text-xs">MT5 Login (account number)</Label>
                <Input value={draft.mt5Login ?? ''} onChange={(e) => update('mt5Login', e.target.value)} className="h-9 tabular-nums" placeholder="12345678" />
              </div>
              <div>
                <Label className="text-xs">MT5 Password</Label>
                <Input type="password" value={draft.mt5Password ?? ''} onChange={(e) => update('mt5Password', e.target.value)} className="h-9" placeholder="••••••" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Path terminal64.exe (Windows 11)</Label>
                <Input
                  value={draft.mt5Path ?? ''}
                  onChange={(e) => update('mt5Path', e.target.value)}
                  className="h-9 font-mono text-xs"
                  placeholder="C:\\Program Files\\FINEX Indonesia\\MetaTrader 5\\terminal64.exe"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch checked={draft.mt5AutoLaunch ?? false} onCheckedChange={(v) => update('mt5AutoLaunch', v)} />
                <Label className="text-xs">Auto-launch MT5 jika belum running (Windows 11 + VS Code)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <ScheduleTab draft={draft} update={update} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="space-y-4">
            {/* Active Provider Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={draft.aiProvider ?? 'groq'} onValueChange={(v) => update('aiProvider', v as AiProvider)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groq">Groq AI (cloud, fast, needs API key)</SelectItem>
                    <SelectItem value="local">Local AI (offline, free, privacy)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">
                  {draft.aiProvider === 'groq'
                    ? 'Untuk demo tanpa API key, AI Assistant akan berikan respons mock dengan strategi 15-Min Breakout.'
                    : 'Pastikan Ollama/LM Studio/vLLM running di Windows 11 Anda. Test connection sebelum pakai.'}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ModelSelectorGroq
                apiKey={draft.groqApiKey ?? ''}
                model={draft.groqModel ?? 'llama-3.3-70b-versatile'}
                customModel={draft.groqCustomModel ?? ''}
                useCustom={(draft.groqModel ?? '').startsWith('__custom__')}
                onChange={(k, v) => update(k as any, v)}
                onToggleUseCustom={(v) => {
                  if (v) update('groqModel', '__custom__' + (draft.groqCustomModel ?? ''))
                  else update('groqModel', 'llama-3.3-70b-versatile')
                }}
              />
              <ModelSelectorLocal
                type={(draft.localAiType ?? 'ollama') as LocalAiType}
                endpoint={draft.localAiEndpoint ?? ''}
                model={draft.localAiModel ?? 'llama3.1:8b'}
                customModel={draft.localAiCustomModel ?? ''}
                useCustom={(draft.localAiModel ?? '').startsWith('__custom__')}
                onChange={(k, v) => update(k as any, v)}
                onToggleUseCustom={(v) => {
                  if (v) update('localAiModel', '__custom__' + (draft.localAiCustomModel ?? ''))
                  else update('localAiModel', 'llama3.1:8b')
                }}
              />
            </div>

            {/* Comparison card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Groq vs Local AI — Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground">
                      <th className="text-left py-1">Aspek</th>
                      <th className="text-left py-1">Groq (cloud)</th>
                      <th className="text-left py-1">Local (Ollama)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-1.5 font-medium">Latency</td><td>~200-500ms (LPU)</td><td>1-10s (CPU/GPU lokal)</td></tr>
                    <tr className="border-b"><td className="py-1.5 font-medium">Cost</td><td>Free tier besar, pay-as-you-go</td><td>Free (offline)</td></tr>
                    <tr className="border-b"><td className="py-1.5 font-medium">Privacy</td><td>Data terkirim ke Groq</td><td>100% lokal</td></tr>
                    <tr className="border-b"><td className="py-1.5 font-medium">Model Quality</td><td>Llama 3.3 70B (terbaik)</td><td>Tergantung model pull (7B-70B)</td></tr>
                    <tr className="border-b"><td className="py-1.5 font-medium">Setup</td><td>Daftar + API key</td><td>Install Ollama + pull model</td></tr>
                    <tr className="border-b"><td className="py-1.5 font-medium">Best for</td><td>Real-time analysis, news</td><td>Privacy, offline, custom model</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tiingo News & Forex Calendar API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Tiingo API Key</Label>
                <Input type="password" value={draft.tiingoApiKey ?? ''} onChange={(e) => update('tiingoApiKey', e.target.value)} placeholder="..." className="h-9 font-mono text-xs" />
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Endpoint Tiingo:</div>
                <ul className="mt-1 list-disc pl-4">
                  <li><code>https://api.tiingo.com/tiingo/news</code> — headline + tags</li>
                  <li><code>https://api.tiingo.com/tiingo/fundamentals/...</code> — economic data</li>
                </ul>
                <div className="mt-2">API key disimpan lokal di browser (zustand persist). Tidak dikirim ke server kami.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Default Risk Parameters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">Risk per trade (%)</Label>
                <Input type="number" step="0.05" value={draft.riskPerTradePct ?? 0.5} onChange={(e) => update('riskPerTradePct', parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Daily Stop (%)</Label>
                <Input type="number" step="0.5" value={draft.dailyStopPct ?? 3} onChange={(e) => update('dailyStopPct', parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Weekly Stop (%)</Label>
                <Input type="number" step="0.5" value={draft.weeklyStopPct ?? 5} onChange={(e) => update('weeklyStopPct', parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Max Leverage Ratio</Label>
                <Input type="number" step="1" value={draft.maxLeverageRatio ?? 5} onChange={(e) => update('maxLeverageRatio', parseFloat(e.target.value) || 1)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Max Margin Usage (%)</Label>
                <Input type="number" step="1" value={draft.maxMarginUsagePct ?? 30} onChange={(e) => update('maxMarginUsagePct', parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
              <div>
                <Label className="text-xs">Min R:R</Label>
                <Input type="number" step="0.1" value={draft.rrMin ?? 1.5} onChange={(e) => update('rrMin', parseFloat(e.target.value) || 0)} className="h-9 tabular-nums" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault" className="mt-4">
          <ApiVaultTab />
        </TabsContent>

        <TabsContent value="autotrade" className="mt-4">
          <AutoTradeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ApiVaultTab() {
  const [groq, setGroq] = useState('')
  const [tiingo, setTiingo] = useState('')
  const [local, setLocal] = useState('')
  const { vault, saveKey, deleteKey, saveToKeychain } = useVault()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">API Key Vault</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Groq API Key</Label>
            <div className="flex gap-1">
              <Input type="password" value={groq} onChange={(e) => setGroq(e.target.value)} placeholder={vault.find((v) => v.provider === 'groq')?.masked ?? 'gsk_...'} className="h-9 text-xs" />
              <Button size="sm" onClick={() => { saveKey('groq', groq); setGroq(''); toast.success('Groq key saved') }}>Save</Button>
              <Button size="sm" variant="outline" onClick={async () => { await saveToKeychain('groq', groq); toast.success('Saved to Windows Credential Manager (stub)') }}>Keychain</Button>
              {vault.find((v) => v.provider === 'groq') && (
                <Button size="sm" variant="ghost" onClick={() => { deleteKey('groq'); toast.success('Groq key deleted') }}>
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Tiingo API Key</Label>
            <div className="flex gap-1">
              <Input type="password" value={tiingo} onChange={(e) => setTiingo(e.target.value)} placeholder={vault.find((v) => v.provider === 'tiingo')?.masked ?? 'tiingo-...'} className="h-9 text-xs" />
              <Button size="sm" onClick={() => { saveKey('tiingo', tiingo); setTiingo(''); toast.success('Tiingo key saved') }}>Save</Button>
              {vault.find((v) => v.provider === 'tiingo') && (
                <Button size="sm" variant="ghost" onClick={() => { deleteKey('tiingo'); toast.success('Tiingo key deleted') }}>
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Local AI (Ollama) — no key needed</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="http://127.0.0.1:11434" className="h-9 text-xs" />
          </div>
          <div className="rounded-md border bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            Catatan: untuk produksi di Windows 11, gunakan tombol Keychain untuk simpan di Windows Credential Manager (perlu Python backend dengan keytar).
            Saat ini keys disimpan di localStorage (terenkripsi seadanya).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hot Keys Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-muted-foreground">
                <th className="text-left py-1">Key</th>
                <th className="text-left py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_HOTKEYS.map((hk) => (
                <tr key={hk.key} className="border-b last:border-b-0">
                  <td className="py-1.5"><kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{hk.key}</kbd></td>
                  <td className="py-1.5">{hk.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-[10px] text-muted-foreground">Hot keys aktif saat fokus tidak di input/textarea.</div>
        </CardContent>
      </Card>
    </div>
  )
}

function AutoTradeTab() {
  const rules = useExtMarketStore((s) => s.autoTradeRules)
  const { setAutoTradeRules } = useMt5Socket()
  const [localRules, setLocalRules] = useState(rules)

  useEffect(() => { setLocalRules(rules) }, [rules])

  const update = (id: string, field: keyof typeof localRules[0], value: any) => {
    const updated = localRules.map((r) => r.id === id ? { ...r, [field]: value } : r)
    setLocalRules(updated)
    // Optimistic: update global store juga (bukan hanya socket) agar UI lain yang subscribe juga update
    useExtMarketStore.getState().setAutoTradeRules(updated)
    setAutoTradeRules(updated)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Auto-Trade Rules (Pre-News Flatten & Stop Loss)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {localRules.map((r) => (
          <div key={r.id} className="rounded-md border p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, 'enabled', v)} />
                <span className="font-medium">{r.name}</span>
                <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">{r.flattenAction}</span>
            </div>
            {r.type === 'pre_news_flatten' && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Minutes before</Label>
                  <Input type="number" min="1" max="60" value={r.minutesBefore ?? 2} onChange={(e) => update(r.id, 'minutesBefore', parseInt(e.target.value))} className="h-7 text-xs tabular-nums" />
                </div>
                <div>
                  <Label className="text-[10px]">Impact</Label>
                  <Select value={r.impactFilter ?? 'high'} onValueChange={(v) => update(r.id, 'impactFilter', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Country</Label>
                  <Input value={r.countryFilter ?? 'USD'} onChange={(e) => update(r.id, 'countryFilter', e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="rounded-md border bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          Saat enabled, sistem otomatis akan <strong>flatten semua posisi</strong> saat kondisi terpenuhi. Pastikan Anda memahami risikonya.
        </div>
      </CardContent>
    </Card>
  )
}

// Schedule Tab dengan pemilihan sesi trading
function ScheduleTab({ draft, update }: { draft: any; update: (k: any, v: any) => void }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const sessions = [SESSION_ALL, ...TRADING_SESSIONS]
  const selectedSession = getSession((draft.tradingSession ?? 'all') as SessionId)
  const useManualWindow = (draft.tradingSession ?? 'all') === 'all'

  return (
    <div className="space-y-4">
      {/* Pilih sesi trading */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Pemilihan Sesi Trading</span>
            {now && (
              <Badge variant="outline" className="text-xs">
                WIB: {String((now.getUTCHours() + 7) % 24).padStart(2, '0')}:{String(now.getUTCMinutes()).padStart(2, '0')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => {
              const isActive = now && isSessionActive(s, now)
              const isSelected = (draft.tradingSession ?? 'all') === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => update('tradingSession', s.id)}
                  className={cn(
                    'rounded-md border p-3 text-left transition-all',
                    isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-foreground/20',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-sm font-semibold">{s.name}</span>
                    </div>
                    {isActive && (
                      <Badge className="bg-emerald-500 text-white text-[10px]">ACTIVE</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatSessionHours(s)} · {s.region}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Volatilitas:</span>
                    <span className={volatilityLabel(s.volatility).color}>{volatilityLabel(s.volatility).label}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.primaryPairs.slice(0, 3).map((p) => (
                      <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Sesi dipilih: {selectedSession.name}</span>
            <p className="mt-1">{selectedSession.description}</p>
            <p className="mt-1">Jam aktif: {formatSessionHours(selectedSession)}</p>
            {selectedSession.cities.length > 1 && (
              <p className="mt-1">Kota: {selectedSession.cities.join(', ')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual window (fallback) — hanya aktif jika session = 'all' */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Manual Window (fallback untuk mode "Semua Sesi")</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Trading Start (HH:MM)</Label>
            <Input
              type="time"
              value={draft.tradingStart ?? '08:00'}
              onChange={(e) => update('tradingStart', e.target.value)}
              className="h-9"
              disabled={!useManualWindow}
            />
          </div>
          <div>
            <Label className="text-xs">Trading End (HH:MM)</Label>
            <Input
              type="time"
              value={draft.tradingEnd ?? '23:30'}
              onChange={(e) => update('tradingEnd', e.target.value)}
              className="h-9"
              disabled={!useManualWindow}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Switch checked={draft.blockWeekend ?? true} onCheckedChange={(v) => update('blockWeekend', v)} />
            <Label className="text-xs">Blokir trading Sabtu &amp; Minggu (sangat disarankan)</Label>
          </div>
          <div className="md:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            {useManualWindow
              ? 'Mode "Semua Sesi" aktif. Trading dibatasi oleh Manual Window di atas (jam Indonesia).'
              : `Mode sesi "${selectedSession.shortName}" aktif. Manual Window diabaikan. Trading hanya diizinkan saat sesi ${selectedSession.shortName} aktif (${formatSessionHours(selectedSession)}).`}
          </div>
        </CardContent>
      </Card>

      {/* Visualisasi timeline 24 jam */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timeline 24 Jam (WIB)</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionTimeline sessions={TRADING_SESSIONS} now={now} selectedId={draft.tradingSession ?? 'all'} />
        </CardContent>
      </Card>
    </div>
  )
}

// Visualisasi timeline 24 jam menampilkan semua sesi
function SessionTimeline({ sessions, now, selectedId }: { sessions: TradingSession[]; now: Date | null; selectedId: string }) {
  const currentHour = now ? (now.getUTCHours() + 7) % 24 + (now.getUTCMinutes() / 60) : 0
  return (
    <div className="space-y-2">
      {/* Hour scale */}
      <div className="relative h-6 w-full">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {Array.from({ length: 25 }).map((_, h) => (
            <span key={h} className={h % 6 === 0 ? 'font-medium' : ''}>
              {h === 24 ? '24' : String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      {/* Sessions bars */}
      <div className="relative h-32 w-full rounded-md border bg-muted/20">
        {/* Current time indicator */}
        {now && (
          <div
            className="absolute top-0 bottom-0 z-10 w-0.5 bg-foreground"
            style={{ left: `${(currentHour / 24) * 100}%` }}
          >
            <div className="absolute -top-3 -translate-x-1/2 rounded bg-foreground px-1 text-[9px] text-background">
              NOW
            </div>
          </div>
        )}
        {/* Sessions as bars */}
        {sessions.map((s, i) => {
          const top = i * 16 + 4
          let leftPct = (s.startHour / 24) * 100
          let widthPct = ((s.endHour - s.startHour) / 24) * 100
          // Handle cross-midnight (NY: 20-29)
          if (s.crossMidnight) {
            // Two segments: startHour-24 and 0-(endHour-24)
            return (
              <div key={s.id} style={{ top }} className="absolute h-3">
                <div
                  className={cn(
                    'absolute h-3 rounded',
                    selectedId === s.id && 'ring-1 ring-foreground',
                  )}
                  style={{ left: `${leftPct}%`, width: `${(24 - s.startHour) / 24 * 100}%`, background: s.color }}
                  title={`${s.name} (${formatSessionHours(s)})`}
                />
                <div
                  className={cn(
                    'absolute h-3 rounded',
                    selectedId === s.id && 'ring-1 ring-foreground',
                  )}
                  style={{ left: 0, width: `${(s.endHour - 24) / 24 * 100}%`, background: s.color }}
                />
                <span className="absolute left-1 top-3 text-[9px] font-medium">{s.shortName}</span>
              </div>
            )
          }
          return (
            <div key={s.id} className="absolute h-3" style={{ top, left: `${leftPct}%`, width: `${widthPct}%` }}>
              <div
                className={cn(
                  'h-3 rounded',
                  selectedId === s.id && 'ring-1 ring-foreground',
                )}
                style={{ background: s.color }}
                title={`${s.name} (${formatSessionHours(s)})`}
              />
              <span className="absolute left-1 top-3 text-[9px] font-medium">{s.shortName}</span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <span className="size-2 rounded" style={{ background: s.color }} />
            <span>{s.shortName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
