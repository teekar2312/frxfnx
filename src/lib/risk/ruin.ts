// Risk of Ruin Calculator
// Probabilitas kehilangan X% dari equity dalam N trade, berdasarkan win-rate, R:R, dan risk%.
// Menggunakan pendekatan Closed-form (untuk simplifikasi): rumus Vince.

export interface RiskOfRuinInput {
  winRate: number // 0-100
  rr: number      // reward:risk ratio (mis. 2 = 1:2)
  riskPerTrade: number // % equity per trade (mis. 0.5 = 0.5%)
  ruinLevel: number // % loss dianggap "ruin" (mis. 50 = kehilangan 50% equity)
  trades: number // jumlah trade yang akan disimulasikan
}

export interface RiskOfRuinResult {
  probability: number // 0-100
  expectedGrowthPerTrade: number // %
  kelly: number // % optimal risk per Kelly
  advice: string
  simulatedEquity: { trade: number; equity: number; min: number; max: number }[]
}

export function calcRiskOfRuin(input: RiskOfRuinInput): RiskOfRuinResult {
  const p = input.winRate / 100
  const q = 1 - p
  // Expectancy per trade (in R units)
  const expectancyR = p * input.rr - q
  // Expectancy in % equity
  const expPct = expectancyR * input.riskPerTrade

  // Risk of ruin (simplified formula: gaussian approximation)
  // RoR ≈ ((1 - edge) / (1 + edge)) ^ (units_of_risk_in_ruinLevel)
  // units = ruinLevel / riskPerTrade
  const units = input.ruinLevel / input.riskPerTrade
  const edge = expectancyR
  let ror: number
  if (edge <= 0) ror = 100 // negatif edge → near certain ruin eventually
  else {
    const ratio = (1 - edge) / (1 + edge)
    ror = Math.pow(Math.max(0, ratio), units) * 100
  }
  ror = Math.max(0, Math.min(100, ror))

  // Kelly criterion: f = p - (q / b) where b = RR
  const kelly = Math.max(0, p - q / Math.max(0.01, input.rr)) * 100

  // Monte Carlo simulation
  const sims = 200
  const results: number[][] = []
  for (let s = 0; s < sims; s++) {
    let equity = 100
    const traj: number[] = [equity]
    for (let t = 0; t < input.trades; t++) {
      const win = Math.random() < p
      const delta = win ? input.rr * input.riskPerTrade : -input.riskPerTrade
      equity *= (1 + delta / 100)
      traj.push(equity)
    }
    results.push(traj)
  }
  // average + min/max envelopes
  const simulatedEquity: { trade: number; equity: number; min: number; max: number }[] = []
  for (let t = 0; t <= input.trades; t++) {
    let sum = 0, mn = Infinity, mx = -Infinity
    for (const traj of results) { sum += traj[t]; mn = Math.min(mn, traj[t]); mx = Math.max(mx, traj[t]) }
    simulatedEquity.push({ trade: t, equity: +(sum / sims).toFixed(2), min: +mn.toFixed(2), max: +mx.toFixed(2) })
  }

  let advice = ''
  if (ror > 30) advice = `Risk of ruin ${ror.toFixed(1)}% terlalu tinggi. Kurangi risk per trade ke ${Math.max(0.25, input.riskPerTrade / 2)}% atau tingkatkan win-rate/RR.`
  else if (ror > 10) advice = `Risk of ruin ${ror.toFixed(1)}% — waspada. Pertimbangkan kurangi risk per trade.`
  else advice = `Risk of ruin ${ror.toFixed(1)}% — sehat. Tetap disiplin.`

  if (kelly > 5) advice += ` Kelly menyarankan max ${kelly.toFixed(1)}% per trade, tapi untuk scalper disarankan tidak lebih dari 1%.`

  return {
    probability: +ror.toFixed(2),
    expectedGrowthPerTrade: +expPct.toFixed(3),
    kelly: +kelly.toFixed(2),
    advice,
    simulatedEquity,
  }
}
