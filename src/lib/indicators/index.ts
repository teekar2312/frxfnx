// Indikator teknikal: RSI, Stochastic, Bollinger Bands, ATR, SMA, EMA
// Semua bekerja pada array of { time, bid, ask } atau close prices.

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

// Build candles dari tick history (1-minute aggregation)
export function ticksToCandles(ticks: { time: number; bid: number; ask: number }[], tfMs: number = 60000): Candle[] {
  if (!ticks.length) return []
  const candles: Candle[] = []
  let curBucket = Math.floor(ticks[0].time / tfMs) * tfMs
  let cur: Candle = { time: curBucket, open: ticks[0].bid, high: ticks[0].bid, low: ticks[0].bid, close: ticks[0].bid }
  for (const t of ticks) {
    const bucket = Math.floor(t.time / tfMs) * tfMs
    if (bucket !== curBucket) {
      candles.push(cur)
      curBucket = bucket
      cur = { time: curBucket, open: t.bid, high: t.bid, low: t.bid, close: t.bid }
    }
    cur.high = Math.max(cur.high, t.bid)
    cur.low = Math.min(cur.low, t.bid)
    cur.close = t.bid
  }
  candles.push(cur)
  return candles
}

// SMA
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += values[j]
    out.push(sum / period)
  }
  return out
}

// EMA
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  const k = 2 / (period + 1)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    if (prev === null) {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += values[j]
      prev = sum / period
      out.push(prev)
    } else {
      prev = values[i] * k + prev * (1 - k)
      out.push(prev)
    }
  }
  return out
}

// RSI
export function rsi(values: number[], period: number = 14): (number | null)[] {
  const out: (number | null)[] = []
  if (values.length < period + 1) return values.map(() => null)
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1]
    if (diff > 0) avgGain += diff
    else avgLoss -= diff
  }
  avgGain /= period
  avgLoss /= period
  // Konsisten: jika avgLoss === 0 → RSI = 100 (max)
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  for (let i = 0; i < period; i++) out[i] = null
  return out
}

// Stochastic %K + %D
export function stochastic(candles: Candle[], kPeriod: number = 14, dPeriod: number = 3): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue }
    let hh = -Infinity, ll = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high)
      ll = Math.min(ll, candles[j].low)
    }
    const range = hh - ll
    k.push(range === 0 ? 50 : ((candles[i].close - ll) / range) * 100)
  }
  // %D = SMA of %K (gunakan hanya nilai valid %K, hindari null→0 skew)
  // Untuk index i < kPeriod-1 + dPeriod-1, %D harus null
  const d: (number | null)[] = new Array(k.length).fill(null)
  const minIdx = kPeriod - 1 + dPeriod - 1  // butuh kPeriod nilai %K + dPeriod untuk SMA
  for (let i = minIdx; i < k.length; i++) {
    let sum = 0
    let valid = true
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (k[j] === null) { valid = false; break }
      sum += k[j] as number
    }
    if (valid) d[i] = sum / dPeriod
  }
  return { k, d }
}

// Bollinger Bands
export function bollingerBands(values: number[], period: number = 20, mult: number = 2): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(values, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += values[j]
    const mean = sum / period
    let variance = 0
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2
    const std = Math.sqrt(variance / period)
    upper.push(mean + mult * std)
    lower.push(mean - mult * std)
  }
  return { upper, middle, lower }
}

// ATR
export function atr(candles: Candle[], period: number = 14): (number | null)[] {
  const trs: number[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { trs.push(candles[0].high - candles[0].low); continue }
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    )
    trs.push(tr)
  }
  // Wilder's smoothing
  const out: (number | null)[] = []
  if (trs.length < period) return trs.map(() => null)
  let prev = 0
  for (let i = 0; i < period; i++) prev += trs[i]
  prev /= period
  out[period - 1] = prev
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period
    out[i] = prev
  }
  for (let i = 0; i < period - 1; i++) out[i] = null
  return out
}

// Detect support & resistance levels (simple: local maxima/minima)
export function detectSupportResistance(candles: Candle[], lookback: number = 20): { supports: number[]; resistances: number[] } {
  const supports: number[] = []
  const resistances: number[] = []
  if (candles.length < lookback * 2 + 1) return { supports, resistances }
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSupport = true, isResistance = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (candles[j].low < candles[i].low) isSupport = false
      if (candles[j].high > candles[i].high) isResistance = false
    }
    if (isSupport) supports.push(candles[i].low)
    if (isResistance) resistances.push(candles[i].high)
  }
  return { supports: supports.slice(-5), resistances: resistances.slice(-5) }
}

// Helper: take last N non-null values
export function lastN<T>(arr: (T | null)[], n: number): T[] {
  const out: T[] = []
  for (let i = arr.length - 1; i >= 0 && out.length < n; i--) if (arr[i] !== null) out.unshift(arr[i] as T)
  return out
}
