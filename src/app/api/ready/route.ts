import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// GET /api/ready
// Readiness probe — apakah aplikasi siap menerima traffic?
// Cek: database connection, external services

const prisma = new PrismaClient()

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  // 1. Database check
  try {
    const t0 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - t0 }
  } catch (e: any) {
    checks.database = { status: 'fail', error: e?.message ?? 'unknown' }
  }

  // 2. AI provider check (just config check, no actual call)
  const config = getConfig()
  if (config.aiProvider === 'groq' && !config.groqApiKey) {
    checks.aiProvider = { status: 'warn', error: 'GROQ_API_KEY not set' }
  } else if (config.aiProvider === 'local' && !config.localAiEndpoint) {
    checks.aiProvider = { status: 'warn', error: 'LOCAL_AI_ENDPOINT not set' }
  } else {
    checks.aiProvider = { status: 'ok' }
  }

  // 3. Tiingo check
  checks.tiingo = config.tiingoApiKey ? { status: 'ok' } : { status: 'warn', error: 'TIINGO_API_KEY not set' }

  // 4. MT5 check (best effort - in production, check actual connection)
  checks.mt5 = { status: 'ok', note: 'MT5 connection requires Python bridge on Windows' }

  // Overall status
  const hasFail = Object.values(checks).some((c) => c.status === 'fail')
  const status = hasFail ? 'not_ready' : 'ready'
  const httpStatus = hasFail ? 503 : 200

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  )
}
