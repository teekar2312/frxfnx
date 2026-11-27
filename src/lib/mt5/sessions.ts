// Definisi sesi trading forex dalam WIB (Waktu Indonesia Barat, UTC+7)
//
// Sesi pasar forex (di WIB):
// - Sydney (Pasifik):    05:00 - 14:00 WIB (open pertama setiap minggu)
// - Tokyo (Asia):        07:00 - 16:00 WIB
// - London (Eropa):      15:00 - 00:00 WIB (next day)
// - New York (Amerika):  20:00 - 05:00 WIB (next day)
//
// Overlap (volatilitas tinggi karena 2 sesi aktif bersamaan):
// - Sydney-Tokyo:        07:00 - 14:00 WIB
// - London-New York:     20:00 - 00:00 WIB
//
// Catatan: Jam ini dapat bergeser ±1 jam karena DST (Daylight Saving Time)
// di negara setempat. Untuk simplifikasi, gunakan jam standar.

export type SessionId = 'all' | 'sydney' | 'tokyo' | 'london' | 'newyork' | 'overlap_sydney_tokyo' | 'overlap_london_ny'

export interface TradingSession {
  id: SessionId
  name: string
  shortName: string
  region: string
  startHour: number  // hour in WIB (0-23), bisa lebih dari 24 untuk cross-midnight
  endHour: number    // hour in WIB (0-23 atau +24 untuk cross-midnight)
  crossMidnight: boolean  // true jika sesi melewati tengah malam
  description: string
  color: string  // hex color untuk UI
  cities: string[]
  // Pairs yang paling likuid selama sesi ini
  primaryPairs: string[]
  // Karakteristik volatilitas (1-5)
  volatility: 1 | 2 | 3 | 4 | 5
}

// Semua waktu dalam WIB (UTC+7)
export const TRADING_SESSIONS: TradingSession[] = [
  {
    id: 'sydney',
    name: 'Sesi Sydney (Pasifik)',
    shortName: 'Sydney',
    region: 'Pasifik',
    startHour: 5,   // 05:00 WIB
    endHour: 14,    // 14:00 WIB
    crossMidnight: false,
    description: 'Sesi pembuka pasar forex mingguan. Volatilitas relatif rendah, fokus pada AUD dan NZD.',
    color: '#a855f7',  // purple
    cities: ['Sydney', 'Wellington'],
    primaryPairs: ['AUD/USD', 'NZD/USD', 'AUD/JPY'],
    volatility: 2,
  },
  {
    id: 'tokyo',
    name: 'Sesi Tokyo (Asia)',
    shortName: 'Tokyo',
    region: 'Asia',
    startHour: 7,   // 07:00 WIB
    endHour: 16,    // 16:00 WIB
    crossMidnight: false,
    description: 'Sesi Asia utama. Likuiditas sedang. Fokus JPY pairs. Bank of Japan interventions umum terjadi di sini.',
    color: '#f59e0b',  // amber
    cities: ['Tokyo', 'Singapore', 'Hong Kong'],
    primaryPairs: ['USD/JPY', 'EUR/JPY', 'AUD/JPY', 'GBP/JPY'],
    volatility: 3,
  },
  {
    id: 'london',
    name: 'Sesi London (Eropa)',
    shortName: 'London',
    region: 'Eropa',
    startHour: 15,  // 15:00 WIB
    endHour: 24,    // 00:00 WIB (next day) → pakai 24
    crossMidnight: false,  // 24 = midnight
    description: 'Sesi terbesar di dunia, ~30% volume forex global. Volatilitas tinggi, terutama setelah open. EUR & GBP pairs paling likuid.',
    color: '#10b981',  // emerald
    cities: ['London', 'Frankfurt', 'Zurich', 'Paris'],
    primaryPairs: ['EUR/USD', 'GBP/USD', 'EUR/GBP', 'EUR/JPY'],
    volatility: 4,
  },
  {
    id: 'newyork',
    name: 'Sesi New York (Amerika)',
    shortName: 'New York',
    region: 'Amerika',
    startHour: 20,  // 20:00 WIB
    endHour: 29,    // 05:00 WIB next day → pakai 24+5=29
    crossMidnight: true,
    description: 'Sesi terbesar kedua. Berita high-impact AS (NFP, CPI, FOMC) rilis di sesi ini. Volatilitas sangat tinggi.',
    color: '#3b82f6',  // blue
    cities: ['New York', 'Chicago', 'Toronto'],
    primaryPairs: ['EUR/USD', 'USD/JPY', 'GBP/USD', 'XAU/USD'],
    volatility: 5,
  },
  {
    id: 'overlap_sydney_tokyo',
    name: 'Overlap Sydney-Tokyo',
    shortName: 'Syd-Tyo',
    region: 'Pasifik-Asia',
    startHour: 7,   // 07:00 WIB (Tokyo open)
    endHour: 14,    // 14:00 WIB (Sydney close)
    crossMidnight: false,
    description: 'Overlap sesi Sydney dan Tokyo. Likuiditas Asia memuncak. AUD/JPY & NZD/JPY paling aktif.',
    color: '#ec4899',  // pink
    cities: ['Sydney', 'Tokyo'],
    primaryPairs: ['AUD/JPY', 'NZD/JPY', 'AUD/USD', 'USD/JPY'],
    volatility: 3,
  },
  {
    id: 'overlap_london_ny',
    name: 'Overlap London-New York',
    shortName: 'Lon-NY',
    region: 'Eropa-Amerika',
    startHour: 20,  // 20:00 WIB (NY open)
    endHour: 24,    // 00:00 WIB (London close)
    crossMidnight: false,
    description: 'Overlap paling likuid di dunia (~70% volume forex). Volatilitas tertinggi. Pair majors paling aktif. Berita AS biasanya rilis di window ini.',
    color: '#ef4444',  // red
    cities: ['London', 'New York'],
    primaryPairs: ['EUR/USD', 'GBP/USD', 'XAU/USD', 'USD/JPY', 'GBP/JPY'],
    volatility: 5,
  },
]

// Default session: semua sesi (24h, kecuali weekend)
export const SESSION_ALL: TradingSession = {
  id: 'all',
  name: 'Semua Sesi (24h)',
  shortName: 'All',
  region: 'Global',
  startHour: 0,
  endHour: 24,
  crossMidnight: false,
  description: 'Trading aktif di semua sesi (Sydney, Tokyo, London, New York). Untuk full-time trader.',
  color: '#64748b',
  cities: ['Global'],
  primaryPairs: ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'],
  volatility: 3,
}

export function getSession(id: SessionId): TradingSession {
  if (id === 'all') return SESSION_ALL
  return TRADING_SESSIONS.find((s) => s.id === id) ?? SESSION_ALL
}

// Cek apakah sesi aktif pada waktu tertentu
// `now` adalah Date di timezone user (asumsi WIB = UTC+7)
export function isSessionActive(session: TradingSession, now: Date = new Date()): boolean {
  const hourWIB = getHourInWIB(now)
  if (session.id === 'all') return true
  if (session.crossMidnight) {
    // Sesi cross-midnight: active jika hourWIB >= startHour ATAU hourWIB < (endHour - 24)
    const endHourAdj = session.endHour - 24
    return hourWIB >= session.startHour || hourWIB < endHourAdj
  }
  // Normal: hourWIB harus dalam range [startHour, endHour)
  // Untuk London (15-24): 15 <= hourWIB < 24 (yaitu 15-23)
  return hourWIB >= session.startHour && hourWIB < session.endHour
}

// Dapatkan sesi aktif saat ini (boleh lebih dari satu, kembalikan array)
export function getActiveSessions(now: Date = new Date()): TradingSession[] {
  return TRADING_SESSIONS.filter((s) => isSessionActive(s, now))
}

// Dapatkan sesi utama aktif (yang paling likuid)
export function getPrimaryActiveSession(now: Date = new Date()): TradingSession | null {
  const active = getActiveSessions(now)
  if (active.length === 0) return null
  // Prioritas: overlap > newyork > london > tokyo > sydney
  const priority: SessionId[] = ['overlap_london_ny', 'overlap_sydney_tokyo', 'newyork', 'london', 'tokyo', 'sydney']
  for (const id of priority) {
    const s = active.find((a) => a.id === id)
    if (s) return s
  }
  return active[0]
}

// Hitung waktu menuju buka sesi tertentu (ms)
export function getTimeUntilSessionOpen(session: TradingSession, now: Date = new Date()): number {
  const hourWIB = getHourInWIB(now)
  const minuteWIB = getMinuteInWIB(now)
  const curMin = hourWIB * 60 + minuteWIB  // minutes since 00:00 WIB
  let startMin = session.startHour * 60
  let endMin = session.endHour * 60
  // Adjust untuk cross-midnight
  if (session.crossMidnight && endMin <= startMin) endMin += 24 * 60
  // Jika sudah lewat endMin hari ini, next open adalah besok
  if (curMin >= endMin || curMin < startMin) {
    // Jika curMin < startMin, hari ini belum open
    if (curMin < startMin) {
      return (startMin - curMin) * 60 * 1000
    }
    // Jika curMin >= endMin, open besok
    return (24 * 60 - curMin + startMin) * 60 * 1000
  }
  // Sesi sedang aktif
  return 0
}

// Cek apakah sesi tertentu akan buka dalam X menit
export function isSessionOpeningSoon(session: TradingSession, withinMinutes: number = 30, now: Date = new Date()): boolean {
  if (isSessionActive(session, now)) return false
  const msToOpen = getTimeUntilSessionOpen(session, now)
  return msToOpen > 0 && msToOpen <= withinMinutes * 60 * 1000
}

// Format jam buka/tutup dalam format HH:MM WIB
export function formatSessionHours(session: TradingSession): string {
  const fmt = (h: number) => {
    const hour = h % 24
    return `${String(hour).padStart(2, '0')}:00`
  }
  if (session.crossMidnight) {
    return `${fmt(session.startHour)} - ${fmt(session.endHour)} WIB (+1)`
  }
  return `${fmt(session.startHour)} - ${fmt(session.endHour)} WIB`
}

// Helper: dapatkan jam dalam WIB dari Date object
// Asumsi: jika user di WIB (UTC+7), Date.getHours() = hour WIB
// Jika user di timezone lain, konversi dulu
function getHourInWIB(d: Date): number {
  // Konversi ke UTC lalu ke WIB (UTC+7)
  const utcHour = d.getUTCHours()
  return (utcHour + 7) % 24
}

function getMinuteInWIB(d: Date): number {
  return d.getUTCMinutes()
}

// Dapatkan label status untuk sesi
export function getSessionStatus(session: TradingSession, now: Date = new Date()): 'active' | 'opening-soon' | 'closed' {
  if (isSessionActive(session, now)) return 'active'
  if (isSessionOpeningSoon(session, 30, now)) return 'opening-soon'
  return 'closed'
}

// Volatilitas label
export function volatilityLabel(v: number): { label: string; color: string } {
  if (v >= 5) return { label: 'Sangat Tinggi', color: 'text-red-500' }
  if (v === 4) return { label: 'Tinggi', color: 'text-amber-500' }
  if (v === 3) return { label: 'Sedang', color: 'text-yellow-500' }
  if (v === 2) return { label: 'Rendah', color: 'text-sky-500' }
  return { label: 'Sangat Rendah', color: 'text-slate-500' }
}
