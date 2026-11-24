'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GroqModelInfo {
  id: string
  label?: string
  contextWindow?: number
  maxTokens?: number
  ownedBy?: string
}

interface Props {
  apiKey: string
  model: string
  customModel: string
  useCustom: boolean
  onChange: (k: 'groqApiKey' | 'groqModel' | 'groqCustomModel', v: string) => void
  onToggleUseCustom: (v: boolean) => void
  // tambah field useCustom di settings
}

export function ModelSelectorGroq({ apiKey, model, customModel, useCustom, onChange, onToggleUseCustom }: Props) {
  const [models, setModels] = useState<GroqModelInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState<'preset' | 'api' | null>(null)
  const [testBusy, setTestBusy] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchModels = async () => {
    setBusy(true)
    try {
      const url = `/api/ai/models?provider=groq${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setModels(data.models ?? [])
      setSource(data.source ?? 'preset')
      if (data.ok) toast.success(`${data.models.length} model Groq di-fetch`)
      else toast.info(data.msg ?? 'Menggunakan preset models')
    } catch (e: any) {
      toast.error('Gagal fetch model')
    } finally {
      setBusy(false)
    }
  }

  const testConnection = async () => {
    setTestBusy(true)
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_groq', apiKey, model: useCustom ? customModel : model }),
      })
      const data = await res.json()
      setTestResult({ ok: data.ok, msg: data.ok ? `OK: ${data.content}` : data.msg })
      if (data.ok) toast.success('Groq connection OK')
      else toast.error(data.msg ?? 'Test gagal')
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message ?? 'Unknown' })
      toast.error('Test gagal')
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Zap className="size-4 text-orange-500" /> Groq AI (cloud)</span>
          <Badge variant="outline" className="text-xs text-orange-500">
            {source === 'api' ? 'Live API' : source === 'preset' ? 'Preset' : 'Not fetched'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Groq API Key</Label>
          <div className="flex gap-1">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => onChange('groqApiKey', e.target.value)}
              placeholder="gsk_..."
              className="h-9 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={fetchModels} disabled={busy} className="h-9 gap-1 text-xs">
              {busy ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Fetch Models
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <Switch checked={useCustom} onCheckedChange={onToggleUseCustom} className="scale-75" />
          <Label className="text-xs">Gunakan custom model (di luar list)</Label>
        </div>

        {useCustom ? (
          <div>
            <Label className="text-xs">Custom Model ID</Label>
            <Input
              value={customModel}
              onChange={(e) => onChange('groqCustomModel', e.target.value)}
              placeholder="custom-model-id"
              className="h-9 font-mono text-xs"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">Untuk model baru yang belum ada di list Groq</div>
          </div>
        ) : (
          <div>
            <Label className="text-xs">Model</Label>
            <Select value={model} onValueChange={(v) => onChange('groqModel', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(models.length > 0 ? models : GROQ_FALLBACK).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono text-xs">{m.id}</span>
                      {m.contextWindow ? (
                        <Badge variant="outline" className="text-[10px]">
                          {(m.contextWindow / 1000).toFixed(0)}K ctx
                        </Badge>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const cur = (models.length > 0 ? models : GROQ_FALLBACK).find((m) => m.id === model)
              if (!cur) return null
              return (
                <div className="mt-2 rounded-md border bg-muted/30 p-2 text-[10px] text-muted-foreground">
                  <div className="font-medium text-foreground">{cur.label ?? cur.id}</div>
                  {cur.ownedBy && <div>Owned by: {cur.ownedBy}</div>}
                  {cur.contextWindow && <div>Context: {cur.contextWindow.toLocaleString()} tokens</div>}
                  {cur.maxTokens && <div>Max output: {cur.maxTokens.toLocaleString()} tokens</div>}
                </div>
              )
            })()}
          </div>
        )}

        <Button onClick={testConnection} disabled={testBusy || !apiKey} size="sm" variant="default" className="w-full gap-1">
          {testBusy ? <RefreshCw className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          Test Connection
        </Button>
        {testResult && (
          <div className={cn(
            'rounded-md border p-2 text-xs',
            testResult.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'border-red-500/40 bg-red-500/10 text-red-500',
          )}>
            {testResult.msg.slice(0, 200)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const GROQ_FALLBACK: GroqModelInfo[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', contextWindow: 128000, maxTokens: 32768, ownedBy: 'Meta' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', contextWindow: 128000, maxTokens: 8000, ownedBy: 'Meta' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B 32768', contextWindow: 32768, maxTokens: 32768, ownedBy: 'Mistral' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B IT', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Google' },
]
