import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config/env'

// GET /api/health
// Liveness probe — apakah aplikasi running?
export async function GET() {
  const config = getConfig()
  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    app: config.appName,
    version: config.appVersion,
    env: config.nodeEnv,
  })
}
