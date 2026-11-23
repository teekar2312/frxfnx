import { NextRequest, NextResponse } from 'next/server'

// GET /api/news/tiingo
// Query: ?apiKey=... (atau dari env TIINGO_API_KEY)
// Mengembalikan events dengan format { previous, forecast, actual } untuk 3 Angka Emas
// Catatan: Tiingo News API mengembalikan headline + tags; untuk ekonomi data rilis,
// kita mock generator jika tidak ada koneksi agar UI tetap dapat demo.

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const apiKey = url.searchParams.get('apiKey') || process.env.TIINGO_API_KEY

  if (!apiKey) {
    // Mock events (sama dengan yang di mt5-bridge service)
    return NextResponse.json({
      msg: 'Tiingo API key belum di-set. Mengembalikan sample events.',
      events: mockEvents(),
    })
  }

  try {
    // Tiingo news endpoint
    const res = await fetch(`https://api.tiingo.com/tiingo/news?tokens=${apiKey}&limit=50`, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    if (!res.ok) {
      return NextResponse.json({ msg: 'Tiingo error', status: res.status, events: mockEvents() }, { status: 200 })
    }
    const data = await res.json()
    // Tiingo news tidak memberikan Previous/Forecast/Actual langsung;
    // untuk demo, mapping headline saja + tag USD/economic
    const events = (data as any[]).map((n, i) => ({
      id: 'tiingo_' + (n.id ?? i),
      title: n.title,
      country: detectCountry(n.tags ?? ''),
      currency: detectCurrency(n.tags ?? ''),
      impact: detectImpact(n.tags ?? ''),
      eventTime: n.publishedDate ?? new Date().toISOString(),
      source: 'tiingo',
      previous: undefined,
      forecast: undefined,
      actual: undefined,
    }))
    return NextResponse.json({ msg: 'OK', events })
  } catch (e: any) {
    return NextResponse.json({ msg: e?.message ?? 'error', events: mockEvents() }, { status: 200 })
  }
}

function mockEvents() {
  const now = Date.now()
  return [
    { id: 'mock1', title: 'CPI m/m (US)', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(now + 3600 * 1000).toISOString(), previous: 2.4, forecast: 2.4, source: 'mock' },
    { id: 'mock2', title: 'Non-Farm Payroll', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(now + 7200 * 1000).toISOString(), previous: 227, forecast: 200, source: 'mock' },
    { id: 'mock3', title: 'Unemployment Rate', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(now + 14400 * 1000).toISOString(), previous: 4.1, forecast: 4.1, source: 'mock' },
    { id: 'mock4', title: 'GDP q/q', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(now + 21600 * 1000).toISOString(), previous: 3.0, forecast: 2.8, source: 'mock' },
  ]
}

function detectCountry(tags: string): string {
  if (tags?.includes('USD')) return 'US'
  if (tags?.includes('EUR')) return 'EU'
  if (tags?.includes('GBP')) return 'UK'
  if (tags?.includes('JPY')) return 'JP'
  return 'US'
}
function detectCurrency(tags: string): string {
  if (tags?.includes('EUR')) return 'EUR'
  if (tags?.includes('GBP')) return 'GBP'
  if (tags?.includes('JPY')) return 'JPY'
  return 'USD'
}
function detectImpact(tags: string): 'high' | 'medium' | 'low' {
  if (tags?.match(/CPI|NFP|FOMC|GDP|Payroll|Unemployment|Interest|Rate|Fed/i)) return 'high'
  if (tags?.match(/PMI|Retail|PPI|Manufacturing/i)) return 'medium'
  return 'low'
}
