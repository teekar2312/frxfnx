// MT5 Bridge Mini-Service
// Mensimulasikan koneksi MetaTrader 5 (di production dijalankan via Python MetaTrader5 lib di Windows 11)
// + Auto-launch MT5 jika belum running
// + Real-time price tick simulation (random walk bid/ask)
// + Manajemen posisi virtual (untuk demo sebelum koneksi real)
// + Tiingo news fetch (cron sederhana)
//
// WebSocket path: "/" pada port 3004

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3004

// ============================================================
// SYMBOLS - sesuai user request: XAU/USD, EUR/USD, GBP/USD, USD/JPY
// ============================================================
interface SymbolState {
  symbol: string
  bid: number
  ask: number
  digits: number
  pipSize: number
  contractSize: number
  spreadPips: number
}

// Initial harga spot referensi (semi realistis)
const SYMBOLS: Record<string, SymbolState> = {
  'XAU/USD': { symbol: 'XAU/USD', bid: 2635.50, ask: 2635.80, digits: 2, pipSize: 0.10, contractSize: 100, spreadPips: 3 },
  'EUR/USD': { symbol: 'EUR/USD', bid: 1.08320, ask: 1.08332, digits: 5, pipSize: 0.0001, contractSize: 100000, spreadPips: 1.2 },
  'GBP/USD': { symbol: 'GBP/USD', bid: 1.26580, ask: 1.26595, digits: 5, pipSize: 0.0001, contractSize: 100000, spreadPips: 1.5 },
  'USD/JPY': { symbol: 'USD/JPY', bid: 154.320, ask: 154.335, digits: 3, pipSize: 0.01, contractSize: 100000, spreadPips: 1.4 },
}

// ============================================================
// POSISI VIRTUAL (in-memory)
// ============================================================
interface Position {
  ticket: number
  symbol: string
  side: 'BUY' | 'SELL'
  lots: number
  openPrice: number
  sl?: number
  tp?: number
  openTime: string
  strategyId?: string
  isAuto: boolean
}

const positions = new Map<number, Position>()
let ticketSeq = 100000

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
// EVENT EMITTER helper
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
// MT5 AUTO-LAUNCH LOGIC
// (Di production: spawn terminal64.exe via Python subprocess; di sandbox: simulasi)
// ============================================================
async function launchMt5(path?: string) {
  if (mt5.launching || mt5.connected) return { ok: false, msg: 'MT5 sudah running atau sedang launching' }
  mt5.launching = true
  logEvent('info', 'mt5', 'Launching MT5 terminal', { path: path || 'C:\\Program Files\\FINEX Indonesia\\MetaTrader 5\\terminal64.exe' })
  // Simulasi waktu startup MT5 (real MT5 sekitar 3-8 detik untuk login)
  await new Promise((r) => setTimeout(r, 2000))
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
// PRICE TICK SIMULATION (random walk)
// ============================================================
function step() {
  for (const s of Object.values(SYMBOLS)) {
    // volatilitas ~ 1 pip setiap tick
    const vol = s.pipSize * (0.5 + Math.random() * 1.5)
    const drift = (Math.random() - 0.5) * vol * 4
    s.bid = +(s.bid + drift).toFixed(s.digits)
    const spread = s.pipSize * s.spreadPips
    s.ask = +(s.bid + spread).toFixed(s.digits)
  }
  // emit tick ke semua subscriber
  io.emit('price:tick', {
    ts: Date.now(),
    prices: Object.values(SYMBOLS).map((s) => ({ symbol: s.symbol, bid: s.bid, ask: s.ask, digits: s.digits })),
  })
  // hitung floating P&L dan update equity
  recomputeEquity()
  // broadcast positions dengan profit live
  const posArr = Array.from(positions.values()).map((p) => ({
    ...p,
    bid: SYMBOLS[p.symbol]?.bid ?? 0,
    ask: SYMBOLS[p.symbol]?.ask ?? 0,
    profit: computeProfit(p),
  }))
  io.emit('positions:update', posArr)
}

function computeProfit(p: Position): number {
  const s = SYMBOLS[p.symbol]
  if (!s) return 0
  const close = p.side === 'BUY' ? s.bid : s.ask
  const diff = (p.side === 'BUY' ? close - p.openPrice : p.openPrice - close)
  const valuePerPricePerLot = s.contractSize
  return +(diff * p.lots * valuePerPricePerLot).toFixed(2)
}

function recomputeEquity() {
  let floating = 0
  for (const p of positions.values()) floating += computeProfit(p)
  mt5.equity = +(mt5.balance + floating).toFixed(2)
  mt5.freeMargin = +(mt5.equity - mt5.margin).toFixed(2)
  mt5.marginLevel = mt5.margin > 0 ? +((mt5.equity / mt5.margin) * 100).toFixed(2) : 0
}

// tick setiap 1 detik
setInterval(step, 1000)

// ============================================================
// TRADING ACTIONS (in-memory, mirip API MT5)
// ============================================================
function openMarket(symbol: string, side: 'BUY' | 'SELL', lots: number, opts?: { sl?: number; tp?: number; isAuto?: boolean; strategyId?: string }): { ok: boolean; ticket?: number; msg?: string } {
  if (!mt5.connected) return { ok: false, msg: 'MT5 belum terhubung' }
  const s = SYMBOLS[symbol]
  if (!s) return { ok: false, msg: 'Symbol tidak ditemukan' }
  if (!isTradingAllowedNow()) return { ok: false, msg: 'Di luar jam trading (atau akhir pekan)' }
  const price = side === 'BUY' ? s.ask : s.bid
  const ticket = ++ticketSeq
  positions.set(ticket, {
    ticket,
    symbol,
    side,
    lots,
    openPrice: price,
    sl: opts?.sl,
    tp: opts?.tp,
    openTime: new Date().toISOString(),
    strategyId: opts?.strategyId,
    isAuto: opts?.isAuto ?? false,
  })
  // sederhana: margin = lots * contractSize / leverage
  const notional = lots * s.contractSize
  const usedMargin = notional / mt5.leverage
  mt5.margin = +(mt5.margin + usedMargin).toFixed(2)
  logEvent('info', 'trading', `OPEN ${side} ${lots} ${symbol} @ ${price}`, { ticket, sl: opts?.sl, tp: opts?.tp, isAuto: opts?.isAuto })
  return { ok: true, ticket }
}

function closePosition(ticket: number): { ok: boolean; msg?: string; profit?: number } {
  const p = positions.get(ticket)
  if (!p) return { ok: false, msg: 'Posisi tidak ditemukan' }
  const profit = computeProfit(p)
  mt5.balance = +(mt5.balance + profit).toFixed(2)
  const s = SYMBOLS[p.symbol]
  const notional = p.lots * s.contractSize
  const usedMargin = notional / mt5.leverage
  mt5.margin = +(mt5.margin - usedMargin).toFixed(2)
  logEvent('info', 'trading', `CLOSE #${ticket} ${p.symbol} P&L=${profit}`, { ticket, profit })
  positions.delete(ticket)
  return { ok: true, profit }
}

function modifyPosition(ticket: number, sl?: number, tp?: number) {
  const p = positions.get(ticket)
  if (!p) return { ok: false, msg: 'Posisi tidak ditemukan' }
  if (sl !== undefined) p.sl = sl
  if (tp !== undefined) p.tp = tp
  logEvent('info', 'trading', `MODIFY #${ticket} SL=${sl} TP=${tp}`)
  return { ok: true }
}

// ============================================================
// TRADING SCHEDULE (jam trading + anti-weekend)
// Default: Mon-Fri, 08:00-23:30 (Asia+London+NY overlap)
// ============================================================
function isTradingAllowedNow(): boolean {
  const now = new Date()
  const day = now.getDay() // 0=Sunday, 6=Saturday
  if (day === 0 || day === 6) return false // Sabtu & Minggu diblok
  const hhmm = now.getHours() * 100 + now.getMinutes()
  // untuk demo, izinkan selain weekend
  return hhmm >= 800 && hhmm <= 2330
}

// ============================================================
// NEWS (mocked Tiingo-style events) + 3 angka emas analyzer
// ============================================================
interface NewsEvent {
  id: string
  title: string
  country: string
  currency: string
  impact: 'high' | 'medium' | 'low'
  eventTime: string // ISO
  previous?: number
  forecast?: number
  actual?: number
  source: string
}

const NEWS: NewsEvent[] = [
  {
    id: 'n1', title: 'CPI m/m (US)', country: 'US', currency: 'USD', impact: 'high',
    eventTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    previous: 2.4, forecast: 2.4, source: 'tiingo',
  },
  {
    id: 'n2', title: 'Non-Farm Payroll', country: 'US', currency: 'USD', impact: 'high',
    eventTime: new Date(Date.now() + 7200 * 1000).toISOString(),
    previous: 227, forecast: 200, source: 'tiingo',
  },
  {
    id: 'n3', title: 'Unemployment Rate', country: 'US', currency: 'USD', impact: 'high',
    eventTime: new Date(Date.now() + 14400 * 1000).toISOString(),
    previous: 4.1, forecast: 4.1, source: 'tiingo',
  },
  {
    id: 'n4', title: 'GDP q/q', country: 'US', currency: 'USD', impact: 'high',
    eventTime: new Date(Date.now() + 21600 * 1000).toISOString(),
    previous: 3.0, forecast: 2.8, source: 'tiingo',
  },
]

// Reaksi kilat: rumus user- Tiga Angka Emas
function analyzeNews(ev: NewsEvent) {
  if (ev.actual === undefined || ev.forecast === undefined) {
    return { ready: false, deviation: null, directionUsd: 'neutral' }
  }
  const deviation = ev.forecast !== 0 ? +(((ev.actual - ev.forecast) / Math.abs(ev.forecast)) * 100).toFixed(2) : 0
  let directionUsd: 'up' | 'down' | 'neutral' = 'neutral'
  const actualGreater = ev.actual > ev.forecast
  const title = ev.title.toLowerCase()
  if (title.includes('unemployment')) {
    directionUsd = actualGreater ? 'down' : 'up' // kebalikan NFP
  } else if (title.includes('cpi') || title.includes('ppi') || title.includes('nfp') || title.includes('retail') || title.includes('gdp') || title.includes('pmi')) {
    directionUsd = actualGreater ? 'up' : 'down'
  } else {
    directionUsd = actualGreater ? 'up' : 'down'
  }
  return { ready: true, deviation, directionUsd }
}

// ============================================================
// IO HANDLERS
// ============================================================
io.on('connection', (socket) => {
  logEvent('debug', 'ws', `Client connected: ${socket.id}`)
  // kirim state saatat connect
  socket.emit('mt5:status', mt5)
  socket.emit('symbols:snapshot', Object.values(SYMBOLS))
  socket.emit('news:snapshot', NEWS)
  socket.emit('positions:update', Array.from(positions.values()))

  // MT5 control
  socket.on('mt5:launch', async (payload: { path?: string; login?: string; password?: string; server?: string }) => {
    if (payload.login) mt5.login = payload.login
    if (payload.server) mt5.server = payload.server
    const r = await launchMt5(payload.path)
    socket.emit('mt5:launch:result', r)
  })
  socket.on('mt5:disconnect', () => disconnectMt5())
  socket.on('mt5:status:get', () => socket.emit('mt5:status', mt5))

  // Trading
  socket.on('trade:open', (p: { symbol: string; side: 'BUY' | 'SELL'; lots: number; sl?: number; tp?: number; isAuto?: boolean; strategyId?: string }) => {
    const r = openMarket(p.symbol, p.side, p.lots, p)
    socket.emit('trade:open:result', r)
  })
  socket.on('trade:close', (p: { ticket: number }) => {
    const r = closePosition(p.ticket)
    socket.emit('trade:close:result', r)
  })
  socket.on('trade:modify', (p: { ticket: number; sl?: number; tp?: number }) => {
    const r = modifyPosition(p.ticket, p.sl, p.tp)
    socket.emit('trade:modify:result', r)
  })

  // News
  socket.on('news:analyze', ({ id }: { id: string }) => {
    const ev = NEWS.find((n) => n.id === id)
    if (!ev) return socket.emit('news:analyze:result', { ok: false, msg: 'Not found' })
    // simulate release: set actual random ±0.3 dari forecast
    if (ev.actual === undefined && ev.forecast !== undefined) {
      ev.actual = +(ev.forecast + (Math.random() - 0.5) * 0.6).toFixed(2)
    }
    const analysis = analyzeNews(ev)
    socket.emit('news:analyze:result', { ok: true, event: ev, analysis })
    io.emit('news:update', ev)
  })

  // Manual news add
  socket.on('news:add', (ev: NewsEvent) => {
    ev.id = ev.id || 'manual_' + Math.random().toString(36).slice(2)
    ev.source = 'manual'
    NEWS.unshift(ev)
    io.emit('news:update', ev)
    logEvent('info', 'news', `Manual news added: ${ev.title}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`MT5 Bridge WebSocket running on port ${PORT} (all interfaces)`)
  logEvent('info', 'mt5', 'MT5 Bridge service started', { port: PORT })
})

// ============================================================
// KEEP-ALIVE & SHUTDOWN
// ============================================================
// Note: jangan exit pada SIGHUP agar process bisa survive shell exit
process.on('SIGHUP', () => {
  console.log('[INFO] Received SIGHUP - ignoring (keep alive)')
})
process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM - graceful shutdown')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT - graceful shutdown')
  httpServer.close(() => process.exit(0))
})

// Handle uncaught exceptions to prevent crash
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message, err.stack)
  console.error('Continuing to run...')
})
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] unhandledRejection:', err)
  console.error('Continuing to run...')
})

// Heartbeat: keep event loop busy
setInterval(() => {
  // noop
}, 60000)
