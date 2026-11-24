// Correlation Matrix antar 4 pair forex utama
// Berdasarkan Pearson correlation dari % return per tick.
// Output matrix 4x4, value -1 hingga +1.

import type { CurrencyStrength } from '@/lib/indicators/currencyStrength'

const SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY']

export function calcReturns(history: { bid: number }[]): number[] {
  const out: number[] = []
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1].bid === 0) continue
    out.push((history[i].bid - history[i - 1].bid) / history[i - 1].bid)
  }
  return out
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 5) return 0
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0
  for (let i = 0; i < n; i++) {
    sumA += a[i]
    sumB += b[i]
    sumAB += a[i] * b[i]
    sumA2 += a[i] * a[i]
    sumB2 += b[i] * b[i]
  }
  const num = n * sumAB - sumA * sumB
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB))
  return den === 0 ? 0 : num / den
}

export function correlationMatrix(prices: Record<string, { bid: number; ask: number; history: { t: number; bid: number; ask: number }[] }>): number[][] {
  const returns: Record<string, number[]> = {}
  for (const sym of SYMBOLS) {
    if (!prices[sym]) returns[sym] = []
    else returns[sym] = calcReturns(prices[sym].history)
  }
  const matrix: number[][] = []
  for (const r of SYMBOLS) {
    const row: number[] = []
    for (const c of SYMBOLS) {
      row.push(+(pearsonCorrelation(returns[r], returns[c]).toFixed(2)))
    }
    matrix.push(row)
  }
  return matrix
}

export function correlationColor(v: number): string {
  if (v >= 0.7) return 'bg-emerald-600 text-white'
  if (v >= 0.4) return 'bg-emerald-400 text-white'
  if (v >= 0.2) return 'bg-emerald-200 text-emerald-900'
  if (v >= -0.2) return 'bg-muted text-foreground'
  if (v >= -0.4) return 'bg-red-200 text-red-900'
  if (v >= -0.7) return 'bg-red-400 text-white'
  return 'bg-red-600 text-white'
}

export function correlationLabel(v: number): string {
  if (v >= 0.7) return 'Strong Positive'
  if (v >= 0.3) return 'Positive'
  if (v >= -0.3) return 'Neutral'
  if (v >= -0.7) return 'Negative'
  return 'Strong Negative'
}

// Aggregate exposure warning: jika total exposure direction searah dengan correlated positions
export function analyzeAggregateExposure(positions: { symbol: string; side: 'BUY' | 'SELL'; lots: number }[], matrix: number[][]): { warning: string; severity: 'low' | 'medium' | 'high' } {
  if (positions.length < 2) return { warning: 'OK — < 2 posisi', severity: 'low' }
  // Pseudo: jika dua posisi searah dan pair berkorelasi tinggi → risk berlipat
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i], b = positions[j]
      const idxA = SYMBOLS.indexOf(a.symbol)
      const idxB = SYMBOLS.indexOf(b.symbol)
      if (idxA < 0 || idxB < 0) continue
      const corr = matrix[idxA][idxB]
      const sameDirection = (a.side === b.side && corr > 0.3) || (a.side !== b.side && corr < -0.3)
      if (sameDirection && Math.abs(corr) > 0.5) {
        return {
          warning: `${a.symbol} ${a.side} + ${b.symbol} ${b.side}: korelasi ${corr.toFixed(2)} — exposure berlipat!`,
          severity: 'high',
        }
      }
    }
  }
  return { warning: 'Tidak ada korelasi berbahaya', severity: 'low' }
}
