// Production logger dengan level filtering, redaction, dan file output
// Mendukung: console (dev), file (prod), JSON format untuk log aggregation

import { getConfig } from '@/lib/config/env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
}

interface LogEntry {
  level: LogLevel
  message: string
  source?: string
  timestamp: string
  details?: any
  // Audit fields
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
}

class Logger {
  private level: LogLevel
  private redactFields: string[]
  private logFile: string | null
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private isInBrowser: boolean

  constructor() {
    const config = getConfig()
    this.level = config.logLevel
    this.redactFields = config.logRedactFields
    this.logFile = config.logFile
    this.isInBrowser = typeof window !== 'undefined'

    // In Node.js, setup periodic flush to file
    if (!this.isInBrowser && this.logFile) {
      this.flushInterval = setInterval(() => this.flush(), 5000)
      // Handle process exit
      process.on('SIGTERM', () => this.flush())
      process.on('SIGINT', () => this.flush())
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level]
  }

  private redact(details: any): any {
    if (!details || typeof details !== 'object') return details
    const out: any = Array.isArray(details) ? [...details] : { ...details }
    for (const key in out) {
      if (this.redactFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        out[key] = '[REDACTED]'
      } else if (typeof out[key] === 'object') {
        out[key] = this.redact(out[key])
      }
    }
    return out
  }

  private format(entry: LogEntry): string {
    const config = getConfig()
    if (config.nodeEnv === 'production' && !this.isInBrowser) {
      // JSON format untuk log aggregation (Loki, ELK, Datadog)
      return JSON.stringify({
        ...entry,
        details: this.redact(entry.details),
        app: config.appName,
        version: config.appVersion,
        env: config.nodeEnv,
      })
    }
    // Human-readable untuk dev
    const ts = entry.timestamp
    const lvl = entry.level.toUpperCase().padEnd(5)
    const src = entry.source ? `[${entry.source}]` : ''
    const det = entry.details ? ' :: ' + JSON.stringify(this.redact(entry.details)) : ''
    return `${ts} ${lvl} ${src} ${entry.message}${det}`
  }

  log(level: LogLevel, source: string, message: string, details?: any) {
    if (!this.shouldLog(level)) return
    const entry: LogEntry = {
      level,
      message,
      source,
      timestamp: new Date().toISOString(),
      details,
    }
    // Console output
    const formatted = this.format(entry)
    if (level === 'error' || level === 'fatal') console.error(formatted)
    else if (level === 'warn') console.warn(formatted)
    else console.log(formatted)
    // Buffer for file flush (Node.js only)
    if (!this.isInBrowser && this.logFile) {
      this.buffer.push(entry)
      if (this.buffer.length >= 100) this.flush()
    }
  }

  debug(source: string, message: string, details?: any) { this.log('debug', source, message, details) }
  info(source: string, message: string, details?: any) { this.log('info', source, message, details) }
  warn(source: string, message: string, details?: any) { this.log('warn', source, message, details) }
  error(source: string, message: string, details?: any) { this.log('error', source, message, details) }
  fatal(source: string, message: string, details?: any) {
    this.log('fatal', source, message, details)
    // In production, exit on fatal
    if (getConfig().nodeEnv === 'production') {
      this.flush()
      process.exit(1)
    }
  }

  // Audit log khusus untuk trading actions (akan masuk database + file)
  audit(action: string, details: any) {
    this.log('info', 'audit', `[AUDIT] ${action}`, {
      ...details,
      _audit: true,
      _timestamp: Date.now(),
    })
  }

  // Flush to file (Node.js only via dynamic import)
  flush() {
    if (this.isInBrowser || !this.logFile || this.buffer.length === 0) return
    try {
      // Dynamic require di Node.js (Next.js bundling workaround)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path')
      const logDir = path.dirname(this.logFile)
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
      const lines = this.buffer.map((e) => this.format(e)).join('\n') + '\n'
      fs.appendFileSync(this.logFile, lines)
      this.buffer = []
    } catch (e) {
      console.error('Failed to flush logs:', e)
    }
  }

  setLevel(level: LogLevel) {
    this.level = level
  }
}

let _logger: Logger | null = null
export function getLogger(): Logger {
  if (!_logger) _logger = new Logger()
  return _logger
}

export const log = {
  debug: (s: string, m: string, d?: any) => getLogger().debug(s, m, d),
  info: (s: string, m: string, d?: any) => getLogger().info(s, m, d),
  warn: (s: string, m: string, d?: any) => getLogger().warn(s, m, d),
  error: (s: string, m: string, d?: any) => getLogger().error(s, m, d),
  fatal: (s: string, m: string, d?: any) => getLogger().fatal(s, m, d),
  audit: (a: string, d: any) => getLogger().audit(a, d),
}
