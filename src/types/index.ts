// Shared types across the app

export type Theme = 'dark' | 'light'
export type Density = 'compact' | 'dense' | 'minimal'
export type TradingSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT'
export type Impact = 'high' | 'medium' | 'low'
export type AiProvider = 'groq' | 'local'
export type LocalAiType = 'ollama' | 'lmstudio' | 'vllm' | 'llamacpp' | 'custom'
export type TradingSessionId = 'all' | 'sydney' | 'tokyo' | 'london' | 'newyork' | 'overlap_sydney_tokyo' | 'overlap_london_ny'

export interface SymbolPrice {
  symbol: string
  bid: number
  ask: number
  digits: number
}

export interface SymbolMeta {
  symbol: string
  bid: number
  ask: number
  digits: number
  pipSize: number
  contractSize: number
  spreadPips: number
}

export interface Position {
  ticket: number
  symbol: string
  side: TradingSide
  lots: number
  openPrice: number
  sl?: number
  tp?: number
  openTime: string
  strategyId?: string
  isAuto: boolean
  bid?: number
  ask?: number
  profit?: number
}

export interface Mt5Status {
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

export interface NewsEvent {
  id: string
  title: string
  country: string
  currency: string
  impact: Impact
  eventTime: string
  previous?: number
  forecast?: number
  actual?: number
  source: string
  // derived (di-isi oleh analyzer)
  deviation?: number
  directionUsd?: 'up' | 'down' | 'neutral'
  directionXau?: 'up' | 'down' | 'neutral'
  directionEur?: 'up' | 'down' | 'neutral'
  directionGbp?: 'up' | 'down' | 'neutral'
  directionJpy?: 'up' | 'down' | 'neutral'
  aiSummary?: string
  aiConfidence?: number
}

export interface LogEntry {
  id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  details?: any
  timestamp: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  provider: AiProvider
  model?: string
  content: string
  context?: string
  tokens?: number
  latencyMs?: number
  createdAt: string
}

export interface Strategy {
  id: string
  name: string
  description: string
  type: 'fade_spike' | '15min_breakout' | 'custom'
  symbols: string[] // ["XAU/USD","EUR/USD"]
  enabled: boolean
  isAuto: boolean
  waitMinutes: number
  entryAfterBreakout: boolean
  slPipsMax: number
  tpPipsTarget: number
  newsFilterImpact: Impact
  newsFilterCountry: string
  activeStart: string
  activeEnd: string
  totalTrades: number
  wins: number
  losses: number
  totalProfit: number
  winRate: number
}

export interface AppSettings {
  theme: Theme
  density: Density
  brokerName: string
  mt5Path: string
  mt5Login: string
  mt5Password: string
  mt5Server: string
  mt5AutoLaunch: boolean
  tradingStart: string
  tradingEnd: string
  blockWeekend: boolean
  tradingSession: TradingSessionId  // sesi trading yang dipilih
  tiingoApiKey: string
  groqApiKey: string
  groqModel: string
  groqCustomModel: string  // untuk custom model di luar list preset
  localAiType: LocalAiType  // ollama | lmstudio | vllm | llamacpp | custom
  localAiEndpoint: string
  localAiModel: string
  localAiCustomModel: string  // untuk custom model di luar list
  aiProvider: AiProvider
  riskPerTradePct: number
  dailyStopPct: number
  weeklyStopPct: number
  maxLeverageRatio: number
  maxMarginUsagePct: number
  rrMin: number
}
