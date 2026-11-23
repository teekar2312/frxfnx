// Analisis 3 Angka Emas untuk berita ekonomi
// Sesuai user request: Previous / Forecast / Actual + kamus reaksi kilat untuk USD

import type { NewsEvent } from '@/types'

export interface NewsAnalysis {
  ready: boolean
  deviation: number | null
  directionUsd: 'up' | 'down' | 'neutral'
  directionXau: 'up' | 'down' | 'neutral'
  directionEur: 'up' | 'down' | 'neutral'
  directionGbp: 'up' | 'down' | 'neutral'
  directionJpy: 'up' | 'down' | 'neutral'
  intensity: 'low' | 'medium' | 'high' | 'extreme'
  note: string
}

const TITLE_RULES: { pattern: RegExp; inverse?: boolean; label: string }[] = [
  // Unemployment Rate: kebalikan NFP (Actual > Forecast -> USD Turun)
  { pattern: /unemployment/i, inverse: true, label: 'Unemployment' },
  // NFP & Retail Sales: Actual > Forecast -> USD Naik
  { pattern: /non[-\s]?farm|nfp|payroll/i, label: 'NFP' },
  { pattern: /retail\s*sales/i, label: 'Retail Sales' },
  // CPI & PPI: inflasi
  { pattern: /cpi|consumer\s*price/i, label: 'CPI' },
  { pattern: /ppi|producer\s*price/i, label: 'PPI' },
  // GDP & PMI
  { pattern: /gdp|gross\s*domestic/i, label: 'GDP' },
  { pattern: /pmi|manufacturing|services\s*pmi/i, label: 'PMI' },
  // Interest rate
  { pattern: /interest\s*rate|fed\s*funds|fomc/i, label: 'IR' },
]

export function analyzeNewsEvent(ev: NewsEvent): NewsAnalysis {
  if (ev.actual === undefined || ev.forecast === undefined) {
    return {
      ready: false,
      deviation: null,
      directionUsd: 'neutral',
      directionXau: 'neutral',
      directionEur: 'neutral',
      directionGbp: 'neutral',
      directionJpy: 'neutral',
      intensity: 'low',
      note: 'Belum rilis (menunggu Actual)',
    }
  }
  const baseDev = ev.forecast !== 0 ? ((ev.actual - ev.forecast) / Math.abs(ev.forecast)) * 100 : 0
  const deviation = +baseDev.toFixed(2)
  const actualGreater = ev.actual > ev.forecast
  const matched = TITLE_RULES.find((r) => r.pattern.test(ev.title))
  const inverse = matched?.inverse ?? false
  // USD direction: kecuali unemployment yang inverse
  const directionUsd: 'up' | 'down' | 'neutral' = actualGreater
    ? inverse ? 'down' : 'up'
    : inverse ? 'up' : 'down'

  // intensity by absolute deviation
  const abs = Math.abs(deviation)
  let intensity: 'low' | 'medium' | 'high' | 'extreme' = 'low'
  if (abs >= 10) intensity = 'extreme'
  else if (abs >= 5) intensity = 'high'
  else if (abs >= 2) intensity = 'medium'

  // Untuk USD: XAU & EUR & GBP berbanding terbalik; JPY searah (USD base)
  const invert = (d: 'up' | 'down' | 'neutral') => (d === 'up' ? 'down' : d === 'down' ? 'up' : 'neutral')

  const directionXau = invert(directionUsd)
  const directionEur = invert(directionUsd)
  const directionGbp = invert(directionUsd)
  const directionJpy = directionUsd // USD/JPY: USD naik -> JPY turun (pair naik)

  const note = matched
    ? `${matched.label}: Actual ${ev.actual} ${actualGreater ? '>' : '<'} Forecast ${ev.forecast} -> USD ${directionUsd.toUpperCase()}`
    : `Actual ${ev.actual} ${actualGreater ? '>' : '<'} Forecast ${ev.forecast}`

  return {
    ready: true,
    deviation,
    directionUsd,
    directionXau,
    directionEur,
    directionGbp,
    directionJpy,
    intensity,
    note,
  }
}

export function formatValue(v: number | undefined, suffix = ''): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

export function directionBadge(d: 'up' | 'down' | 'neutral') {
  if (d === 'up') return { label: '↑ Naik', color: 'text-emerald-500' }
  if (d === 'down') return { label: '↓ Turun', color: 'text-red-500' }
  return { label: '→ Netral', color: 'text-muted-foreground' }
}

export function intensityBadge(i: 'low' | 'medium' | 'high' | 'extreme') {
  switch (i) {
    case 'extreme': return { label: 'EXTREME', color: 'bg-red-600 text-white' }
    case 'high': return { label: 'HIGH', color: 'bg-orange-500 text-white' }
    case 'medium': return { label: 'MEDIUM', color: 'bg-yellow-500 text-white' }
    default: return { label: 'LOW', color: 'bg-slate-500 text-white' }
  }
}
