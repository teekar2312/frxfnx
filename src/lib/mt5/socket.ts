'use client'

import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef } from 'react'
import { useMarketStore } from '@/store/market'
import { useExtMarketStore } from '@/store/extended'
import type { LogEntry, Mt5Status, NewsEvent, Position, SymbolPrice } from '@/types'
import type { AccountConfig, AlertEvent, AlertRule, AutoTradeRule, CopyTradeSub, DrawingObject, PendingOrder, TradeHistory, JournalEntry } from '@/lib/types/trade'

let socket: Socket | null = null
let isInitialized = false

function ensureSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket && isInitialized) return socket

  socket = io('/?XTransformPort=3004', {
    transports: ['polling', 'websocket'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1500,
    timeout: 20000,
    upgrade: true,
    autoConnect: true,
  })
  isInitialized = true

  socket.on('connect', () => {
    useMarketStore.getState().setSocketReady(true)
  })
  socket.on('disconnect', () => {
    useMarketStore.getState().setSocketReady(false)
  })
  socket.on('connect_error', () => {
    useMarketStore.getState().setSocketReady(false)
  })

  // Existing events
  socket.on('mt5:status', (s: Mt5Status) => useMarketStore.getState().setMt5(s))
  socket.on('symbols:snapshot', (symbols: any[]) => {
    // Simpan metadata symbol (digits, pipSize, contractSize, maxSpreadPips) ke market store
    useMarketStore.getState().setSymbolsMeta(symbols)
  })
  socket.on('price:tick', (data: { ts: number; prices: SymbolPrice[] }) => {
    for (const p of data.prices) useMarketStore.getState().setPrice(p)
  })
  socket.on('positions:update', (ps: Position[]) => useMarketStore.getState().setPositions(ps))
  socket.on('news:snapshot', (n: NewsEvent[]) => useMarketStore.getState().setNews(n))
  socket.on('news:update', (n: NewsEvent) => useMarketStore.getState().upsertNews(n))
  socket.on('log', (l: LogEntry) => useMarketStore.getState().addLog(l))

  // New events
  socket.on('pending:orders:update', (p: PendingOrder[]) => useExtMarketStore.getState().setPendingOrders(p))
  socket.on('pending:filled', ({ pendingTicket, positionTicket }: { pendingTicket: number; positionTicket: number }) => {
    // Hapus pending order yang sudah filled dari list (positions akan datang via positions:update)
    const cur = useExtMarketStore.getState().pendingOrders
    useExtMarketStore.getState().setPendingOrders(cur.filter((p) => p.ticket !== pendingTicket))
  })
  socket.on('history:trades', (t: TradeHistory[]) => useExtMarketStore.getState().setTradeHistory(t))
  socket.on('alerts:rules', (a: AlertRule[]) => useExtMarketStore.getState().setAlertRules(a))
  socket.on('alerts:list', (e: AlertEvent[]) => useExtMarketStore.getState().setAlertEvents(e))
  socket.on('alert:event', (e: AlertEvent) => {
    // Functional update untuk hindari race condition jika 2 event datang bersamaan
    useExtMarketStore.setState((s) => ({ alertEvents: [e, ...s.alertEvents].slice(0, 30) }))
  })
  socket.on('autotrade:rules', (r: AutoTradeRule[]) => useExtMarketStore.getState().setAutoTradeRules(r))
  socket.on('accounts:list', (a: AccountConfig[]) => useExtMarketStore.getState().setAccounts(a))
  socket.on('drawings:list', (d: DrawingObject[]) => useExtMarketStore.getState().setDrawings(d))
  socket.on('copytrade:list', (c: CopyTradeSub[]) => useExtMarketStore.getState().setCopySubs(c))
  socket.on('journal:new', (e: JournalEntry) => useExtMarketStore.getState().addJournalEntry(e))

  return socket
}

export function useMt5Socket() {
  const socketRef = useRef<Socket | null>(null)
  const socketReady = useMarketStore((s) => s.socketReady)

  useEffect(() => {
    socketRef.current = ensureSocket()
  }, [])

  return {
    socket: socketRef.current,
    isReady: socketReady,
    launchMt5: (payload?: { path?: string; login?: string; password?: string; server?: string }) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        if (!s) return resolve({ ok: false, msg: 'socket not ready' })
        // Backend emit 'mt5:launch:result' as separate event (not ack callback)
        let resolved = false
        const handler = (r: any) => {
          if (resolved) return
          resolved = true
          s.off('mt5:launch:result', handler)
          resolve(r)
        }
        s.on('mt5:launch:result', handler)
        s.emit('mt5:launch', payload ?? {})
        // Fallback timeout 8s untuk launch yang memakan waktu lama
        setTimeout(() => {
          if (resolved) return
          resolved = true
          s.off('mt5:launch:result', handler)
          resolve({ ok: true, msg: 'launching (timeout fallback)' })
        }, 8000)
      }),
    disconnectMt5: () => ensureSocket()?.emit('mt5:disconnect'),
    openTrade: (p: { symbol: string; side: 'BUY' | 'SELL'; lots: number; sl?: number; tp?: number; isAuto?: boolean; strategyId?: string; trailingStopPips?: number; originalLots?: number }) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:open', p)
        s?.once('trade:open:result', (r: any) => resolve(r))
      }),
    closeTrade: (ticket: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:close', { ticket })
        s?.once('trade:close:result', (r: any) => resolve(r))
      }),
    modifyTrade: (ticket: number, sl?: number, tp?: number, trailingStopPips?: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:modify', { ticket, sl, tp, trailingStopPips })
        s?.once('trade:modify:result', (r: any) => resolve(r))
      }),
    partialClose: (ticket: number, fraction: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:partial', { ticket, fraction })
        s?.once('trade:partial:result', (r: any) => resolve(r))
      }),
    flattenAll: () =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:flatten')
        s?.once('trade:flatten:result', (r: any) => resolve(r))
      }),
    reversePosition: (ticket: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:reverse', { ticket })
        s?.once('trade:reverse:result', (r: any) => resolve(r))
      }),
    placePendingOrder: (p: any) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('pending:place', p)
        s?.once('pending:place:result', (r: any) => resolve(r))
      }),
    cancelPendingOrder: (ticket: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('pending:cancel', { ticket })
        s?.once('pending:cancel:result', (r: any) => resolve(r))
      }),
    analyzeNews: (id: string) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('news:analyze', { id })
        s?.once('news:analyze:result', (r: any) => resolve(r))
      }),
    addNews: (ev: NewsEvent) => ensureSocket()?.emit('news:add', ev),
    // Alerts
    setAlertRules: (rules: AlertRule[]) => ensureSocket()?.emit('alerts:rules:set', rules),
    ackAlert: (id: string) => ensureSocket()?.emit('alert:ack', { id }),
    addAlertRule: (rule: AlertRule) => ensureSocket()?.emit('alert:add', rule),
    deleteAlertRule: (id: string) => ensureSocket()?.emit('alert:delete', { id }),
    // Auto-trade rules
    setAutoTradeRules: (rules: AutoTradeRule[]) => ensureSocket()?.emit('autotrade:rules:set', rules),
    // Trading session (sync ke backend agar openMarket bisa validate)
    setTradingSession: (session: string) => ensureSocket()?.emit('trading:session:set', { session }),
    // Accounts
    switchAccount: (id: string) => ensureSocket()?.emit('accounts:switch', { id }),
    addAccount: (acc: AccountConfig) => ensureSocket()?.emit('accounts:add', acc),
    deleteAccount: (id: string) => ensureSocket()?.emit('accounts:delete', { id }),
    // Drawings
    addDrawing: (d: DrawingObject) => ensureSocket()?.emit('drawing:add', d),
    updateDrawing: (d: DrawingObject) => ensureSocket()?.emit('drawing:update', d),
    deleteDrawing: (id: string) => ensureSocket()?.emit('drawing:delete', { id }),
    clearDrawings: (symbol?: string) => ensureSocket()?.emit('drawing:clear', { symbol }),
    // Copy trade
    addCopySub: (sub: CopyTradeSub) => ensureSocket()?.emit('copytrade:add', sub),
    deleteCopySub: (id: string) => ensureSocket()?.emit('copytrade:delete', { id }),
    // History
    getTradeHistory: (limit?: number) => ensureSocket()?.emit('history:trades:get', { limit }),
    // Journal
    addJournalEntry: (entry: JournalEntry) => ensureSocket()?.emit('journal:add', entry),
    // Backtest
    runBacktest: (cfg: any) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('backtest:run', cfg)
        s?.once('backtest:result', (r: any) => resolve(r))
      }),
  }
}

export function getSocket() {
  return socket
}
