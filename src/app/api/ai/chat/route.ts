import { NextRequest, NextResponse } from 'next/server'

// POST /api/ai/chat
// Body: { provider: 'groq' | 'local', prompt: string, context?: any }
// Catatan: untuk keamanan, API key Groq diambil dari env server atau dari body
// (karena key disimpan di client zustand). Untuk production, set GROQ_API_KEY di .env

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { provider, prompt, context } = body || {}

  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

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
      const apiKey = process.env.GROQ_API_KEY || body.apiKey || body.groqApiKey
      // Handle custom model yang diset sebagai '__custom__<model_id>'
      let modelId = body.model || 'llama-3.3-70b-versatile'
      if (typeof modelId === 'string' && modelId.startsWith('__custom__')) {
        modelId = modelId.replace('__custom__', '') || 'llama-3.3-70b-versatile'
      }
      if (!apiKey) {
        // fallback: kembalikan response stub yang menjelaskan
        content = `(Groq API key belum di-set. Atur di Settings > AI Providers. Mock response untuk demo.)
Anda bertanya: "${prompt}"

Sesuai aturan 3 Angka Emas & strategi 15-Min Breakout:
1. Pastikan Actual sudah keluar (cek News Calendar).
2. Jika Actual > Forecast pada CPI/NFP -> USD menguat, XAU & EUR turun.
3. Tunggu candle M15 pertama post-release. Pasang Sell Stop di bawah Low untuk XAU/USD, EUR/USD, GBP/USD; Buy Stop di atas High untuk USD/JPY.
4. SL: 40 pips XAU, 15 pips majors. Target pair-specific (XAU 25, EUR 12, GBP 18, JPY 17).
5. Lot = (Equity × 0.5%) / (SL pips × pip value). Contoh equity $10.000, SL 30 pips, XAU: lot = 50 / (30 × 10) = 0.17 lot.`
        model = 'mock'
      } else {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 800,
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          return NextResponse.json({ error: 'Groq error', detail: err, status: res.status }, { status: 500 })
        }
        const data = await res.json()
        content = data.choices?.[0]?.message?.content ?? ''
        model = data.model ?? body.model
        tokens = data.usage?.total_tokens ?? 0
      }
    } else {
      // Local AI (Ollama / LM Studio / vLLM / llama.cpp)
      const localType = body.localType || 'ollama'
      let endpoint = body.endpoint || body.localEndpoint || 'http://127.0.0.1:11434/api/generate'
      // Support both `model` (preferred, consistent with groq path) and `localModel` (legacy)
      let localModel = body.model || body.localModel || 'llama3.1:8b'
      // Handle custom model
      if (typeof localModel === 'string' && localModel.startsWith('__custom__')) {
        localModel = localModel.replace('__custom__', '') || 'llama3.1:8b'
      }
      try {
        let res: Response
        if (localType === 'ollama' || localType === 'custom' || endpoint.includes('/api/generate')) {
          // Ollama generate API
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: localModel,
              prompt: `${sys}\n\nUser: ${prompt}\nAssistant:`,
              stream: false,
              options: { temperature: 0.4, num_predict: 600 },
            }),
            signal: AbortSignal.timeout(30000),
          })
        } else if (localType === 'llamacpp' || endpoint.includes('/completion')) {
          // llama.cpp server
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `${sys}\n\nUser: ${prompt}\nAssistant:`,
              n_predict: 600,
              temperature: 0.4,
            }),
            signal: AbortSignal.timeout(30000),
          })
        } else {
          // LM Studio / vLLM (OpenAI-compatible)
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: localModel,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: prompt },
              ],
              temperature: 0.4,
              max_tokens: 600,
            }),
            signal: AbortSignal.timeout(30000),
          })
        }
        if (!res.ok) {
          const err = await res.text()
          content = `(Local AI gagal: ${err.slice(0, 200)}). Pastikan ${localType} running di Windows 11. Untuk Ollama: 'ollama serve' + 'ollama pull ${localModel}'. Mock response:

Pertanyaan: "${prompt}"

Rekomendasi umum (strategi 15-Min Breakout):
- Pasca-rilis NFP/CPI, tunggu 15 menit pertama (Fase 1 & 2).
- Tandai High/Low candle M15 pertama, breakout = entry.
- SL ketat di sisi lawan, target pips pair-specific.`
          model = 'mock'
        } else {
          const data = await res.json()
          // Handle 3 response formats
          content = data.response ?? data.choices?.[0]?.message?.content ?? data.content ?? ''
          model = localModel
          tokens = data.eval_count ?? data.usage?.total_tokens ?? 0
        }
      } catch (e: any) {
        content = `(Local AI unreachable: ${e?.message ?? e}). Jalankan '${localType === 'ollama' ? 'ollama serve' : localType + ' server'}' dan pull model '${localModel}' di Windows 11.`
        model = 'mock'
      }
    }

    return NextResponse.json({
      content,
      model,
      tokens,
      latencyMs: Date.now() - start,
      provider,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
