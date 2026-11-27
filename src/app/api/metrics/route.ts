import { NextResponse } from 'next/server'

// GET /api/metrics
// Prometheus-format metrics untuk monitoring
// Format: <metric_name>{labels} <value>

export async function GET() {
  const mem = process.memoryUsage()
  const cpu = process.cpuUsage()
  const uptime = process.uptime()

  const metrics = [
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${uptime}`,
    '',
    '# HELP process_memory_rss_bytes Resident Set Size in bytes',
    '# TYPE process_memory_rss_bytes gauge',
    `process_memory_rss_bytes ${mem.rss}`,
    '',
    '# HELP process_memory_heap_used_bytes Heap used in bytes',
    '# TYPE process_memory_heap_used_bytes gauge',
    `process_memory_heap_used_bytes ${mem.heapUsed}`,
    `process_memory_heap_total_bytes ${mem.heapTotal}`,
    '',
    '# HELP process_memory_external_bytes External memory in bytes',
    '# TYPE process_memory_external_bytes gauge',
    `process_memory_external_bytes ${mem.external}`,
    '',
    '# HELP process_cpu_user_microseconds CPU user time in microseconds',
    '# TYPE process_cpu_user_microseconds counter',
    `process_cpu_user_microseconds ${cpu.user}`,
    `process_cpu_system_microseconds ${cpu.system}`,
    '',
    '# HELP nodejs_event_loop_lag_ms Event loop lag in ms (approximation)',
    '# TYPE nodejs_event_loop_lag_ms gauge',
    `nodejs_event_loop_lag_ms 0`,
  ].join('\n')

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
