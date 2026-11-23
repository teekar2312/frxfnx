// Risk management helpers
// Mengacu pada 7 pilar user: fixed-fractional, stops before trade, asymmetry R:R, leverage cap, aggregate exposure, drawdown ladder, event & gap risk

export interface RiskInput {
  equity: number
  riskPct: number // mis. 0.5 = 0.5%
  stopPips: number
  pipValuePerLot: number // USD per pip per 1.00 lot
}

export interface RiskResult {
  lots: number
  riskAmount: number
  lotsLimited: number
  effectiveLeverage: number
  marginUsed: number
  marginUsagePct: number
}

export function calcLots(input: RiskInput): RiskResult {
  const riskAmount = (input.equity * input.riskPct) / 100
  // Lots = riskAmount / (stopPips * pipValuePerLot)
  let lots = input.stopPips > 0 && input.pipValuePerLot > 0 ? riskAmount / (input.stopPips * input.pipValuePerLot) : 0
  lots = Math.max(0, lots)
  // Limit minimum 0.01 lot
  lots = Math.max(0.01, lots)
  return {
    lots: +lots.toFixed(2),
    riskAmount: +riskAmount.toFixed(2),
    lotsLimited: +lots.toFixed(2),
    effectiveLeverage: 0,
    marginUsed: 0,
    marginUsagePct: 0,
  }
}

export function effectiveLeverage(notional: number, equity: number): number {
  if (equity <= 0) return 0
  return +(notional / equity).toFixed(2)
}

export function marginUsagePct(marginUsed: number, equity: number): number {
  if (equity <= 0) return 0
  return +((marginUsed / equity) * 100).toFixed(2)
}

// Pip value per 1.00 lot untuk pair umum (approx)
export const PIP_VALUE_PER_LOT: Record<string, number> = {
  'XAU/USD': 10, // 1 pip = 0.10, contract 100oz => $10 per pip per 1 lot
  'EUR/USD': 10,
  'GBP/USD': 10,
  'USD/JPY': 9, // approx (variasi dengan rate JPY)
}

// Stop pips maksimum berdasarkan pair (scalping berita)
export const STOP_PIPS_MAX: Record<string, number> = {
  'XAU/USD': 40,
  'EUR/USD': 15,
  'GBP/USD': 20,
  'USD/JPY': 20,
}

// Target pips berdasarkan pair (Strategi 15-Min Breakout)
export const TP_PIPS_TARGET: Record<string, number> = {
  'XAU/USD': 25,
  'EUR/USD': 12,
  'GBP/USD': 18,
  'USD/JPY': 17,
}

export interface DrawdownLadder {
  level: number
  action: string
  sizeMultiplier: number
}

export const DRAWDOWN_LADDER: DrawdownLadder[] = [
  { level: 0, action: 'Normal trading', sizeMultiplier: 1.0 },
  { level: -5, action: 'Halve position size', sizeMultiplier: 0.5 },
  { level: -10, action: 'Minimum size until recovered', sizeMultiplier: 0.25 },
]

export function getCurrentLadder(drawdownPct: number): DrawdownLadder {
  // drawdownPct = persen negatif dari peak equity
  if (drawdownPct <= -10) return DRAWDOWN_LADDER[2]
  if (drawdownPct <= -5) return DRAWDOWN_LADDER[1]
  return DRAWDOWN_LADDER[0]
}
