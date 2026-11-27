import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitedResponse, applyCors, applySecurityHeaders, sanitizeString } from '@/lib/security'
import { getConfig } from '@/lib/config/env'
import { log } from '@/lib/logger'

// POST /api/ai/chat
// Body: { provider: 'groq' | 'local', prompt: string, context?: any }
// Catatan: untuk keamanan, API key Groq diambil dari env server atau dari body
// (karena key disimpan di client zustand). Untuk production, set GROQ_API_KEY di .env

export async function POST(req: NextRequest) {
  // Apply CORS + security headers
  let res: NextResponse
  const origin = req.headers.get('origin')

  // Rate limit
  const rl = rateLimit('ai:chat', req)
  if (rl.exceeded) {
    res = rateLimitedResponse()
    return applySecurityHeaders(applyCors(res, origin))
  }

  // Parse + validate body
  let body: any
  try {
    body = await req.json()
  } catch (e) {
    log.warn('ai', 'Invalid JSON body')
    res = NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, { status: 400 })
    return applySecurityHeaders(applyCors(res, origin))
  }

  const { provider, prompt, context } = body || {}

  // Input validation
  if (!prompt) {
    res = NextResponse.json({ error: 'Prompt required', code: 'MISSING_PROMPT' }, { status: 400 })
    return applySecurityHeaders(applyCors(res, origin))
  }
  if (provider !== 'groq' && provider !== 'local') {
    res = NextResponse.json({ error: 'Provider must be groq or local', code: 'INVALID_PROVIDER' }, { status: 400 })
    return applySecurityHeaders(applyCors(res, origin))
  }
  const sanitizedPrompt = sanitizeString(prompt, 5000)
  if (sanitizedPrompt.length < 1) {
    res = NextResponse.json({ error: 'Prompt too short', code: 'PROMPT_TOO_SHORT' }, { status: 400 })
    return applySecurityHeaders(applyCors(res, origin))
  }

  const config = getConfig()
  const sys = `Anda adalah AI Trading Assistant untuk platform forex FINEX Indonesia + MT5.
Anda membantu trader retail dengan:
- Analisis berita ekonomi (3 Angka Emas: Previous / Forecast / Actual)
- Strategi scalping berita (Fade the Spike / 15-Minute Breakout)
- Manajemen risiko (fixed-fractional sizing, R:R min 1.5, leverage cap 5:1, daily stop 3%, weekly stop 5%)
- Penjelasan korelasi USD vs XAU/EUR/GBP/JPY

Konteks akun MT5: ${JSON.stringify(context ?? {})}

Panduan:
- Actual > Forecast untuk NFP/CPI/PPI/Retail/GDP/PMI -> USD naik -> XAU & EUR & GBP turun, JPY naik
- Actual > Forecast untuk Unemployment Rate -> USD turun (kebalikan NFP)
- Strategi 15-Min Breakout: tunggu candle M15 pertama, entry saat breakout high/low, SL ketat di sisi lawan
- SL maksimal: 40 pips XAU, 15 pips majors; RR min 1:1.5
- Hindari entry Fase 1 (0-2 menit post-release) — zona fakeout
- Tidak trade Sabtu/Minggu, sesuai user req

Jawab dalam Bahasa Indonesia, ringkas, dengan rekomendasi konkret (pair, arah, lot, SL, TP, target pips).`

  const start = Date.now()
  try {
    let content = ''
    let model = ''
    let tokens = 0

    if (provider === 'groq') {
      const apiKey = config.groqApiKey || body.apiKey || body.groqApiKey
      let modelId = body.model || config.groqModel
      if (typeof modelId === 'string' && modelId.startsWith('__custom__')) {
        modelId = modelId.replace('__custom__', '') || config.groqModel
      }
      if (!apiKey) {
        if (config.nodeEnv === 'production') {
          log.error('ai', 'Groq API key missing in production')
          res = NextResponse.json({ error: 'GROQ_API_KEY not configured', code: 'MISSING_API_KEY' }, { status: 500 })
          return applySecurityHeaders(applyCors(res, origin))
        }
        content = `(Groq API key belum di-set. Atur di Settings > AI Providers. Mock response untuk demo.)
Anda bertanya: "${sanitizedPrompt}"

Sesuai aturan 3 Angka Emas & strategi 15-Min Breakout:
1. Pastikan Actual sudah keluar (cek News Calendar).
2. Jika Actual > Forecast pada CPI/NFP -> USD menguat, XAU & EUR turun.
3. Tunggu candle M15 pertama post-release. Pasang Sell Stop di bawah Low untuk XAU/USD, EUR/USD, GBP/USD; Buy Stop di atas High untuk USD/JPY.
4. SL: 40 pips XAU, 15 pips majors. Target pair-specific (XAU 25, EUR 12, GBP 18, JPY 17).
5. Lot = (Equity × 0.5%) / (SL pips × pip value). Contoh equity $10.000, SL 30 pips, XAU: lot = 50 / (30 × 10) = 0.17 lot.`
        model = 'mock'
      } else {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), config.groqTimeout)
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: sanitizedPrompt },
            ],
            temperature: 0.4,
            max_tokens: 800,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!r.ok) {
          const err = await r.text()
          log.error('ai', `Groq API error: ${r.status}`, { err: err.slice(0, 200) })
          res = NextResponse.json({ error: 'Groq API error', status: r.status, detail: err.slice(0, 200) }, { status: 502 })
          return applySecurityHeaders(applyCors(res, origin))
        }
        const data = await r.json()
        content = data.choices?.[0]?.message?.content ?? ''
        model = data.model ?? modelId
        tokens = data.usage?.total_tokens ?? 0
      }
    } else {
      const localType = body.localType || config.localAiType
      let endpoint = body.endpoint || config.localAiEndpoint
      let localModel = body.model || config.localAiModel
      if (typeof localModel === 'string' && localModel.startsWith('__custom__')) {
        localModel = localModel.replace('__custom__', '') || config.localAiModel
      }
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.localAiTimeout)
      try {
        let r: Response
        if (localType === 'ollama' || localType === 'custom' || endpoint.includes('/api/generate')) {
          r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: localModel,
              prompt: `${sys}\n\nUser: ${sanitizedPrompt}\nAssistant:`,
              stream: false,
              options: { temperature: 0.4, num_predict: 600 },
            }),
            signal: controller.signal,
          })
        } else if (localType === 'llamacpp' || endpoint.includes('/completion')) {
          r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `${sys}\n\nUser: ${sanitizedPrompt}\nAssistant:`,
              n_predict: 600,
              temperature: 0.4,
            }),
            signal: controller.signal,
          })
        } else {
          r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: localModel,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: sanitizedPrompt },
              ],
              temperature: 0.4,
              max_tokens: 600,
            }),
            signal: controller.signal,
          })
        }
        clearTimeout(timeout)
        if (!r.ok) {
          const err = await r.text()
          log.error('ai', `Local AI error: ${r.status}`, { err: err.slice(0, 200) })
          res = NextResponse.json({ error: `Local AI error ${r.status}`, detail: err.slice(0, 200) }, { status: 502 })
          return applySecurityHeaders(applyCors(res, origin))
        }
        const data = await r.json()
        content = data.response ?? data.choices?.[0]?.message?.content ?? data.content ?? ''
        model = localModel
        tokens = data.eval_count ?? data.usage?.total_tokens ?? 0
      } catch (e: any) {
        clearTimeout(timeout)
        if (e?.name === 'AbortError') {
          log.error('ai', 'Local AI timeout')
          res = NextResponse.json({ error: 'Local AI timeout', code: 'TIMEOUT' }, { status: 504 })
        } else {
          log.error('ai', 'Local AI error', { err: e?.message })
          res = NextResponse.json({ error: `Local AI error: ${e?.message ?? e}`, code: 'LOCAL_AI_ERROR' }, { status: 502 })
        }
        return applySecurityHeaders(applyCors(res, origin))
      }
    }

    const response = NextResponse.json({
      content,
      model,
      tokens,
      latencyMs: Date.now() - start,
      provider,
    })
    for (const [k, v] of Object.entries(rl.headers)) response.headers.set(k, v as string)
    log.audit('ai:chat', { provider, model, tokens, latencyMs: Date.now() - start, promptLen: sanitizedPrompt.length })
    return applySecurityHeaders(applyCors(response, origin))
  } catch (e: any) {
    log.error('ai', 'Unhandled error in /api/ai/chat', { err: e?.message })
    res = NextResponse.json({ error: e?.message ?? 'unknown error', code: 'INTERNAL_ERROR' }, { status: 500 })
    return applySecurityHeaders(applyCors(res, origin))
  }
}
