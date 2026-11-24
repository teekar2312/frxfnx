'use client'

import { create } from 'zustand'
import type { LogEntry, Mt5Status, NewsEvent, Position, SymbolPrice } from '@/types'

const EMPTY_MT5: Mt5Status = {
  connected: false,
  launching: false,
  broker: 'FINEX Indonesia',
  equity: 10000,
  balance: 10000,
  margin: 0,
  freeMargin: 10000,
  marginLevel: 0,
  leverage: 500,
  currency: 'USD',
}

interface SymbolMeta {
  symbol: string
  bid: number
  ask: number
  digits: number
  pipSize: number
  contractSize: number
  spreadPips: number
  maxSpreadPips?: number
}

interface MarketState {
  // MT5
  mt5: Mt5Status
  setMt5: (s: Partial<Mt5Status>) => void
  // Prices: symbol -> { bid, ask, digits, history }
  prices: Record<string, SymbolPrice & { history: { t: number; bid: number; ask: number }[] }>
  setPrice: (p: SymbolPrice) => void
  // Symbol metadata (digits, pipSize, contractSize, maxSpreadPips)
  symbolsMeta: Record<string, SymbolMeta>
  setSymbolsMeta: (s: SymbolMeta[]) => void
  // Positions
  positions: Position[]
  setPositions: (p: Position[]) => void
  // News
  news: NewsEvent[]
  setNews: (n: NewsEvent[]) => void
  upsertNews: (n: NewsEvent) => void
  // Logs
  logs: LogEntry[]
  addLog: (l: LogEntry) => void
  // UI
  isTradingAllowed: boolean
  setTradingAllowed: (b: boolean) => void
  // socket connection
  socketReady: boolean
  setSocketReady: (b: boolean) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  mt5: EMPTY_MT5,
  setMt5: (s) => set((state) => ({ mt5: { ...state.mt5, ...s } })),
  prices: {},
  setPrice: (p) =>
    set((state) => {
      const prev = state.prices[p.symbol]
      const history = prev?.history ?? []
      const next = [...history, { t: Date.now(), bid: p.bid, ask: p.ask }].slice(-180)
      return {
        prices: {
          ...state.prices,
          [p.symbol]: { ...p, history: next },
        },
      }
    }),
  symbolsMeta: {},
  setSymbolsMeta: (s) => set((state) => {
    const map: Record<string, SymbolMeta> = {}
    for (const sym of s) map[sym.symbol] = sym
    return { symbolsMeta: { ...state.symbolsMeta, ...map } }
  }),
  positions: [],
  setPositions: (p) => set({ positions: p }),
  news: [],
  setNews: (n) => set({ news: n }),
  upsertNews: (n) =>
    set((state) => {
      const idx = state.news.findIndex((x) => x.id === n.id)
      if (idx >= 0) {
        const copy = [...state.news]
        copy[idx] = { ...copy[idx], ...n }
        return { news: copy }
      }
      return { news: [n, ...state.news] }
    }),
  logs: [],
  addLog: (l) => set((state) => ({ logs: [l, ...state.logs].slice(0, 500) })),
  isTradingAllowed: true,
  setTradingAllowed: (b) => set({ isTradingAllowed: b }),
  socketReady: false,
  setSocketReady: (b) => set({ socketReady: b }),
}))
