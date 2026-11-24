// Helper untuk jam trading & filter akhir pekan (sesuai user req)

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

export function isTradingAllowedNow(opts: { start: string; end: string; blockWeekend: boolean }, now = new Date()): boolean {
  if (opts.blockWeekend && isWeekend(now)) return false
  return isWithinTradingHours(opts.start, opts.end, now)
}

export function nextAllowedSession(opts: { start: string; end: string; blockWeekend: boolean }, now = new Date()): Date {
  // Hitung kapan trading diizinkan berikutnya
  const [sh, sm] = opts.start.split(':').map(Number)
  if (isTradingAllowedNow(opts, now)) return now
  // jika weekend, jumat ke depan
  let cand = new Date(now)
  const [eh, em] = opts.end.split(':').map(Number)
  // jika sebelum end dan bukan weekend: jam start hari ini
  cand.setHours(sh, sm, 0, 0)
  if (cand.getTime() < now.getTime() || (opts.blockWeekend && (cand.getDay() === 0 || cand.getDay() === 6))) {
    cand.setDate(cand.getDate() + 1)
    // skip Sabtu (6) dan Minggu (0)
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
