'use client'

import { create } from 'zustand'
import type { AccountConfig, AlertEvent, AlertRule, AutoTradeRule, CopyTradeSub, DrawingObject, JournalEntry, PendingOrder, TradeHistory } from '@/lib/types/trade'

interface ExtendedMarketState {
  // Pending orders
  pendingOrders: PendingOrder[]
  setPendingOrders: (p: PendingOrder[]) => void
  // Trade history
  tradeHistory: TradeHistory[]
  setTradeHistory: (t: TradeHistory[]) => void
  // Alerts
  alertRules: AlertRule[]
  setAlertRules: (a: AlertRule[]) => void
  alertEvents: AlertEvent[]
  setAlertEvents: (a: AlertEvent[]) => void
  ackAlert: (id: string) => void
  // Auto-trade rules
  autoTradeRules: AutoTradeRule[]
  setAutoTradeRules: (r: AutoTradeRule[]) => void
  // Accounts
  accounts: AccountConfig[]
  setAccounts: (a: AccountConfig[]) => void
  activeAccountId: string
  setActiveAccountId: (id: string) => void
  // Drawings
  drawings: DrawingObject[]
  setDrawings: (d: DrawingObject[]) => void
  addDrawing: (d: DrawingObject) => void
  updateDrawing: (d: DrawingObject) => void
  deleteDrawing: (id: string) => void
  clearDrawings: (symbol?: string) => void
  // Copy trade
  copySubs: CopyTradeSub[]
  setCopySubs: (c: CopyTradeSub[]) => void
  // Journal entries
  journal: JournalEntry[]
  addJournalEntry: (e: JournalEntry) => void
}

export const useExtMarketStore = create<ExtendedMarketState>((set) => ({
  pendingOrders: [],
  setPendingOrders: (pendingOrders) => set({ pendingOrders }),
  tradeHistory: [],
  setTradeHistory: (tradeHistory) => set({ tradeHistory }),
  alertRules: [],
  setAlertRules: (alertRules) => set({ alertRules }),
  alertEvents: [],
  setAlertEvents: (alertEvents) => set({ alertEvents }),
  ackAlert: (id) => set((s) => ({
    alertEvents: s.alertEvents.map((e) => e.id === id ? { ...e, acknowledged: true } : e),
  })),
  autoTradeRules: [],
  setAutoTradeRules: (autoTradeRules) => set({ autoTradeRules }),
  accounts: [],
  setAccounts: (accounts) => set({ accounts }),
  activeAccountId: 'acc_demo',
  setActiveAccountId: (activeAccountId) => set({ activeAccountId }),
  drawings: [],
  setDrawings: (drawings) => set({ drawings }),
  addDrawing: (d) => set((s) => ({ drawings: [...s.drawings, d] })),
  updateDrawing: (d) => set((s) => ({ drawings: s.drawings.map((x) => x.id === d.id ? d : x) })),
  deleteDrawing: (id) => set((s) => ({ drawings: s.drawings.filter((x) => x.id !== id) })),
  clearDrawings: (symbol) => set((s) => ({
    drawings: symbol ? s.drawings.filter((x) => x.symbol !== symbol) : [],
  })),
  copySubs: [],
  setCopySubs: (copySubs) => set({ copySubs }),
  journal: [],
  addJournalEntry: (e) => set((s) => ({ journal: [e, ...s.journal] })),
}))
