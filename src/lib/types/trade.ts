// Shared lib-level types (for journal analytics etc)

export interface TradeHistory {
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
  closeReason: 'manual' | 'sl' | 'tp' | 'trailing' | 'auto_flatten' | 'pre_news_flatten' | 'max_daily_loss'
  durationMs: number
}

export interface PendingOrder {
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

export interface AlertEvent {
  id: string
  ruleId: string
  type: string
  message: string
  severity: 'info' | 'warn' | 'critical'
  timestamp: string
  acknowledged: boolean
}

export interface AlertRule {
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

export interface AccountConfig {
  id: string
  label: string
  login: string
  server: string
  broker: string
  accountType: 'live' | 'demo' | 'contest'
  isDefault: boolean
  isActive: boolean
}

export interface DrawingObject {
  id: string
  symbol: string
  type: 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'text'
  points: { time: number; price: number }[]
  style: { color: string; lineWidth: number; dashed?: boolean }
  label?: string
  visible: boolean
  createdAt: string
}

export interface AutoTradeRule {
  id: string
  name: string
  enabled: boolean
  type: 'pre_news_flatten' | 'max_daily_loss' | 'max_weekly_loss' | 'trailing_stop_template'
  minutesBefore?: number
  impactFilter?: 'high' | 'medium'
  countryFilter?: string
  flattenAction?: 'close_all' | 'reduce_50' | 'hedge'
}

export interface BacktestConfig {
  symbol: string
  strategy: 'sma_crossover' | 'rsi_oversold' | 'breakout_15min'
  initialBalance: number
  lots: number
  smaPeriod: number
  startDate: string
  endDate: string
}

export interface BacktestResult {
  ok: boolean
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  finalBalance: number
  trades: any[]
  msg?: string
}

export interface JournalEntry {
  id: string
  tradeTicket?: number
  symbol: string
  side: string
  entryTime: string
  exitTime?: string
  entryPrice: number
  exitPrice?: number
  lots: number
  pnl: number
  rrRealized?: number
  strategy?: string
  setupQuality?: 'A' | 'B' | 'C'
  emotion?: 'calm' | 'anxious' | 'greedy' | 'fearful'
  mistakes?: string
  lessons?: string
  screenshotPath?: string
}

export interface HotkeyBinding {
  key: string
  action: string
  label: string
  enabled: boolean
}

export interface CopyTradeSub {
  id: string
  sourceLogin: string
  targetLogin: string
  scaleLots: number
  reverseMode: boolean
  enabled: boolean
  totalCopied: number
}
