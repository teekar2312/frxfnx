// Helper untuk jam trading & filter akhir pekan (sesuai user req)
// Sekarang support pemilihan sesi trading (Sydney, Tokyo, London, NY, Overlap)

import { getSession, isSessionActive, type TradingSession, type SessionId } from '@/lib/mt5/sessions'

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function isWeekend(d = new Date()): boolean {
  const day = d.getDay()
  return day === 0 || day === 6 // Minggu (0) atau Sabtu (6)
}

export function isWithinTradingHours(start: string, end: string, now = new Date()): boolean {
  // start & end "HH:MM"
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  const s = sh * 60 + sm
  const e = eh * 60 + em
  return cur >= s && cur <= e
}

export interface TradingScheduleOpts {
  start: string       // HH:MM (fallback manual window)
  end: string
  blockWeekend: boolean
  tradingSession?: SessionId  // jika 'all' atau undefined, pakai manual window
}

// Cek apakah trading diizinkan saat ini
// - Jika tradingSession = 'all' atau undefined: pakai window start-end (lama)
// - Jika tradingSession = specific session: trading aktif jika sesi aktif
export function isTradingAllowedNow(opts: TradingScheduleOpts, now = new Date()): boolean {
  if (opts.blockWeekend && isWeekend(now)) return false

  // Mode sesi: cek apakah sesi yang dipilih sedang aktif
  if (opts.tradingSession && opts.tradingSession !== 'all') {
    const session = getSession(opts.tradingSession)
    return isSessionActive(session, now)
  }

  // Mode window manual (default 'all' atau tidak ada session dipilih)
  return isWithinTradingHours(opts.start, opts.end, now)
}

// Dapatkan waktu trading diizinkan berikutnya (untuk countdown display)
export function nextAllowedSession(opts: TradingScheduleOpts, now = new Date()): Date {
  // Jika sudah diizinkan, return now
  if (isTradingAllowedNow(opts, now)) return now

  // Mode sesi: hitung next session open
  if (opts.tradingSession && opts.tradingSession !== 'all') {
    const session = getSession(opts.tradingSession)
    // Get hour in WIB via session helper
    const utcHour = now.getUTCHours()
    const utcMin = now.getUTCMinutes()
    const hourWIB = (utcHour + 7) % 24
    const curMin = hourWIB * 60 + utcMin
    let startMin = session.startHour * 60
    if (curMin < startMin) {
      // Open hari ini
      const cand = new Date(now)
      // Hitung delta menit ke start
      const deltaMin = startMin - curMin
      cand.setUTCMinutes(cand.getUTCMinutes() + deltaMin)
      return cand
    }
    // Open besok
    const cand = new Date(now)
    cand.setUTCDate(cand.getUTCDate() + 1)
    const tomorrowHourWIB = (cand.getUTCHours() + 7) % 24
    const tomorrowCurMin = tomorrowHourWIB * 60 + cand.getUTCMinutes()
    const deltaMin = (24 * 60 - tomorrowCurMin) + startMin
    cand.setUTCMinutes(cand.getUTCMinutes() + deltaMin)
    // Skip weekend jika diblokir
    while (opts.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6)) {
      cand.setDate(cand.getDate() + 1)
    }
    return cand
  }

  // Mode window manual
  const [sh, sm] = opts.start.split(':').map(Number)
  let cand = new Date(now)
  cand.setHours(sh, sm, 0, 0)
  if (cand.getTime() < now.getTime() || (opts.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6))) {
    cand.setDate(cand.getDate() + 1)
    while (opts.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6)) {
      cand.setDate(cand.getDate() + 1)
    }
    cand.setHours(sh, sm, 0, 0)
  }
  return cand
}

export function formatHHMM(hhmm: string): string {
  return hhmm
}

export function formatCountdown(ms: number): string {
  if (ms < 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function dayName(d = new Date()): string {
  return DAYS[d.getDay()]
}

// Helper: convert WIB hour ke Date dengan hour yang benar
export function getHourWIB(d: Date = new Date()): number {
  return (d.getUTCHours() + 7) % 24
}
