'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Cpu, Send, Sparkles, Trash2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUIStore } from '@/store/ui'
import { useMarketStore } from '@/store/market'
import { cn } from '@/lib/utils'
import type { AiProvider, ChatMessage } from '@/types'
import { toast } from 'sonner'

export function AiAssistantView() {
  const settings = useUIStore((s) => s.settings)
  const setSettings = useUIStore((s) => s.setSettings)
  const news = useMarketStore((s) => s.news)
  const mt5 = useMarketStore((s) => s.mt5)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || busy) return
    setBusy(true)
    const userMsg: ChatMessage = {
      id: 'u_' + Date.now(),
      role: 'user',
      provider: settings.aiProvider ?? 'groq',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((p) => [...p, userMsg])
    const prompt = input.trim()
    setInput('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.aiProvider,
          prompt,
          context: {
            broker: settings.brokerName,
            equity: mt5.equity,
            balance: mt5.balance,
            news: news.slice(0, 5).map((n) => ({ title: n.title, country: n.country, forecast: n.forecast, previous: n.previous, actual: n.actual, time: n.eventTime })),
            mt5Connected: mt5.connected,
          },
        }),
      })
      const data = await res.json()
      const aiMsg: ChatMessage = {
        id: 'a_' + Date.now(),
        role: 'assistant',
        provider: settings.aiProvider ?? 'groq',
        model: data?.model,
        content: data?.content ?? '(tidak ada response)',
        latencyMs: data?.latencyMs,
        tokens: data?.tokens,
        createdAt: new Date().toISOString(),
      }
      setMessages((p) => [...p, aiMsg])
    } catch (e: any) {
      toast.error('AI request gagal: ' + (e?.message ?? 'unknown'))
      const errMsg: ChatMessage = {
        id: 'a_' + Date.now(),
        role: 'assistant',
        provider: settings.aiProvider ?? 'groq',
        content: '(Gagal memanggil AI. Cek kunci API / endpoint local AI pada Settings.)',
        createdAt: new Date().toISOString(),
      }
      setMessages((p) => [...p, errMsg])
    } finally {
      setBusy(false)
    }
  }

  // Quick prompts
  const quickPrompts = [
    'Beri ringkasan 5 berita high-impact terdekat dan dampak ke XAU/USD',
    'Strategi paling aman untuk rilis CPI hari ini dengan equity $' + mt5.equity.toFixed(0),
    'Berdasarkan 3 angka emas, jelaskan reaksi USD jika NFP Actual > Forecast',
    'Hitung lot untuk risk 0.5% equity, SL 30 pips pada XAU/USD',
  ]

  return (
    <div className="grid grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="flex h-[calc(100vh-180px)] flex-col">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> AI Trading Assistant
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={cn('gap-1', settings.aiProvider === 'groq' ? 'border-orange-500/40 text-orange-500' : 'border-sky-500/40 text-sky-500')}>
                {settings.aiProvider === 'groq' ? <Zap className="size-3" /> : <Cpu className="size-3" />}
                {settings.aiProvider === 'groq' ? 'Groq' : 'Local'}
              </Badge>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMessages([])}>
                <Trash2 className="mr-1 size-3" /> Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
              <div className="space-y-3 py-3">
                {messages.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <Bot className="mx-auto mb-2 size-8 text-muted-foreground" />
                    Mulai dengan menanyakan analisa berita, perhitungan lot, atau saran strategi. AI punya konteks akun MT5 Anda.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] rounded-md px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {m.content}
                        {m.latencyMs && (
                          <div className="mt-1 text-[10px] opacity-70">{m.latencyMs}ms · {m.tokens ?? 0} tokens</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya AI: analisa berita, lot sizing, strategi..."
                className="mb-2 min-h-60px resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {quickPrompts.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="rounded border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
                    >
                      {q.slice(0, 40)}…
                    </button>
                  ))}
                </div>
                <Button onClick={send} disabled={busy || !input.trim()} size="sm" className="gap-1">
                  {busy ? <Sparkles className="size-3 animate-pulse" /> : <Send className="size-3" />}
                  {busy ? 'Memproses' : 'Kirim'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Provider AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Active Provider</label>
              <Select
                value={settings.aiProvider ?? 'groq'}
                onValueChange={(v) => setSettings({ aiProvider: v as AiProvider })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groq">
                    <div className="flex items-center gap-2">
                      <Zap className="size-3 text-orange-500" /> Groq AI (cloud)
                    </div>
                  </SelectItem>
                  <SelectItem value="local">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-3 text-sky-500" /> Local AI (Ollama / LM Studio)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              {settings.aiProvider === 'groq' ? (
                <div>
                  <div className="font-semibold text-orange-500">Groq AI</div>
                  <div className="text-muted-foreground">Model: {settings.groqModel ?? 'llama-3.3-70b-versatile'}</div>
                  <div className="text-muted-foreground">API Key: {settings.groqApiKey ? '✓ set' : '⚠ belum diisi (Settings)'}</div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-sky-500">Local AI</div>
                  <div className="text-muted-foreground">Model: {settings.localAiModel ?? 'llama3.1:8b'}</div>
                  <div className="text-muted-foreground">Endpoint: {settings.localAiEndpoint}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Konteks Aktif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span>MT5</span><span>{mt5.connected ? 'Connected' : 'Offline'}</span></div>
            <div className="flex justify-between"><span>Equity</span><span className="tabular-nums">${mt5.equity.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Balance</span><span className="tabular-nums">${mt5.balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>News di cache</span><span className="tabular-nums">{news.length}</span></div>
            <div className="flex justify-between"><span>Risk per trade</span><span className="tabular-nums">{settings.riskPerTradePct}%</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
