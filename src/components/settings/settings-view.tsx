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
import { toast } from 'sonner'
import type { AiProvider } from '@/types'

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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jadwal Trading</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Trading Start (HH:MM)</Label>
                <Input type="time" value={draft.tradingStart ?? '08:00'} onChange={(e) => update('tradingStart', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Trading End (HH:MM)</Label>
                <Input type="time" value={draft.tradingEnd ?? '23:30'} onChange={(e) => update('tradingEnd', e.target.value)} className="h-9" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch checked={draft.blockWeekend ?? true} onCheckedChange={(v) => update('blockWeekend', v)} />
                <Label className="text-xs">Blokir trading Sabtu &amp; Minggu (sangat disarankan)</Label>
              </div>
              <div className="md:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                Catatan: Pasar forex ditutup Sabtu &amp; Minggu. Trading tetap diizinkan pada hari kerja sesuai jendela waktu di atas.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Groq AI (cloud)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Groq API Key</Label>
                  <Input type="password" value={draft.groqApiKey ?? ''} onChange={(e) => update('groqApiKey', e.target.value)} placeholder="gsk_..." className="h-9 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Select value={draft.groqModel ?? 'llama-3.3-70b-versatile'} onValueChange={(v) => update('groqModel', v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</SelectItem>
                      <SelectItem value="llama-3.1-8b-instant">llama-3.1-8b-instant</SelectItem>
                      <SelectItem value="mixtral-8x7b-32768">mixtral-8x7b-32768</SelectItem>
                      <SelectItem value="gemma2-9b-it">gemma2-9b-it</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Local AI (Ollama / LM Studio)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Endpoint</Label>
                  <Input value={draft.localAiEndpoint ?? ''} onChange={(e) => update('localAiEndpoint', e.target.value)} className="h-9 font-mono text-xs" placeholder="http://127.0.0.1:11434/api/generate" />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input value={draft.localAiModel ?? ''} onChange={(e) => update('localAiModel', e.target.value)} className="h-9 font-mono text-xs" placeholder="llama3.1:8b" />
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={draft.aiProvider ?? 'groq'} onValueChange={(v) => update('aiProvider', v as AiProvider)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groq">Groq AI</SelectItem>
                    <SelectItem value="local">Local AI</SelectItem>
                  </SelectContent>
                </Select>
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
  const { saveKey, getVault, maskKey, deleteKey, saveToKeychain } = useVault()

  const vault = getVault()

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
