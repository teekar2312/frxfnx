'use client'

import { useState } from 'react'
import { Cpu, Download, RefreshCw, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { LocalAiType } from '@/types'

interface LocalModelInfo {
  id: string
  label?: string
  size?: number
  quantization?: string
  modifiedAt?: string
  ownedBy?: string
}

interface Props {
  type: LocalAiType
  endpoint: string
  model: string
  customModel: string
  useCustom: boolean
  onChange: (k: 'localAiType' | 'localAiEndpoint' | 'localAiModel' | 'localAiCustomModel', v: string) => void
  onToggleUseCustom: (v: boolean) => void
}

// Default endpoints per provider type
const DEFAULT_ENDPOINTS: Record<LocalAiType, string> = {
  ollama: 'http://127.0.0.1:11434/api/generate',
  lmstudio: 'http://127.0.0.1:1234/v1/chat/completions',
  vllm: 'http://127.0.0.1:8000/v1/chat/completions',
  llamacpp: 'http://127.0.0.1:8080/completion',
  custom: '',
}

// Suggested popular Ollama models untuk pull
const SUGGESTED_OLLAMA_MODELS = [
  { id: 'llama3.1:8b', label: 'Llama 3.1 8B (4.7 GB)' },
  { id: 'llama3.3:70b', label: 'Llama 3.3 70B (40 GB)' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B (4.5 GB)' },
  { id: 'qwen2.5:14b', label: 'Qwen 2.5 14B (9 GB)' },
  { id: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (4.9 GB)' },
  { id: 'deepseek-r1:14b', label: 'DeepSeek R1 14B (9 GB)' },
  { id: 'mistral:7b', label: 'Mistral 7B (4.1 GB)' },
  { id: 'phi3:mini', label: 'Phi-3 Mini 3.8B (2.5 GB)' },
  { id: 'gemma2:9b', label: 'Gemma 2 9B (5.5 GB)' },
  { id: 'codellama:7b', label: 'Code Llama 7B (3.8 GB)' },
]

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let b = bytes
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++ }
  return `${b.toFixed(1)} ${units[i]}`
}

export function ModelSelectorLocal({ type, endpoint, model, customModel, useCustom, onChange, onToggleUseCustom }: Props) {
  const [models, setModels] = useState<LocalModelInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [pullBusy, setPullBusy] = useState<string | null>(null)
  const [testBusy, setTestBusy] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchModels = async () => {
    setBusy(true)
    try {
      const url = `/api/ai/models?provider=local&type=${type}&endpoint=${encodeURIComponent(endpoint)}`
      const res = await fetch(url)
      const data = await res.json()
      setModels(data.models ?? [])
      if (data.ok) toast.success(`${data.models.length} model tersedia`)
      else toast.info(data.msg ?? 'Gagal fetch')
    } catch (e: any) {
      toast.error('Gagal fetch model')
    } finally {
      setBusy(false)
    }
  }

  const pullModel = async (modelId: string) => {
    setPullBusy(modelId)
    try {
      // Kirim endpoint apa adanya — route akan transformasi regex ke /api/pull
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull_ollama', endpoint, model: modelId }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Pull ${modelId} selesai`)
        fetchModels()
      } else {
        toast.info(data.msg ?? `Pull gagal. Jalankan manual: ollama pull ${modelId}`)
      }
    } catch (e: any) {
      toast.error(`Pull error. Jalankan manual: ollama pull ${modelId}`)
    } finally {
      setPullBusy(null)
    }
  }

  const testConnection = async () => {
    setTestBusy(true)
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_local', endpoint, model: useCustom ? customModel : model }),
      })
      const data = await res.json()
      setTestResult({ ok: data.ok, msg: data.ok ? `OK: ${data.content}` : data.msg })
      if (data.ok) toast.success('Local AI connection OK')
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
          <span className="flex items-center gap-2"><Cpu className="size-4 text-sky-500" /> Local AI (offline)</span>
          <Badge variant="outline" className="text-xs text-sky-500 capitalize">{type}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Tipe Local AI</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              onChange('localAiType', v)
              // Auto-set default endpoint kalau user belum customize
              const defEp = DEFAULT_ENDPOINTS[v as LocalAiType]
              if (defEp && (!endpoint || Object.values(DEFAULT_ENDPOINTS).includes(endpoint))) {
                onChange('localAiEndpoint', defEp)
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama (recommended, simple)</SelectItem>
              <SelectItem value="lmstudio">LM Studio (GUI, OpenAI-compatible)</SelectItem>
              <SelectItem value="vllm">vLLM (high-throughput server)</SelectItem>
              <SelectItem value="llamacpp">llama.cpp (lightweight)</SelectItem>
              <SelectItem value="custom">Custom (set endpoint manual)</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {type === 'ollama' && 'Install dari ollama.com. Endpoint default /api/generate.'}
            {type === 'lmstudio' && 'GUI app di lmstudio.ai. Aktifkan "Local Server".'}
            {type === 'vllm' && 'Python server: vllm serve --model <path>. Untuk GPU server.'}
            {type === 'llamacpp' && 'C++ binary, sangat ringan. Run: ./server -m model.gguf'}
            {type === 'custom' && 'Untuk server LLM lain (OpenAI-compatible atau custom).'}
          </div>
        </div>

        <div>
          <Label className="text-xs">Endpoint</Label>
          <div className="flex gap-1">
            <Input
              value={endpoint}
              onChange={(e) => onChange('localAiEndpoint', e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder={DEFAULT_ENDPOINTS[type] || 'http://127.0.0.1:...'}
            />
            <Button size="sm" variant="outline" onClick={fetchModels} disabled={busy} className="h-9 gap-1 text-xs">
              {busy ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Fetch
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
              onChange={(e) => onChange('localAiCustomModel', e.target.value)}
              placeholder="model-id"
              className="h-9 font-mono text-xs"
            />
          </div>
        ) : (
          <div>
            <Label className="text-xs">Model</Label>
            <Select value={model} onValueChange={(v) => onChange('localAiModel', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.length === 0 ? (
                  <SelectItem value={model} disabled>(Belum ada model — fetch atau pilih dari suggested)</SelectItem>
                ) : (
                  models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-mono text-xs">{m.id}</span>
                        {m.size && <Badge variant="outline" className="text-[10px]">{formatBytes(m.size)}</Badge>}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {(() => {
              const cur = models.find((m) => m.id === model)
              if (!cur) return null
              return (
                <div className="mt-2 rounded-md border bg-muted/30 p-2 text-[10px] text-muted-foreground">
                  {cur.ownedBy && <div>Family: {cur.ownedBy}</div>}
                  {cur.quantization && <div>Quantization: {cur.quantization}</div>}
                  {cur.modifiedAt && <div>Modified: {new Date(cur.modifiedAt).toLocaleDateString('id-ID')}</div>}
                </div>
              )
            })()}
          </div>
        )}

        {type === 'ollama' && (
          <div>
            <Label className="text-xs">Suggested Models untuk Pull</Label>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
              {SUGGESTED_OLLAMA_MODELS.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant="outline"
                  className="h-auto flex-col items-start p-2 text-left"
                  onClick={() => pullModel(m.id)}
                  disabled={pullBusy === m.id}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="font-mono text-[10px]">{m.id}</span>
                    {pullBusy === m.id ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{m.label}</span>
                </Button>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Untuk production, jalankan <code className="rounded bg-muted px-1">ollama pull &lt;model&gt;</code> di Windows 11 terminal.
            </div>
          </div>
        )}

        <Button onClick={testConnection} disabled={testBusy || !endpoint} size="sm" variant="default" className="w-full gap-1">
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
