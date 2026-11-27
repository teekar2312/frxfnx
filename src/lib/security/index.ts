// Security utilities untuk API routes
// - Rate limiting (in-memory per IP)
// - Input validation
// - CORS headers
// - Sanitization

import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config/env'

// ============================================================
// RATE LIMITING
// ============================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function rateLimit(identifier: string, req?: NextRequest) {
  const config = getConfig()
  const max = config.rateLimitMax
  const windowMs = config.rateLimitWindow
  const now = Date.now()
  // Get client IP (x-forwarded-for untuk production dengan reverse proxy)
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req?.headers.get('x-real-ip') ?? 'unknown'
  const key = `${identifier}:${ip}`
  let entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    rateLimitStore.set(key, entry)
  }
  entry.count++
  const remaining = Math.max(0, max - entry.count)
  const reset = Math.ceil((entry.resetAt - now) / 1000)
  const exceeded = entry.count > max
  return { exceeded, remaining, reset, headers: { 'X-RateLimit-Limit': String(max), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
}

export function rateLimitedResponse() {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Coba lagi nanti.', code: 'RATE_LIMIT_EXCEEDED' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}

// ============================================================
// CORS
// ============================================================

export function applyCors(res: NextResponse, origin?: string | null): NextResponse {
  const config = getConfig()
  const allowed = config.corsOrigins
  // Jika origin cocok, set header
  if (origin && allowed.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
  } else if (allowed.length === 1 && allowed[0] === '*') {
    res.headers.set('Access-Control-Allow-Origin', '*')
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.headers.set('Access-Control-Max-Age', '86400')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

// ============================================================
// INPUT VALIDATION
// ============================================================

export interface ValidationResult {
  ok: boolean
  errors: string[]
  data?: any
}

// Sanitize string: trim, remove null bytes, limit length
export function sanitizeString(s: unknown, maxLen: number = 1000): string {
  if (typeof s !== 'string') return ''
  return s.trim().replace(/\0/g, '').slice(0, maxLen)
}

// Validate symbol format (e.g. "XAU/USD", "EUR/USD")
export function isValidSymbol(s: string): boolean {
  return /^(XAU\/USD|EUR\/USD|GBP\/USD|USD\/JPY)$/i.test(sanitizeString(s, 20))
}

// Validate side
export function isValidSide(s: string): s is 'BUY' | 'SELL' {
  return s === 'BUY' || s === 'SELL'
}

// Validate lots (positive number, max 100)
export function isValidLots(n: number): boolean {
  return typeof n === 'number' && n > 0 && n <= 100 && !isNaN(n)
}

// Validate price (positive number)
export function isValidPrice(n: number): boolean {
  return typeof n === 'number' && n > 0 && !isNaN(n) && isFinite(n)
}

// Validate pips (positive integer, max 1000)
export function isValidPips(n: number): boolean {
  return typeof n === 'number' && n > 0 && n <= 1000 && !isNaN(n)
}

// Validate ticket (positive integer)
export function isValidTicket(n: number): boolean {
  return Number.isInteger(n) && n > 0
}

// Validate email
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeString(s, 100))
}

// Validate API key format (loose)
export function isValidApiKey(s: string, prefix?: string): boolean {
  const cleaned = sanitizeString(s, 200)
  if (!cleaned) return false
  if (prefix && !cleaned.startsWith(prefix)) return false
  return cleaned.length >= 10 && cleaned.length <= 200
}

// ============================================================
// SECURITY HEADERS
// ============================================================

export function applySecurityHeaders(res: NextResponse): NextResponse {
  // HSTS (HTTPS only, 1 year)
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  // XSS protection (legacy, but better than nothing)
  res.headers.set('X-XSS-Protection', '1; mode=block')
  // MIME sniffing protection
  res.headers.set('X-Content-Type-Options', 'nosniff')
  // Referrer policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Frame options (clickjacking protection)
  res.headers.set('X-Frame-Options', 'DENY')
  // Permissions policy (disable features we don't need)
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  // CSP (Content Security Policy) — permissive untuk Next.js dev, tighten di production
  if (getConfig().nodeEnv === 'production') {
    res.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws: https://api.groq.com https://api.tiingo.com http://127.0.0.1:* http://localhost:*; frame-ancestors 'none';"
    )
  }
  return res
}

// ============================================================
// AUTHENTICATION (simple, untuk API endpoints yang sensitif)
// ============================================================

export function requireAuth(req: NextRequest): boolean {
  // Untuk demo, kita skip auth. Di production, implement JWT/session check
  // const token = req.headers.get('authorization')?.replace('Bearer ', '')
  // if (!token) return false
  // return verifyJwt(token)
  return true
}
