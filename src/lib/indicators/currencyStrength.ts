// Currency Strength Meter
// Menghitung kekuatan relatif USD/EUR/GBP/JPY berdasarkan perubahan harga
// dari waktu T0 (default: 60 menit lalu) hingga sekarang.
//
// Formula: strength = (% change dalam periode, dinormalisasi ke 0-100)
// Untuk setiap currency, hitung rata-rata % change dari pairs yang melibatkan currency tsb.
// - USD: rata-rata dari (EUR/USD inverted, GBP/USD inverted, USD/JPY, XAU/USD inverted)
// - EUR: dari (EUR/USD)
// - GBP: dari (GBP/USD)
// - JPY: dari (USD/JPY inverted)
//
// Output: nilai 0-100, 50 = netral, >50 = kuat, <50 = lemah.

export interface CurrencyStrength {
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY'
  strength: number  // 0-100
  change: number  // % change
  rank: number  // 1 = terkuat
}

const SYMBOLS_WITH_USD = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY']

export function calcCurrencyStrength(prices: Record<string, { bid: number; ask: number; history: { t: number; bid: number; ask: number }[] }>, lookbackMs: number = 3600 * 1000): CurrencyStrength[] {
  const now = Date.now()
  const startTime = now - lookbackMs
  // % change per pair
  const pairChange: Record<string, number> = {}
  for (const sym of SYMBOLS_WITH_USD) {
    const p = prices[sym]
    if (!p || !p.history.length) {
      pairChange[sym] = 0
      continue
    }
    const past = p.history.find((h) => h.t >= startTime) ?? p.history[0]
    const cur = p.bid
    pairChange[sym] = ((cur - past.bid) / past.bid) * 100
  }

  // Untuk USD: average dari pairs USD-quote
  // EUR/USD: USD quote, EUR base. Jika EUR/USD naik, USD turun, EUR naik.
  // XAU/USD: USD quote, XAU base. Naik → USD turun.
  // USD/JPY: USD base. Naik → USD naik, JPY turun.
  const usdChange = (
    -pairChange['EUR/USD'] +
    -pairChange['GBP/USD'] +
    -pairChange['XAU/USD'] +
    pairChange['USD/JPY']
  ) / 4
  const eurChange = pairChange['EUR/USD']
  const gbpChange = pairChange['GBP/USD']
  const jpyChange = -pairChange['USD/JPY']

  // Map ke 0-100 dengan asumsi range ±2% → 0-100
  const normalize = (v: number) => Math.max(0, Math.min(100, 50 + v * 25))

  const out: CurrencyStrength[] = [
    { currency: 'USD', strength: normalize(usdChange), change: usdChange, rank: 0 },
    { currency: 'EUR', strength: normalize(eurChange), change: eurChange, rank: 0 },
    { currency: 'GBP', strength: normalize(gbpChange), change: gbpChange, rank: 0 },
    { currency: 'JPY', strength: normalize(jpyChange), change: jpyChange, rank: 0 },
  ]
  out.sort((a, b) => b.strength - a.strength)
  out.forEach((c, i) => (c.rank = i + 1))
  return out
}

export function strengthColor(s: number): string {
  if (s >= 70) return 'text-emerald-500'
  if (s >= 55) return 'text-emerald-400'
  if (s >= 45) return 'text-muted-foreground'
  if (s >= 30) return 'text-red-400'
  return 'text-red-500'
}

export function strengthLabel(s: number): string {
  if (s >= 70) return 'Sangat Kuat'
  if (s >= 60) return 'Kuat'
  if (s >= 50) return 'Netral+'
  if (s >= 40) return 'Netral-'
  if (s >= 30) return 'Lemah'
  return 'Sangat Lemah'
}
