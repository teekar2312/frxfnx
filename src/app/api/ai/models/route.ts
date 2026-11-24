import { NextRequest, NextResponse } from 'next/server'

// GET /api/ai/models?provider=groq&apiKey=...
// GET /api/ai/models?provider=local&type=ollama&endpoint=http://127.0.0.1:11434
//
// Fetch daftar model dari Groq (GET https://api.groq.com/openai/v1/models)
// atau dari Ollama (GET /api/tags), LM Studio (GET /v1/models), vLLM (GET /v1/models)

export interface ModelInfo {
  id: string
  label?: string
  contextWindow?: number   // tokens
  maxTokens?: number        // max output tokens
  ownedBy?: string
  // Local AI specific
  size?: number             // bytes (Ollama)
  quantization?: string     // Q4_K_M etc
  modifiedAt?: string
}

const GROQ_PRESET_MODELS: ModelInfo[] = [
  // Latest Groq production models (per Nov 2025)
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', contextWindow: 128000, maxTokens: 32768, ownedBy: 'Meta' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', contextWindow: 128000, maxTokens: 8000, ownedBy: 'Meta' },
  { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile', contextWindow: 131072, maxTokens: 32768, ownedBy: 'Meta' },
  { id: 'llama3-70b-8192', label: 'Llama 3 70B 8192', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Meta' },
  { id: 'llama3-8b-8192', label: 'Llama 3 8B 8192', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Meta' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B 32768', contextWindow: 32768, maxTokens: 32768, ownedBy: 'Mistral' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B IT', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Google' },
  { id: 'gemma-7b-it', label: 'Gemma 7B IT', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Google' },
  // Whisper for audio (not used here but supported)
  { id: 'whisper-large-v3', label: 'Whisper Large v3 (audio only)', contextWindow: 0, maxTokens: 0, ownedBy: 'OpenAI' },
  { id: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo', contextWindow: 0, maxTokens: 0, ownedBy: 'OpenAI' },
  // Llama Guard (moderation)
  { id: 'llama-guard-3-8b', label: 'Llama Guard 3 8B (moderation)', contextWindow: 8192, maxTokens: 8192, ownedBy: 'Meta' },
]

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') ?? 'groq'
  const apiKey = url.searchParams.get('apiKey') ?? process.env.GROQ_API_KEY
  const type = url.searchParams.get('type') ?? 'ollama'
  const endpoint = url.searchParams.get('endpoint') ?? ''

  if (provider === 'groq') {
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        msg: 'Groq API key belum di-set. Mengembalikan preset models.',
        models: GROQ_PRESET_MODELS,
        source: 'preset',
      })
    }
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          msg: `Groq API error ${res.status}: ${await res.text()}`,
          models: GROQ_PRESET_MODELS,
          source: 'preset',
        })
      }
      const data = await res.json()
      // data.data = array of {id, object, owned_by, created, active}
      const models: ModelInfo[] = (data.data ?? []).map((m: any) => {
        const preset = GROQ_PRESET_MODELS.find((p) => p.id === m.id)
        return {
          id: m.id,
          label: preset?.label ?? m.id,
          contextWindow: preset?.contextWindow,
          maxTokens: preset?.maxTokens,
          ownedBy: m.owned_by ?? preset?.ownedBy,
        }
      })
      return NextResponse.json({
        ok: true,
        models: models.length > 0 ? models : GROQ_PRESET_MODELS,
        source: models.length > 0 ? 'api' : 'preset',
      })
    } catch (e: any) {
      return NextResponse.json({
        ok: false,
        msg: `Gagal fetch Groq: ${e?.message ?? e}`,
        models: GROQ_PRESET_MODELS,
        source: 'preset',
      })
    }
  }

  // Local AI
  if (!endpoint) {
    return NextResponse.json({ ok: false, msg: 'Endpoint belum di-set', models: [] })
  }

  try {
    if (type === 'ollama') {
      // Ollama: GET /api/tags
      const tagsUrl = endpoint.replace(/\/api\/generate$/, '/api/tags').replace(/\/$/, '/api/tags')
      const res = await fetch(tagsUrl, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        return NextResponse.json({ ok: false, msg: `Ollama error ${res.status}`, models: [] })
      }
      const data = await res.json()
      const models: ModelInfo[] = (data.models ?? []).map((m: any) => ({
        id: m.name,
        label: m.name,
        size: m.size,
        quantization: m.details?.quantization_level,
        modifiedAt: m.modified_at,
        ownedBy: m.details?.family,
      }))
      return NextResponse.json({ ok: true, models, source: 'api' })
    } else if (type === 'lmstudio' || type === 'vllm') {
      // LM Studio and vLLM expose OpenAI-compatible GET /v1/models
      const baseUrl = endpoint.replace(/\/v1\/.*$/, '/v1').replace(/\/$/, '') + '/models'
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        return NextResponse.json({ ok: false, msg: `${type} error ${res.status}`, models: [] })
      }
      const data = await res.json()
      const models: ModelInfo[] = (data.data ?? []).map((m: any) => ({
        id: m.id,
        label: m.id,
        ownedBy: m.owned_by,
      }))
      return NextResponse.json({ ok: true, models, source: 'api' })
    } else if (type === 'llamacpp') {
      // llama.cpp server has /health endpoint; model biasanya fixed di startup
      // Tidak ada list models API, kembalikan single stub
      return NextResponse.json({
        ok: true,
        models: [{ id: 'llamacpp-default', label: 'llama.cpp default (set in CLI)', contextWindow: 4096 }],
        source: 'stub',
      })
    } else {
      // custom
      return NextResponse.json({
        ok: true,
        models: [],
        msg: 'Custom endpoint. Masukkan model manual di field custom.',
      })
    }
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      msg: `Gagal fetch dari ${endpoint}: ${e?.message ?? e}`,
      models: [],
    })
  }
}

// POST /api/ai/models — pull a model in Ollama (POST /api/pull)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, endpoint, model } = body
  if (action === 'pull_ollama') {
    const pullUrl = endpoint.replace(/\/api\/generate$/, '/api/pull').replace(/\/$/, '/api/pull')
    try {
      // Pull adalah long-running. Return immediately; user jalankan via Ollama CLI.
      const res = await fetch(pullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, msg: `Pull failed: ${res.status}` })
      }
      return NextResponse.json({ ok: true, msg: `Pull ${model} selesai` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, msg: `Pull error: ${e?.message ?? e}. Jalankan manual: ollama pull ${model}` })
    }
  }
  // test connection
  if (action === 'test_groq') {
    const { apiKey, model } = body
    if (!apiKey) return NextResponse.json({ ok: false, msg: 'API key belum di-set' })
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Test: respond OK' }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ ok: false, msg: `Test error ${res.status}: ${err.slice(0, 200)}` })
      }
      const data = await res.json()
      return NextResponse.json({ ok: true, msg: 'OK', content: data.choices?.[0]?.message?.content ?? '', latencyMs: 0 })
    } catch (e: any) {
      return NextResponse.json({ ok: false, msg: `Test gagal: ${e?.message ?? e}` })
    }
  }
  if (action === 'test_local') {
    const { endpoint: ep, model } = body
    if (!ep) return NextResponse.json({ ok: false, msg: 'Endpoint belum di-set' })
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3.1:8b', prompt: 'Test: respond OK', stream: false, options: { num_predict: 10 } }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, msg: `Local AI error ${res.status}` })
      }
      const data = await res.json()
      return NextResponse.json({ ok: true, msg: 'OK', content: (data.response ?? data.choices?.[0]?.message?.content ?? '').slice(0, 100) })
    } catch (e: any) {
      return NextResponse.json({ ok: false, msg: `Local AI gagal: ${e?.message ?? e}` })
    }
  }
  return NextResponse.json({ ok: false, msg: 'Unknown action' })
}
