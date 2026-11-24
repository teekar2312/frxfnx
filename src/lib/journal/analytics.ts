// Trade Analytics — performance metrics untuk Journal & Analytics views
import type { TradeHistory } from '@/lib/types'

export interface TradeAnalytics {
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  expectancy: number
  avgWin: number
  avgLoss: number
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  totalPnl: number
  bestTrade: number
  worstTrade: number
  avgDurationMs: number
  totalLots: number
  // per dimension
  pnlBySymbol: Record<string, number>
  pnlByStrategy: Record<string, number>
  pnlBySession: Record<string, number>
  pnlByDay: Record<string, number>
  // equity curve
  equityCurve: { time: string; cumPnl: number; balance: number }[]
}

export function analyzeTrades(trades: TradeHistory[], startingBalance: number = 10000): TradeAnalytics {
  const totalTrades = trades.length
  const wins = trades.filter((t) => t.profit > 0).length
  const losses = trades.filter((t) => t.profit <= 0).length
  const totalPnl = trades.reduce((a, t) => a + t.profit, 0)
  const grossProfit = trades.filter((t) => t.profit > 0).reduce((a, t) => a + t.profit, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.profit <= 0).reduce((a, t) => a + t.profit, 0))
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0
  const avgWin = wins > 0 ? grossProfit / wins : 0
  const avgLoss = losses > 0 ? grossLoss / losses : 0
  const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0
  const bestTrade = trades.reduce((m, t) => Math.max(m, t.profit), 0)
  const worstTrade = trades.reduce((m, t) => Math.min(m, t.profit), 0)
  const avgDurationMs = trades.length > 0 ? trades.reduce((a, t) => a + t.durationMs, 0) / trades.length : 0
  const totalLots = trades.reduce((a, t) => a + t.lots, 0)

  // Consecutive wins/losses
  let maxCW = 0, maxCL = 0, curCW = 0, curCL = 0
  for (const t of trades) {
    if (t.profit > 0) { curCW++; curCL = 0; maxCW = Math.max(maxCW, curCW) }
    else { curCL++; curCW = 0; maxCL = Math.max(maxCL, curCL) }
  }

  // Per dimension
  const pnlBySymbol: Record<string, number> = {}
  const pnlByStrategy: Record<string, number> = {}
  const pnlBySession: Record<string, number> = {}
  const pnlByDay: Record<string, number> = {}

  for (const t of trades) {
    pnlBySymbol[t.symbol] = (pnlBySymbol[t.symbol] ?? 0) + t.profit
    const strat = t.strategyId ?? 'discretionary'
    pnlByStrategy[strat] = (pnlByStrategy[strat] ?? 0) + t.profit
    // session by hour of close
    const hour = new Date(t.closeTime).getHours()
    const session = hour >= 7 && hour < 16 ? 'Asia' : hour >= 16 && hour < 21 ? 'London' : 'NewYork'
    pnlBySession[session] = (pnlBySession[session] ?? 0) + t.profit
    const day = new Date(t.closeTime).toLocaleDateString('id-ID', { weekday: 'long' })
    pnlByDay[day] = (pnlByDay[day] ?? 0) + t.profit
  }

  // Equity curve (chronological)
  const sorted = [...trades].sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())
  let cumPnl = 0
  const equityCurve = sorted.map((t) => {
    cumPnl += t.profit
    return { time: t.closeTime, cumPnl: +cumPnl.toFixed(2), balance: +(startingBalance + cumPnl).toFixed(2) }
  })

  return {
    totalTrades, wins, losses, winRate: +winRate.toFixed(2),
    profitFactor: +profitFactor.toFixed(2), expectancy: +expectancy.toFixed(2),
    avgWin: +avgWin.toFixed(2), avgLoss: +avgLoss.toFixed(2),
    maxConsecutiveWins: maxCW, maxConsecutiveLosses: maxCL,
    totalPnl: +totalPnl.toFixed(2), bestTrade: +bestTrade.toFixed(2), worstTrade: +worstTrade.toFixed(2),
    avgDurationMs, totalLots: +totalLots.toFixed(2),
    pnlBySymbol, pnlByStrategy, pnlBySession, pnlByDay, equityCurve,
  }
}

// Generate P&L Report (text/markdown)
export function generatePnlReport(analytics: TradeAnalytics, period: 'daily' | 'weekly' | 'monthly', startDate: string, endDate: string): string {
  const lines: string[] = []
  lines.push(`# FINEX Forex Trading — P&L Report`)
  lines.push(`Periode: ${period.toUpperCase()} (${startDate} s/d ${endDate})`)
  lines.push('')
  lines.push('## Ringkasan')
  lines.push(`- Total Trades: ${analytics.totalTrades}`)
  lines.push(`- Win Rate: ${analytics.winRate}% (${analytics.wins}W / ${analytics.losses}L)`)
  lines.push(`- Profit Factor: ${analytics.profitFactor}`)
  lines.push(`- Expectancy: $${analytics.expectancy} per trade`)
  lines.push(`- Total P&L: $${analytics.totalPnl}`)
  lines.push(`- Best Trade: $${analytics.bestTrade}`)
  lines.push(`- Worst Trade: $${analytics.worstTrade}`)
  lines.push(`- Max Consecutive Wins: ${analytics.maxConsecutiveWins}`)
  lines.push(`- Max Consecutive Losses: ${analytics.maxConsecutiveLosses}`)
  lines.push(`- Avg Duration: ${(analytics.avgDurationMs / 60000).toFixed(1)} menit`)
  lines.push('')
  lines.push('## P&L per Pair')
  for (const [sym, pnl] of Object.entries(analytics.pnlBySymbol)) lines.push(`- ${sym}: $${pnl.toFixed(2)}`)
  lines.push('')
  lines.push('## P&L per Sesi')
  for (const [session, pnl] of Object.entries(analytics.pnlBySession)) lines.push(`- ${session}: $${pnl.toFixed(2)}`)
  lines.push('')
  lines.push('## P&L per Hari')
  for (const [day, pnl] of Object.entries(analytics.pnlByDay)) lines.push(`- ${day}: $${pnl.toFixed(2)}`)
  lines.push('')
  lines.push('## Catatan untuk Pajak (PPh Final Forex 0.1% — Indonesia)')
  lines.push(`- Estimasi PPh: $${(Math.abs(analytics.totalPnl) * 0.001).toFixed(2)} (jika profit)`)
  return lines.join('\n')
}
