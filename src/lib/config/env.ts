// Production environment config system
// Validasi dan parse env vars dengan type safety
// Untuk production, fail-fast jika required vars missing

export type Env = 'development' | 'production' | 'test'

interface AppConfig {
  // App
  nodeEnv: Env
  appName: string
  appVersion: string
  appUrl: string
  port: number
  // Database
  databaseUrl: string
  // MT5
  mt5Path: string
  mt5Login: string
  mt5Password: string
  mt5Server: string
  mt5AutoLaunch: boolean
  mt5ReconnectInterval: number
  mt5MaxReconnectAttempts: number
  // Trading Schedule
  tradingStart: string
  tradingEnd: string
  blockWeekend: boolean
  tradingSession: string
  // Risk
  riskPerTradePct: number
  dailyStopPct: number
  weeklyStopPct: number
  maxLeverageRatio: number
  maxMarginUsagePct: number
  rrMin: number
  // AI
  aiProvider: 'groq' | 'local'
  groqApiKey: string
  groqModel: string
  groqTimeout: number
  localAiType: string
  localAiEndpoint: string
  localAiModel: string
  localAiTimeout: number
  // Tiingo
  tiingoApiKey: string
  tiingoTimeout: number
  // Security
  nextauthSecret: string
  nextauthUrl: string
  corsOrigins: string[]
  rateLimitMax: number
  rateLimitWindow: number
  apiKeyEncryptionKey: string
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  logFile: string
  logMaxSizeMb: number
  logMaxFiles: number
  logRedactFields: string[]
  // Bridge
  bridgePort: number
  bridgeHost: string
  bridgeCorsOrigin: string
  // Monitoring
  sentryDsn: string
  telemetryEnabled: boolean
}

// Helper untuk parse env dengan default
function str(key: string, def: string = ''): string {
  const v = process.env[key]
  return v !== undefined && v !== '' ? v : def
}
function num(key: string, def: number): number {
  const v = process.env[key]
  if (!v) return def
  const n = parseFloat(v)
  return isNaN(n) ? def : n
}
function bool(key: string, def: boolean): boolean {
  const v = process.env[key]
  if (!v) return def
  return v.toLowerCase() === 'true' || v === '1' || v === 'yes'
}
function arr(key: string, def: string[] = []): string[] {
  const v = process.env[key]
  if (!v) return def
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function parseEnv(): Env {
  const v = process.env.NODE_ENV
  if (v === 'production' || v === 'test') return v
  return 'development'
}

// Validasi: di production, throw error jika required vars missing
function validate(config: AppConfig): string[] {
  const errors: string[] = []
  if (config.nodeEnv === 'production') {
    if (!config.nextauthSecret || config.nextauthSecret.length < 16) {
      errors.push('NEXTAUTH_SECRET wajib di production (min 16 chars). Generate: openssl rand -hex 32')
    }
    if (!config.appUrl) errors.push('NEXT_PUBLIC_APP_URL wajib di production')
    if (config.aiProvider === 'groq' && !config.groqApiKey) {
      errors.push('GROQ_API_KEY wajib jika AI_PROVIDER=groq di production')
    }
    if (config.aiProvider === 'local' && !config.localAiEndpoint) {
      errors.push('LOCAL_AI_ENDPOINT wajib jika AI_PROVIDER=local di production')
    }
    if (!config.tiingoApiKey) {
      console.warn('[WARN] TIINGO_API_KEY belum di-set. News calendar akan pakai mock events.')
    }
    if (!config.apiKeyEncryptionKey) {
      console.warn('[WARN] API_KEY_ENCRYPTION_KEY belum di-set. API keys disimpan plaintext di vault.')
    }
  }
  return errors
}

let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (_config) return _config

  const nodeEnv = parseEnv()
  _config = {
    nodeEnv,
    appName: str('APP_NAME', 'FINEX Forex Trading Platform'),
    appVersion: str('APP_VERSION', '2.0.0'),
    appUrl: str('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    port: num('PORT', 3000),
    databaseUrl: str('DATABASE_URL', 'file:./db/custom.db'),
    mt5Path: str('MT5_PATH', 'C:\\Program Files\\FINEX Indonesia\\MetaTrader 5\\terminal64.exe'),
    mt5Login: str('MT5_LOGIN', ''),
    mt5Password: str('MT5_PASSWORD', ''),
    mt5Server: str('MT5_SERVER', 'FINEX-Live'),
    mt5AutoLaunch: bool('MT5_AUTO_LAUNCH', true),
    mt5ReconnectInterval: num('MT5_RECONNECT_INTERVAL', 5000),
    mt5MaxReconnectAttempts: num('MT5_MAX_RECONNECT_ATTEMPTS', 10),
    tradingStart: str('TRADING_START', '08:00'),
    tradingEnd: str('TRADING_END', '23:30'),
    blockWeekend: bool('BLOCK_WEEKEND', true),
    tradingSession: str('TRADING_SESSION', 'all'),
    riskPerTradePct: num('RISK_PER_TRADE_PCT', 0.5),
    dailyStopPct: num('DAILY_STOP_PCT', 3.0),
    weeklyStopPct: num('WEEKLY_STOP_PCT', 5.0),
    maxLeverageRatio: num('MAX_LEVERAGE_RATIO', 5.0),
    maxMarginUsagePct: num('MAX_MARGIN_USAGE_PCT', 30.0),
    rrMin: num('RR_MIN', 1.5),
    aiProvider: (str('AI_PROVIDER', 'groq') as 'groq' | 'local'),
    groqApiKey: str('GROQ_API_KEY', ''),
    groqModel: str('GROQ_MODEL', 'llama-3.3-70b-versatile'),
    groqTimeout: num('GROQ_TIMEOUT', 30000),
    localAiType: str('LOCAL_AI_TYPE', 'ollama'),
    localAiEndpoint: str('LOCAL_AI_ENDPOINT', 'http://127.0.0.1:11434/api/generate'),
    localAiModel: str('LOCAL_AI_MODEL', 'llama3.1:8b'),
    localAiTimeout: num('LOCAL_AI_TIMEOUT', 60000),
    tiingoApiKey: str('TIINGO_API_KEY', ''),
    tiingoTimeout: num('TIINGO_TIMEOUT', 15000),
    nextauthSecret: str('NEXTAUTH_SECRET', ''),
    nextauthUrl: str('NEXTAUTH_URL', ''),
    corsOrigins: arr('CORS_ORIGINS', ['http://localhost:3000']),
    rateLimitMax: num('RATE_LIMIT_MAX', 100),
    rateLimitWindow: num('RATE_LIMIT_WINDOW', 60000),
    apiKeyEncryptionKey: str('API_KEY_ENCRYPTION_KEY', ''),
    logLevel: (str('LOG_LEVEL', 'info') as any),
    logFile: str('LOG_FILE', './logs/app.log'),
    logMaxSizeMb: num('LOG_MAX_SIZE_MB', 50),
    logMaxFiles: num('LOG_MAX_FILES', 7),
    logRedactFields: arr('LOG_REDACT_FIELDS', ['password', 'apiKey', 'secret', 'token', 'authorization']),
    bridgePort: num('BRIDGE_PORT', 3004),
    bridgeHost: str('BRIDGE_HOST', '0.0.0.0'),
    bridgeCorsOrigin: str('BRIDGE_CORS_ORIGIN', '*'),
    sentryDsn: str('SENTRY_DSN', ''),
    telemetryEnabled: bool('TELEMETRY_ENABLED', false),
  }

  const errors = validate(_config)
  if (errors.length > 0) {
    const msg = `Configuration error (production):\n  - ${errors.join('\n  - ')}`
    console.error(msg)
    if (nodeEnv === 'production') {
      throw new Error(msg)
    }
  }
  return _config
}

export function isProd(): boolean {
  return getConfig().nodeEnv === 'production'
}

export function isDev(): boolean {
  return getConfig().nodeEnv === 'development'
}
