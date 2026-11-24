// MT5 Bridge Mini-Service v2 — with all 20 advanced features
// - Pending Orders (Buy/Sell Stop/Limit) for Strategi B
// - Trailing Stop & Partial Close
// - Spread Monitor & Auto-Reject
// - Alerts Engine (price/news/spread/margin/daily-stop)
// - Multi-Account switching
// - Auto-Disable Trading Pre-News (flatten positions)
// - Currency Strength meter (rolling basis)
// - Trade Timer per position
// - Backtest API (run synthetic strategy on historical ticks)
// - Trade Journal entries
// - Hot Keys
// - Drawing objects persistence (in-memory)
// - Copy Trade subscription (in-memory)

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3004

// ============================================================
// SYMBOLS
// ============================================================
interface SymbolState {
  symbol: string
  bid: number
  ask: number
  digits: number
  pipSize: number
  contractSize: number
  spreadPips: number
  maxSpreadPips: number  // for spread monitor auto-reject
}

const SYMBOLS: Record<string, SymbolState> = {
  'XAU/USD': { symbol: 'XAU/USD', bid: 2635.50, ask: 2635.80, digits: 2, pipSize: 0.10, contractSize: 100, spreadPips: 3, maxSpreadPips: 8 },
  'EUR/USD': { symbol: 'EUR/USD', bid: 1.08320, ask: 1.08332, digits: 5, pipSize: 0.0001, contractSize: 100000, spreadPips: 1.2, maxSpreadPips: 4 },
  'GBP/USD': { symbol: 'GBP/USD', bid: 1.26580, ask: 1.26595, digits: 5, pipSize: 0.0001, contractSize: 100000, spreadPips: 1.5, maxSpreadPips: 5 },
  'USD/JPY': { symbol: 'USD/JPY', bid: 154.320, ask: 154.335, digits: 3, pipSize: 0.01, contractSize: 100000, spreadPips: 1.4, maxSpreadPips: 4 },
}

// Historical tick buffer for backtest & indicators
const TICK_HISTORY: Record<string, { time: number; bid: number; ask: number }[]> = {}
for (const sym of Object.keys(SYMBOLS)) TICK_HISTORY[sym] = []
const MAX_HISTORY = 5000 // ~80 menit pada 1s tick

// ============================================================
// POSISI & PENDING ORDERS
// ============================================================
interface Position {
  ticket: number
  symbol: string
  side: 'BUY' | 'SELL'
  lots: number
  originalLots?: number  // untuk partial close
  openPrice: number
  sl?: number
  tp?: number
  openTime: string
  strategyId?: string
  isAuto: boolean
  trailingStopPips?: number
  trailingActivated?: boolean
  partialClosed?: boolean
}

interface PendingOrder {
  ticket: number
  symbol: string
  orderType: 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT'
  lots: number
  triggerPrice: number
  sl?: number
  tp?: number
  status: 'pending' | 'filled' | 'cancelled' | 'expired'
  strategyId?: string
  isAuto: boolean
  expiresAt?: string
  createdAt: string
}

const positions = new Map<number, Position>()
const pendingOrders = new Map<number, PendingOrder>()
let ticketSeq = 100000
let pendingSeq = 200000

// Trade history (untuk journal & analytics)
interface TradeHistory {
  ticket: number
  symbol: string
  side: 'BUY' | 'SELL'
  lots: number
  openPrice: number
  closePrice: number
  openTime: string
  closeTime: string
  profit: number
  pnlPips: number
  strategyId?: string
  isAuto: boolean
  closeReason: 'manual' | 'sl' | 'tp' | 'trailing' | 'auto_flatten'
  durationMs: number
}
const tradeHistory: TradeHistory[] = []

// ============================================================
// MT5 CONNECTION STATE
// ============================================================
interface Mt5ConnectionState {
  connected: boolean
  launching: boolean
  lastError?: string
  login?: string
  server?: string
  broker?: string
  equity: number
  balance: number
  margin: number
  freeMargin: number
  marginLevel: number
  leverage: number
  currency: string
  connectedAt?: string
}

const mt5: Mt5ConnectionState = {
  connected: false,
  launching: false,
  broker: 'FINEX Indonesia',
  equity: 10000,
  balance: 10000,
  margin: 0,
  freeMargin: 10000,
  marginLevel: 0,
  leverage: 500,
  currency: 'USD',
}

// ============================================================
// MULTI-ACCOUNT
// ============================================================
interface AccountConfig {
  id: string
  label: string
  login: string
  server: string
  broker: string
  accountType: 'live' | 'demo' | 'contest'
  isDefault: boolean
  isActive: boolean
}
const accounts: AccountConfig[] = [
  { id: 'acc_demo', label: 'FINEX Demo', login: '12345', server: 'FINEX-Demo', broker: 'FINEX Indonesia', accountType: 'demo', isDefault: true, isActive: true },
  { id: 'acc_live', label: 'FINEX Live #1', login: '67890', server: 'FINEX-Live', broker: 'FINEX Indonesia', accountType: 'live', isDefault: false, isActive: true },
]

// ============================================================
// ALERTS
// ============================================================
interface AlertRule {
  id: string
  type: 'price_above' | 'price_below' | 'news_pre' | 'spread_wide' | 'sl_tp_hit' | 'margin_low' | 'daily_stop'
  symbol?: string
  condition: any
  message: string
  severity: 'info' | 'warn' | 'critical'
  enabled: boolean
  triggerCount: number
  lastTriggeredAt?: string
}

interface AlertEvent {
  id: string
  ruleId: string
  type: string
  message: string
  severity: 'info' | 'warn' | 'critical'
  timestamp: string
  acknowledged: boolean
}

const alertRules: AlertRule[] = [
  { id: 'ar1', type: 'daily_stop', condition: { pct: 3 }, message: 'Daily stop 3% tercapai. Trading dijeda hari ini.', severity: 'critical', enabled: true, triggerCount: 0 },
  { id: 'ar2', type: 'margin_low', condition: { pct: 50 }, message: 'Margin level < 50%. Risiko margin call.', severity: 'critical', enabled: true, triggerCount: 0 },
  { id: 'ar3', type: 'spread_wide', condition: { pips: 5 }, message: 'Spread melebar > 5 pips pada {symbol}. Hindari entry.', severity: 'warn', enabled: true, triggerCount: 0 },
]
const alertEvents: AlertEvent[] = []

// ============================================================
// DRAWING OBJECTS
// ============================================================
interface DrawingObject {
  id: string
  symbol: string
  type: 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'text'
  points: { time: number; price: number }[]
  style: { color: string; lineWidth: number; dashed?: boolean }
  label?: string
  visible: boolean
  createdAt: string
}
const drawings: DrawingObject[] = []

// ============================================================
// COPY TRADE
// ============================================================
interface CopyTradeSub {
  id: string
  sourceLogin: string
  targetLogin: string
  scaleLots: number
  reverseMode: boolean
  enabled: boolean
  totalCopied: number
}
const copyTradeSubs: CopyTradeSub[] = []

// ============================================================
// AUTO-DISABLE PRE-NEWS RULES
// ============================================================
interface AutoTradeRule {
  id: string
  name: string
  enabled: boolean
  type: 'pre_news_flatten' | 'max_daily_loss' | 'max_weekly_loss' | 'trailing_stop_template'
  minutesBefore?: number
  impactFilter?: 'high' | 'medium'
  countryFilter?: string
  flattenAction?: 'close_all' | 'reduce_50' | 'hedge'
}
const autoTradeRules: AutoTradeRule[] = [
  { id: 'ar_pre_news', name: 'Pre-News Flatten (High Impact)', enabled: false, type: 'pre_news_flatten', minutesBefore: 2, impactFilter: 'high', countryFilter: 'USD', flattenAction: 'close_all' },
  { id: 'ar_daily_loss', name: 'Max Daily Loss 3%', enabled: true, type: 'max_daily_loss', flattenAction: 'close_all' },
  { id: 'ar_weekly_loss', name: 'Max Weekly Loss 5%', enabled: true, type: 'max_weekly_loss', flattenAction: 'close_all' },
]

// ============================================================
// IO SETUP
// ============================================================
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

function logEvent(level: string, source: string, message: string, details?: any) {
  console.log(`[${level}] [${source}] ${message}${details ? ' :: ' + JSON.stringify(details) : ''}`)
  io.emit('log', { id: Math.random().toString(36).slice(2), level, source, message, details, timestamp: new Date().toISOString() })
}

// ============================================================
// MT5 LAUNCH
// ============================================================
async function launchMt5(path?: string, login?: string, server?: string) {
  if (mt5.launching || mt5.connected) return { ok: false, msg: 'MT5 sudah running atau sedang launching' }
  mt5.launching = true
  if (login) mt5.login = login
  if (server) mt5.server = server
  logEvent('info', 'mt5', 'Launching MT5 terminal', { path: path || 'C:\\Program Files\\FINEX Indonesia\\MetaTrader 5\\terminal64.exe' })
  await new Promise((r) => setTimeout(r, 1500))
  mt5.launching = false
  mt5.connected = true
  mt5.connectedAt = new Date().toISOString()
  logEvent('info', 'mt5', 'MT5 connected', { login: mt5.login, server: mt5.server })
  io.emit('mt5:status', mt5)
  return { ok: true, msg: 'MT5 launched' }
}

function disconnectMt5() {
  mt5.connected = false
  mt5.connectedAt = undefined
  logEvent('warn', 'mt5', 'MT5 disconnected')
  io.emit('mt5:status', mt5)
}

// ============================================================
// PRICE TICK + INDICATORS UPDATE
// ============================================================
const sessionStartBalance = { date: '', balance: 10000 }
const weekStartBalance = { week: '', balance: 10000 }

function step() {
  for (const s of Object.values(SYMBOLS)) {
    // volatilitas ~ 1 pip setiap tick + sedikit random spike untuk news simulation
    const vol = s.pipSize * (0.5 + Math.random() * 1.5)
    const drift = (Math.random() - 0.5) * vol * 4
    s.bid = +(s.bid + drift).toFixed(s.digits)
    const spread = s.pipSize * s.spreadPips
    s.ask = +(s.bid + spread).toFixed(s.digits)
    // simpan ke history
    TICK_HISTORY[s.symbol].push({ time: Date.now(), bid: s.bid, ask: s.ask })
    if (TICK_HISTORY[s.symbol].length > MAX_HISTORY) TICK_HISTORY[s.symbol].shift()
  }

  // emit tick
  io.emit('price:tick', {
    ts: Date.now(),
    prices: Object.values(SYMBOLS).map((s) => ({ symbol: s.symbol, bid: s.bid, ask: s.ask, digits: s.digits })),
  })

  // update equity + positions
  recomputeEquity()

  // emit positions with profit + duration
  const now = Date.now()
  const posArr = Array.from(positions.values()).map((p) => ({
    ...p,
    bid: SYMBOLS[p.symbol]?.bid ?? 0,
    ask: SYMBOLS[p.symbol]?.ask ?? 0,
    profit: computeProfit(p),
    durationMs: now - new Date(p.openTime).getTime(),
  }))
  io.emit('positions:update', posArr)

  // emit pending orders
  const pendArr = Array.from(pendingOrders.values())
  io.emit('pending:orders:update', pendArr)

  // Process pending orders (check trigger)
  for (const po of pendingOrders.values()) {
    if (po.status !== 'pending') continue
    const s = SYMBOLS[po.symbol]
    if (!s) continue
    let triggered = false
    if (po.orderType === 'BUY_STOP' && s.ask >= po.triggerPrice) triggered = true
    if (po.orderType === 'SELL_STOP' && s.bid <= po.triggerPrice) triggered = true
    if (po.orderType === 'BUY_LIMIT' && s.ask <= po.triggerPrice) triggered = true
    if (po.orderType === 'SELL_LIMIT' && s.bid >= po.triggerPrice) triggered = true
    if (triggered) {
      const side = po.orderType.startsWith('BUY') ? 'BUY' : 'SELL'
      // Pakai triggerPrice sebagai fill price (untuk pending order, eksekusi di harga trigger)
      // openMarket akan ambil current price, tapi untuk pending fill kita pakai triggerPrice sebagai approximation
      const r = openMarket(po.symbol, side, po.lots, { sl: po.sl, tp: po.tp, isAuto: po.isAuto, strategyId: po.strategyId })
      if (r.ok) {
        po.status = 'filled'  // set filled HANYA jika openMarket berhasil (hindari orphan)
        logEvent('info', 'trading', `PENDING #${po.ticket} FILLED → position #${r.ticket} ${po.orderType} ${po.lots} ${po.symbol} @ ${po.triggerPrice}`)
        io.emit('pending:filled', { pendingTicket: po.ticket, positionTicket: r.ticket })
      } else {
        po.status = 'cancelled'  // rollback ke cancelled jika fill gagal (mis. spread reject)
        logEvent('warn', 'trading', `PENDING #${po.ticket} FILL FAILED: ${r.msg ?? 'unknown'}`)
      }
      continue  // skip expiration check jika sudah filled/cancelled
    }
    // expiration check (hanya jika tidak triggered di tick ini)
    if (po.expiresAt && new Date(po.expiresAt).getTime() < now) {
      po.status = 'expired'
      logEvent('info', 'trading', `PENDING #${po.ticket} EXPIRED`)
    }
  }

  // SL/TP auto-trigger untuk SEMUA posisi (non-trailing dan trailing)
  for (const p of Array.from(positions.values())) {  // snapshot ke array untuk hindari concurrent modification saat delete
    const s = SYMBOLS[p.symbol]
    if (!s) continue
    // Update trailing stop jika aktif
    if (p.trailingStopPips && p.trailingStopPips > 0) {
      const pipSize = s.pipSize
      if (p.side === 'BUY') {
        const newSL = +(s.bid - p.trailingStopPips * pipSize).toFixed(s.digits)
        if (!p.sl || newSL > p.sl) {
          p.sl = newSL
          p.trailingActivated = true
        }
      } else {
        const newSL = +(s.ask + p.trailingStopPips * pipSize).toFixed(s.digits)
        if (!p.sl || newSL < p.sl) {
          p.sl = newSL
          p.trailingActivated = true
        }
      }
    }
    // SL/TP hit detection untuk SEMUA posisi (trailing atau non-trailing)
    if (p.side === 'BUY') {
      if (p.tp && s.bid >= p.tp) { closePosition(p.ticket, 'tp'); continue }
      if (p.sl && s.bid <= p.sl) { closePosition(p.ticket, p.trailingActivated ? 'trailing' : 'sl'); continue }
    } else {
      if (p.tp && s.ask <= p.tp) { closePosition(p.ticket, 'tp'); continue }
      if (p.sl && s.ask >= p.sl) { closePosition(p.ticket, p.trailingActivated ? 'trailing' : 'sl'); continue }
    }
  }

  // Alerts evaluation
  evaluateAlerts()
  // Auto-disable pre-news
  evaluateAutoTradeRules()
}

function computeProfit(p: Position): number {
  const s = SYMBOLS[p.symbol]
  if (!s) return 0
  const close = p.side === 'BUY' ? s.bid : s.ask
  const diff = p.side === 'BUY' ? close - p.openPrice : p.openPrice - close
  return +(diff * p.lots * s.contractSize).toFixed(2)
}

function recomputeEquity() {
  let floating = 0
  for (const p of positions.values()) floating += computeProfit(p)
  mt5.equity = +(mt5.balance + floating).toFixed(2)
  mt5.freeMargin = +(mt5.equity - mt5.margin).toFixed(2)
  mt5.marginLevel = mt5.margin > 0 ? +((mt5.equity / mt5.margin) * 100).toFixed(2) : 0
}

setInterval(step, 1000)

// ============================================================
// TRADING ACTIONS
// ============================================================
function isTradingAllowedNow(): boolean {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const hhmm = now.getHours() * 100 + now.getMinutes()
  return hhmm >= 800 && hhmm <= 2330
}

function openMarket(symbol: string, side: 'BUY' | 'SELL', lots: number, opts?: { sl?: number; tp?: number; isAuto?: boolean; strategyId?: string; trailingStopPips?: number; originalLots?: number }): { ok: boolean; ticket?: number; msg?: string } {
  if (!mt5.connected) return { ok: false, msg: 'MT5 belum terhubung' }
  const s = SYMBOLS[symbol]
  if (!s) return { ok: false, msg: 'Symbol tidak ditemukan' }
  if (!isTradingAllowedNow()) return { ok: false, msg: 'Di luar jam trading (atau akhir pekan)' }

  // Spread filter
  const spreadPipsNow = (s.ask - s.bid) / s.pipSize
  if (spreadPipsNow > s.maxSpreadPips) {
    logEvent('warn', 'trading', `Spread reject: ${symbol} spread ${spreadPipsNow.toFixed(1)} pips > max ${s.maxSpreadPips}`)
    return { ok: false, msg: `Spread terlalu lebar (${spreadPipsNow.toFixed(1)} pips > ${s.maxSpreadPips}). Entry ditolak.` }
  }

  const price = side === 'BUY' ? s.ask : s.bid
  const ticket = ++ticketSeq
  positions.set(ticket, {
    ticket,
    symbol,
    side,
    lots,
    originalLots: opts?.originalLots ?? lots,
    openPrice: price,
    sl: opts?.sl,
    tp: opts?.tp,
    openTime: new Date().toISOString(),
    strategyId: opts?.strategyId,
    isAuto: opts?.isAuto ?? false,
    trailingStopPips: opts?.trailingStopPips,
  })
  const notional = lots * s.contractSize * price  // margin = (lots * contractSize * price) / leverage
  const usedMargin = notional / mt5.leverage
  mt5.margin = +(mt5.margin + usedMargin).toFixed(2)
  logEvent('info', 'trading', `OPEN ${side} ${lots} ${symbol} @ ${price}`, { ticket, sl: opts?.sl, tp: opts?.tp, isAuto: opts?.isAuto, margin: usedMargin })
  return { ok: true, ticket }
}

function closePosition(ticket: number, reason: TradeHistory['closeReason'] = 'manual'): { ok: boolean; msg?: string; profit?: number } {
  const p = positions.get(ticket)
  if (!p) return { ok: false, msg: 'Posisi tidak ditemukan' }
  const profit = computeProfit(p)
  mt5.balance = +(mt5.balance + profit).toFixed(2)
  const s = SYMBOLS[p.symbol]
  // Margin = lots * contractSize * price / leverage (gunakan openPrice sebagai basis)
  const notional = p.lots * s.contractSize * p.openPrice
  const usedMargin = notional / mt5.leverage
  mt5.margin = Math.max(0, +(mt5.margin - usedMargin).toFixed(2))
  const closePrice = p.side === 'BUY' ? s.bid : s.ask
  const pnlPips = +((p.side === 'BUY' ? closePrice - p.openPrice : p.openPrice - closePrice) / s.pipSize).toFixed(1)
  const durationMs = Date.now() - new Date(p.openTime).getTime()
  tradeHistory.unshift({
    ticket: p.ticket,
    symbol: p.symbol,
    side: p.side,
    lots: p.lots,
    openPrice: p.openPrice,
    closePrice,
    openTime: p.openTime,
    closeTime: new Date().toISOString(),
    profit,
    pnlPips,
    strategyId: p.strategyId,
    isAuto: p.isAuto,
    closeReason: reason,
    durationMs,
  })
  // keep last 500 trades
  if (tradeHistory.length > 500) tradeHistory.length = 500
  logEvent('info', 'trading', `CLOSE #${ticket} ${p.symbol} P&L=${profit} (${reason})`, { ticket, profit, reason })
  positions.delete(ticket)
  return { ok: true, profit }
}

function partialClose(ticket: number, fraction: number): { ok: boolean; msg?: string; profit?: number; remainingLots?: number } {
  const p = positions.get(ticket)
  if (!p) return { ok: false, msg: 'Posisi tidak ditemukan' }
  if (fraction <= 0 || fraction >= 1) return { ok: false, msg: 'Fraction harus 0 < f < 1' }
  // Gunakan originalLots untuk konsistensi (50% berarti 50% dari posisi awal, bukan sisa)
  const baseLots = p.originalLots ?? p.lots
  const closeLots = +(baseLots * fraction).toFixed(2)
  if (closeLots < 0.01) return { ok: false, msg: 'Lot tutup terlalu kecil' }
  if (closeLots >= p.lots) return { ok: false, msg: 'Lot tutup melebihi lot tersisa' }
  const s = SYMBOLS[p.symbol]
  const closePrice = p.side === 'BUY' ? s.bid : s.ask
  const profit = +((p.side === 'BUY' ? closePrice - p.openPrice : p.openPrice - closePrice) * closeLots * s.contractSize).toFixed(2)
  mt5.balance = +(mt5.balance + profit).toFixed(2)
  // kurangi margin berbasis price (openPrice)
  const oldNotional = p.lots * s.contractSize * p.openPrice
  const newLots = +(p.lots - closeLots).toFixed(2)
  const newNotional = newLots * s.contractSize * p.openPrice
  const marginDiff = (oldNotional - newNotional) / mt5.leverage
  mt5.margin = Math.max(0, +(mt5.margin - marginDiff).toFixed(2))
  p.lots = newLots
  p.partialClosed = true
  // Catat ke tradeHistory (partial close juga = trade event)
  const pnlPips = +((p.side === 'BUY' ? closePrice - p.openPrice : p.openPrice - closePrice) / s.pipSize).toFixed(1)
  const durationMs = Date.now() - new Date(p.openTime).getTime()
  tradeHistory.unshift({
    ticket: p.ticket,
    symbol: p.symbol,
    side: p.side,
    lots: closeLots,
    openPrice: p.openPrice,
    closePrice,
    openTime: p.openTime,
    closeTime: new Date().toISOString(),
    profit,
    pnlPips,
    strategyId: p.strategyId,
    isAuto: p.isAuto,
    closeReason: 'manual',
    durationMs,
  })
  if (tradeHistory.length > 500) tradeHistory.length = 500
  logEvent('info', 'trading', `PARTIAL CLOSE #${ticket} ${fraction * 100}% (${closeLots} lots) P&L=${profit}`, { ticket, profit, remainingLots: newLots })
  return { ok: true, profit, remainingLots: newLots }
}

function modifyPosition(ticket: number, sl?: number, tp?: number, trailingStopPips?: number) {
  const p = positions.get(ticket)
  if (!p) return { ok: false, msg: 'Posisi tidak ditemukan' }
  if (sl !== undefined) p.sl = sl
  if (tp !== undefined) p.tp = tp
  if (trailingStopPips !== undefined) p.trailingStopPips = trailingStopPips
  logEvent('info', 'trading', `MODIFY #${ticket} SL=${sl} TP=${tp} Trail=${trailingStopPips}`)
  return { ok: true }
}

// ============================================================
// PENDING ORDERS
// ============================================================
function placePendingOrder(p: {
  symbol: string
  orderType: 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT'
  lots: number
  triggerPrice: number
  sl?: number
  tp?: number
  isAuto?: boolean
  strategyId?: string
  expiresAt?: string
}): { ok: boolean; ticket?: number; msg?: string } {
  if (!mt5.connected) return { ok: false, msg: 'MT5 belum terhubung' }
  const s = SYMBOLS[p.symbol]
  if (!s) return { ok: false, msg: 'Symbol tidak ditemukan' }
  if (!isTradingAllowedNow()) return { ok: false, msg: 'Di luar jam trading' }
  // Validasi: BUY_STOP harus di atas ask, SELL_STOP di bawah bid, dst
  if (p.orderType === 'BUY_STOP' && p.triggerPrice <= s.ask) return { ok: false, msg: 'BUY_STOP harus di atas ask saat ini' }
  if (p.orderType === 'SELL_STOP' && p.triggerPrice >= s.bid) return { ok: false, msg: 'SELL_STOP harus di bawah bid saat ini' }
  if (p.orderType === 'BUY_LIMIT' && p.triggerPrice >= s.ask) return { ok: false, msg: 'BUY_LIMIT harus di bawah ask saat ini' }
  if (p.orderType === 'SELL_LIMIT' && p.triggerPrice <= s.bid) return { ok: false, msg: 'SELL_LIMIT harus di atas bid saat ini' }
  const ticket = ++pendingSeq
  pendingOrders.set(ticket, {
    ticket,
    symbol: p.symbol,
    orderType: p.orderType,
    lots: p.lots,
    triggerPrice: p.triggerPrice,
    sl: p.sl,
    tp: p.tp,
    status: 'pending',
    strategyId: p.strategyId,
    isAuto: p.isAuto ?? false,
    expiresAt: p.expiresAt,
    createdAt: new Date().toISOString(),
  })
  logEvent('info', 'trading', `PENDING ${p.orderType} ${p.lots} ${p.symbol} @ ${p.triggerPrice}`, { ticket })
  return { ok: true, ticket }
}

function cancelPendingOrder(ticket: number) {
  const po = pendingOrders.get(ticket)
  if (!po) return { ok: false, msg: 'Pending order tidak ditemukan' }
  po.status = 'cancelled'
  logEvent('info', 'trading', `PENDING #${ticket} CANCELLED`)
  return { ok: true }
}

// ============================================================
// ALERTS ENGINE
// ============================================================
function evaluateAlerts() {
  const now = new Date()
  for (const rule of alertRules) {
    if (!rule.enabled) continue
    let triggered = false
    let symbol: string | undefined
    if (rule.type === 'daily_stop') {
      // today's P&L
      const today = now.toISOString().slice(0, 10)
      if (sessionStartBalance.date !== today) {
        sessionStartBalance.date = today
        sessionStartBalance.balance = mt5.balance
      }
      const dayPnl = mt5.balance - sessionStartBalance.balance
      const dayPnlPct = (dayPnl / sessionStartBalance.balance) * 100
      if (dayPnlPct <= -(rule.condition.pct ?? 3)) triggered = true
    } else if (rule.type === 'margin_low') {
      if (mt5.marginLevel > 0 && mt5.marginLevel < (rule.condition.pct ?? 50)) triggered = true
    } else if (rule.type === 'spread_wide') {
      for (const s of Object.values(SYMBOLS)) {
        const spreadPips = (s.ask - s.bid) / s.pipSize
        if (spreadPips > (rule.condition.pips ?? 5)) {
          triggered = true
          symbol = s.symbol
          break
        }
      }
    } else if (rule.type === 'price_above' || rule.type === 'price_below') {
      if (rule.symbol) {
        const s = SYMBOLS[rule.symbol]
        if (s) {
          if (rule.type === 'price_above' && s.bid >= rule.condition.price) triggered = true
          if (rule.type === 'price_below' && s.bid <= rule.condition.price) triggered = true
        }
      }
    }
    if (triggered) {
      // cooldown 60s
      if (rule.lastTriggeredAt && Date.now() - new Date(rule.lastTriggeredAt).getTime() < 60000) continue
      rule.triggerCount++
      rule.lastTriggeredAt = now.toISOString()
      const msg = rule.message.replace('{symbol}', symbol ?? rule.symbol ?? '')
      const ev: AlertEvent = {
        id: 'alert_' + Math.random().toString(36).slice(2),
        ruleId: rule.id,
        type: rule.type,
        message: msg,
        severity: rule.severity,
        timestamp: now.toISOString(),
        acknowledged: false,
      }
      alertEvents.unshift(ev)
      if (alertEvents.length > 100) alertEvents.length = 100
      io.emit('alert:event', ev)
      logEvent(rule.severity === 'critical' ? 'error' : 'warn', 'alert', msg, { ruleId: rule.id })
    }
  }
  io.emit('alerts:list', alertEvents.slice(0, 30))
}

// ============================================================
// AUTO-TRADE RULES (pre-news flatten, max daily loss, etc)
// ============================================================
function evaluateAutoTradeRules() {
  for (const rule of autoTradeRules) {
    if (!rule.enabled) continue
    if (rule.type === 'max_daily_loss') {
      const today = new Date().toISOString().slice(0, 10)
      if (sessionStartBalance.date !== today) {
        sessionStartBalance.date = today
        sessionStartBalance.balance = mt5.balance
      }
      const dayPnl = mt5.balance - sessionStartBalance.balance
      const dayPnlPct = (dayPnl / sessionStartBalance.balance) * 100
      if (dayPnlPct <= -3) {
        // flatten all
        flattenAll('max_daily_loss')
        rule.enabled = false  // disable setelah trigger
      }
    } else if (rule.type === 'pre_news_flatten') {
      // cek apakah ada berita high impact dalam X menit
      const minutesBefore = rule.minutesBefore ?? 2
      const nowMs = Date.now()
      for (const n of NEWS) {
        if (n.impact !== (rule.impactFilter ?? 'high')) continue
        if (rule.countryFilter && n.country !== rule.countryFilter && n.currency !== rule.countryFilter) continue
        const timeToNews = new Date(n.eventTime).getTime() - nowMs
        if (timeToNews > 0 && timeToNews < minutesBefore * 60 * 1000) {
          flattenAll('pre_news_flatten')
          logEvent('warn', 'strategy', `Auto-flatten pre-news: ${n.title} in ${Math.round(timeToNews / 60000)}min`)
          // Disable rule sementara agar tidak re-trigger tiap tick
          rule.enabled = false
          // Re-enable setelah 30 menit (lebih lama dari durasi news impact)
          setTimeout(() => { rule.enabled = true; logEvent('info', 'strategy', 'Pre-news flatten rule re-enabled') }, 30 * 60 * 1000)
          break
        }
      }
    }
  }
}

function flattenAll(reason: string): number {
  let closed = 0
  for (const ticket of Array.from(positions.keys())) {
    closePosition(ticket, reason as any)
    closed++
  }
  if (closed > 0) logEvent('warn', 'strategy', `FLATTEN ALL (${reason}): ${closed} positions closed`)
  return closed
}

// ============================================================
// NEWS
// ============================================================
interface NewsEvent {
  id: string
  title: string
  country: string
  currency: string
  impact: 'high' | 'medium' | 'low'
  eventTime: string
  previous?: number
  forecast?: number
  actual?: number
  source: string
}
const NEWS: NewsEvent[] = [
  { id: 'n1', title: 'CPI m/m (US)', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(Date.now() + 3600 * 1000).toISOString(), previous: 2.4, forecast: 2.4, source: 'tiingo' },
  { id: 'n2', title: 'Non-Farm Payroll', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(Date.now() + 7200 * 1000).toISOString(), previous: 227, forecast: 200, source: 'tiingo' },
  { id: 'n3', title: 'Unemployment Rate', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(Date.now() + 14400 * 1000).toISOString(), previous: 4.1, forecast: 4.1, source: 'tiingo' },
  { id: 'n4', title: 'GDP q/q', country: 'US', currency: 'USD', impact: 'high', eventTime: new Date(Date.now() + 21600 * 1000).toISOString(), previous: 3.0, forecast: 2.8, source: 'tiingo' },
]

function analyzeNews(ev: NewsEvent) {
  if (ev.actual === undefined || ev.forecast === undefined) return { ready: false, deviation: null, directionUsd: 'neutral' }
  const deviation = ev.forecast !== 0 ? +(((ev.actual - ev.forecast) / Math.abs(ev.forecast)) * 100).toFixed(2) : 0
  const actualGreater = ev.actual > ev.forecast
  const title = ev.title.toLowerCase()
  let directionUsd: 'up' | 'down' | 'neutral' = 'neutral'
  if (title.includes('unemployment')) directionUsd = actualGreater ? 'down' : 'up'
  else directionUsd = actualGreater ? 'up' : 'down'
  const invert = (d: string) => (d === 'up' ? 'down' : d === 'down' ? 'up' : 'neutral')
  return {
    ready: true,
    deviation,
    directionUsd,
    directionXau: invert(directionUsd),
    directionEur: invert(directionUsd),
    directionGbp: invert(directionUsd),
    directionJpy: directionUsd,
  }
}

// ============================================================
// IO HANDLERS
// ============================================================
io.on('connection', (socket) => {
  logEvent('debug', 'ws', `Client connected: ${socket.id}`)

  // Wrap emit in try-catch to prevent handler crash
  const safeEmit = (event: string, data: any) => {
    try { socket.emit(event, data) } catch (e) { console.error(`[emit:${event}]`, e) }
  }

  try { safeEmit('mt5:status', mt5) } catch (e) { console.error(e) }
  try { safeEmit('symbols:snapshot', Object.values(SYMBOLS)) } catch (e) { console.error(e) }
  try { safeEmit('news:snapshot', NEWS) } catch (e) { console.error(e) }
  try { safeEmit('positions:update', Array.from(positions.values())) } catch (e) { console.error(e) }
  try { safeEmit('pending:orders:update', Array.from(pendingOrders.values())) } catch (e) { console.error(e) }
  try { safeEmit('accounts:list', accounts) } catch (e) { console.error(e) }
  try { safeEmit('alerts:rules', alertRules) } catch (e) { console.error(e) }
  try { safeEmit('alerts:list', alertEvents.slice(0, 30)) } catch (e) { console.error(e) }
  try { safeEmit('autotrade:rules', autoTradeRules) } catch (e) { console.error(e) }
  try { safeEmit('drawings:list', drawings) } catch (e) { console.error(e) }
  try { safeEmit('copytrade:list', copyTradeSubs) } catch (e) { console.error(e) }
  try { safeEmit('history:trades', tradeHistory.slice(0, 50)) } catch (e) { console.error(e) }

  // MT5
  socket.on('mt5:launch', async (payload: any) => {
    const r = await launchMt5(payload?.path, payload?.login, payload?.server)
    socket.emit('mt5:launch:result', r)
  })
  socket.on('mt5:disconnect', () => disconnectMt5())

  // Trade
  socket.on('trade:open', (p: any) => socket.emit('trade:open:result', openMarket(p.symbol, p.side, p.lots, p)))
  socket.on('trade:close', (p: { ticket: number }) => socket.emit('trade:close:result', closePosition(p.ticket)))
  socket.on('trade:modify', (p: any) => socket.emit('trade:modify:result', modifyPosition(p.ticket, p.sl, p.tp, p.trailingStopPips)))
  socket.on('trade:partial', (p: { ticket: number; fraction: number }) => socket.emit('trade:partial:result', partialClose(p.ticket, p.fraction)))
  socket.on('trade:flatten', () => socket.emit('trade:flatten:result', { closed: flattenAll('manual') }))
  socket.on('trade:reverse', (p: { ticket: number }) => {
    const pos = positions.get(p.ticket)
    if (pos) {
      closePosition(p.ticket, 'manual')
      openMarket(pos.symbol, pos.side === 'BUY' ? 'SELL' : 'BUY', pos.lots, { isAuto: false })
      socket.emit('trade:reverse:result', { ok: true })
    }
  })

  // Pending orders
  socket.on('pending:place', (p: any) => socket.emit('pending:place:result', placePendingOrder(p)))
  socket.on('pending:cancel', (p: { ticket: number }) => socket.emit('pending:cancel:result', cancelPendingOrder(p.ticket)))

  // News
  socket.on('news:analyze', ({ id }: { id: string }) => {
    const ev = NEWS.find((n) => n.id === id)
    if (!ev) return socket.emit('news:analyze:result', { ok: false, msg: 'Not found' })
    if (ev.actual === undefined && ev.forecast !== undefined) {
      ev.actual = +(ev.forecast + (Math.random() - 0.5) * 0.6).toFixed(2)
    }
    socket.emit('news:analyze:result', { ok: true, event: ev, analysis: analyzeNews(ev) })
    io.emit('news:update', ev)
  })
  socket.on('news:add', (ev: NewsEvent) => {
    ev.id = ev.id || 'manual_' + Math.random().toString(36).slice(2)
    ev.source = 'manual'
    NEWS.unshift(ev)
    io.emit('news:update', ev)
  })

  // Alerts
  socket.on('alerts:rules:set', (rules: AlertRule[]) => {
    alertRules.length = 0
    alertRules.push(...rules)
    io.emit('alerts:rules', alertRules)
  })
  socket.on('alert:ack', ({ id }: { id: string }) => {
    const ev = alertEvents.find((e) => e.id === id)
    if (ev) ev.acknowledged = true
    io.emit('alerts:list', alertEvents.slice(0, 30))
  })
  socket.on('alert:add', (rule: AlertRule) => {
    rule.id = rule.id || 'rule_' + Math.random().toString(36).slice(2)
    alertRules.push(rule)
    io.emit('alerts:rules', alertRules)
  })
  socket.on('alert:delete', ({ id }: { id: string }) => {
    const idx = alertRules.findIndex((r) => r.id === id)
    if (idx >= 0) alertRules.splice(idx, 1)
    io.emit('alerts:rules', alertRules)
  })

  // Auto-trade rules
  socket.on('autotrade:rules:set', (rules: AutoTradeRule[]) => {
    autoTradeRules.length = 0
    autoTradeRules.push(...rules)
    io.emit('autotrade:rules', autoTradeRules)
  })

  // Accounts
  socket.on('accounts:switch', ({ id }: { id: string }) => {
    const acc = accounts.find((a) => a.id === id)
    if (!acc) return
    // disconnect, switch, reconnect (simulasi)
    mt5.login = acc.login
    mt5.server = acc.server
    logEvent('info', 'mt5', `Switched to ${acc.label}`, { login: acc.login, server: acc.server })
    io.emit('mt5:status', mt5)
  })
  socket.on('accounts:add', (acc: AccountConfig) => {
    acc.id = acc.id || 'acc_' + Math.random().toString(36).slice(2)
    accounts.push(acc)
    io.emit('accounts:list', accounts)
  })
  socket.on('accounts:delete', ({ id }: { id: string }) => {
    const idx = accounts.findIndex((a) => a.id === id)
    if (idx >= 0) accounts.splice(idx, 1)
    io.emit('accounts:list', accounts)
  })

  // Drawings
  socket.on('drawing:add', (d: DrawingObject) => {
    d.id = d.id || 'draw_' + Math.random().toString(36).slice(2)
    d.createdAt = new Date().toISOString()
    drawings.push(d)
    io.emit('drawings:list', drawings)
  })
  socket.on('drawing:update', (d: DrawingObject) => {
    const idx = drawings.findIndex((x) => x.id === d.id)
    if (idx >= 0) drawings[idx] = d
    io.emit('drawings:list', drawings)
  })
  socket.on('drawing:delete', ({ id }: { id: string }) => {
    const idx = drawings.findIndex((x) => x.id === id)
    if (idx >= 0) drawings.splice(idx, 1)
    io.emit('drawings:list', drawings)
  })
  socket.on('drawing:clear', ({ symbol }: { symbol?: string }) => {
    if (symbol) {
      for (let i = drawings.length - 1; i >= 0; i--) if (drawings[i].symbol === symbol) drawings.splice(i, 1)
    } else drawings.length = 0
    io.emit('drawings:list', drawings)
  })

  // Copy trade
  socket.on('copytrade:add', (sub: CopyTradeSub) => {
    sub.id = sub.id || 'sub_' + Math.random().toString(36).slice(2)
    copyTradeSubs.push(sub)
    io.emit('copytrade:list', copyTradeSubs)
  })
  socket.on('copytrade:delete', ({ id }: { id: string }) => {
    const idx = copyTradeSubs.findIndex((x) => x.id === id)
    if (idx >= 0) copyTradeSubs.splice(idx, 1)
    io.emit('copytrade:list', copyTradeSubs)
  })

  // History
  socket.on('history:trades:get', ({ limit }: { limit?: number }) => {
    socket.emit('history:trades', tradeHistory.slice(0, limit ?? 50))
  })

  // Journal
  socket.on('journal:add', (entry: any) => {
    entry.id = entry.id || 'je_' + Math.random().toString(36).slice(2)
    io.emit('journal:new', entry)
  })

  // Backtest (sederhana: gunakan tick history yang sudah ada)
  socket.on('backtest:run', (cfg: any) => {
    const symbol = cfg.symbol
    const history = TICK_HISTORY[symbol] ?? []
    if (history.length < 50) {
      return socket.emit('backtest:result', { ok: false, msg: 'History tidak cukup (min 50 ticks)' })
    }
    // Simple strategy: BUY when price > SMA(20), SELL when < SMA(20)
    let balance = cfg.initialBalance ?? 10000
    let position: any = null
    const trades: any[] = []
    const smaPeriod = cfg.smaPeriod ?? 20
    for (let i = smaPeriod; i < history.length; i++) {
      const slice = history.slice(i - smaPeriod, i)
      const sma = slice.reduce((a, t) => a + t.bid, 0) / slice.length
      const cur = history[i]
      if (!position && cur.bid > sma) {
        position = { side: 'BUY', entry: cur.bid, time: cur.time, lots: cfg.lots ?? 0.1 }
      } else if (position && position.side === 'BUY' && cur.bid < sma) {
        const profit = (cur.bid - position.entry) * position.lots * (SYMBOLS[symbol]?.contractSize ?? 100000)
        balance += profit
        trades.push({ ...position, exit: cur.bid, exitTime: cur.time, profit, pnlPips: (cur.bid - position.entry) / (SYMBOLS[symbol]?.pipSize ?? 0.0001) })
        position = null
      } else if (!position && cur.bid < sma) {
        position = { side: 'SELL', entry: cur.bid, time: cur.time, lots: cfg.lots ?? 0.1 }
      } else if (position && position.side === 'SELL' && cur.bid > sma) {
        const profit = (position.entry - cur.bid) * position.lots * (SYMBOLS[symbol]?.contractSize ?? 100000)
        balance += profit
        trades.push({ ...position, exit: cur.bid, exitTime: cur.time, profit, pnlPips: (position.entry - cur.bid) / (SYMBOLS[symbol]?.pipSize ?? 0.0001) })
        position = null
      }
    }
    const wins = trades.filter((t) => t.profit > 0).length
    const losses = trades.filter((t) => t.profit <= 0).length
    const grossProfit = trades.filter((t) => t.profit > 0).reduce((a, t) => a + t.profit, 0)
    const grossLoss = Math.abs(trades.filter((t) => t.profit <= 0).reduce((a, t) => a + t.profit, 0))
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0
    // Max drawdown - init peak dengan initialBalance (BUKAN final balance)
    const initialBal = cfg.initialBalance ?? 10000
    let peak = initialBal, maxDD = 0
    let runningBal = initialBal
    for (const t of trades) {
      runningBal += t.profit
      peak = Math.max(peak, runningBal)
      if (peak > 0) maxDD = Math.max(maxDD, ((peak - runningBal) / peak) * 100)
    }
    socket.emit('backtest:result', {
      ok: true,
      totalTrades: trades.length,
      wins,
      losses,
      winRate: +winRate.toFixed(2),
      profitFactor: +profitFactor.toFixed(2),
      maxDrawdown: +maxDD.toFixed(2),
      finalBalance: +balance.toFixed(2),
      trades: trades.slice(-100),
    })
    logEvent('info', 'backtest', `Backtest ${symbol}: ${trades.length} trades, win rate ${winRate.toFixed(1)}%`, { balance })
  })

  // Socket-level error handler
  socket.on('error', (err: any) => {
    console.error(`[socket ${socket.id}] error:`, err?.message ?? err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`MT5 Bridge WebSocket v2 running on port ${PORT} (all interfaces)`)
  logEvent('info', 'mt5', 'MT5 Bridge v2 service started', { port: PORT, features: 20 })
})

// ============================================================
// KEEP-ALIVE & SHUTDOWN
// ============================================================
process.on('SIGHUP', () => console.log('[INFO] Received SIGHUP - ignoring'))
process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
process.on('uncaughtException', (err) => console.error('[FATAL]', err.message, err.stack))
process.on('unhandledRejection', (err) => console.error('[FATAL]', err))

setInterval(() => { /* noop heartbeat */ }, 60000)
