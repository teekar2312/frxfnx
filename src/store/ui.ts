'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, Density, Theme } from '@/types'

interface UIState {
  // Tema & density (persist ke localStorage)
  theme: Theme
  density: Density
  activeSymbol: string
  setTheme: (t: Theme) => void
  setDensity: (d: Density) => void
  setActiveSymbol: (s: string) => void
  // Settings persisten
  settings: Partial<AppSettings>
  setSettings: (s: Partial<AppSettings>) => void
}

const DEFAULT_SETTINGS: Partial<AppSettings> = {
  brokerName: 'FINEX Indonesia',
  mt5Path: 'C:\\Program Files\\FINEX Indonesia\\MetaTrader 5\\terminal64.exe',
  mt5Server: 'FINEX-Live',
  mt5AutoLaunch: true,
  tradingStart: '08:00',
  tradingEnd: '23:30',
  blockWeekend: true,
  groqModel: 'llama-3.3-70b-versatile',
  localAiEndpoint: 'http://127.0.0.1:11434/api/generate',
  localAiModel: 'llama3.1:8b',
  aiProvider: 'groq',
  riskPerTradePct: 0.5,
  dailyStopPct: 3.0,
  weeklyStopPct: 5.0,
  maxLeverageRatio: 5.0,
  maxMarginUsagePct: 30.0,
  rrMin: 1.5,
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      density: 'compact',
      activeSymbol: 'XAU/USD',
      settings: DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setActiveSymbol: (activeSymbol) => set({ activeSymbol }),
      setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    { name: 'finex-forex-ui' },
  ),
)

// Kelas density helper
export const DENSITY_CLASS: Record<Density, { card: string; row: string; text: string; gap: string; pad: string; cell: string }> = {
  // compact: seimbang (default)
  compact: {
    card: 'p-4',
    row: 'py-3',
    text: 'text-sm',
    gap: 'gap-3',
    pad: 'p-4',
    cell: 'px-3 py-2',
  },
  // dense: maksimal data di layar
  dense: {
    card: 'p-2',
    row: 'py-1',
    text: 'text-xs',
    gap: 'gap-1',
    pad: 'p-2',
    cell: 'px-2 py-1',
  },
  // minimal: lega & mudah dibaca
  minimal: {
    card: 'p-6',
    row: 'py-4',
    text: 'text-base',
    gap: 'gap-6',
    pad: 'p-6',
    cell: 'px-4 py-3',
  },
}

export function useDensityClass() {
  const density = useUIStore((s) => s.density)
  return DENSITY_CLASS[density]
}
