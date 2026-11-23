'use client'

import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef } from 'react'
import { useMarketStore } from '@/store/market'
import type { LogEntry, Mt5Status, NewsEvent, Position, SymbolPrice } from '@/types'

// Singleton socket - shared across all components that call useMt5Socket()
let socket: Socket | null = null
let isInitialized = false

function ensureSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket && isInitialized) return socket

  console.log('[mt5-socket] creating new singleton socket.io connection to /?XTransformPort=3004')
  socket = io('/?XTransformPort=3004', {
    transports: ['polling', 'websocket'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1500,
    timeout: 20000,
    upgrade: true,
  })
  isInitialized = true

  // Bind ke global store (gunakan getState untuk avoid re-renders)
  const store = useMarketStore.getState()

  socket.on('connect', () => {
    console.log('[mt5-socket] connected')
    useMarketStore.getState().setSocketReady(true)
  })
  socket.on('disconnect', (reason) => {
    console.log('[mt5-socket] disconnected:', reason)
    useMarketStore.getState().setSocketReady(false)
  })
  socket.on('connect_error', (err) => {
    console.log('[mt5-socket] connect_error:', err.message)
    useMarketStore.getState().setSocketReady(false)
  })

  socket.on('mt5:status', (s: Mt5Status) => useMarketStore.getState().setMt5(s))
  socket.on('price:tick', (data: { ts: number; prices: SymbolPrice[] }) => {
    const setPrice = useMarketStore.getState().setPrice
    for (const p of data.prices) setPrice(p)
  })
  socket.on('positions:update', (ps: Position[]) => useMarketStore.getState().setPositions(ps))
  socket.on('news:snapshot', (n: NewsEvent[]) => useMarketStore.getState().setNews(n))
  socket.on('news:update', (n: NewsEvent) => useMarketStore.getState().upsertNews(n))
  socket.on('log', (l: LogEntry) => useMarketStore.getState().addLog(l))

  return socket
}

export function useMt5Socket() {
  const socketRef = useRef<Socket | null>(null)
  const socketReady = useMarketStore((s) => s.socketReady)

  useEffect(() => {
    socketRef.current = ensureSocket()
    // NO cleanup — socket is singleton and lives for app lifetime
  }, [])

  return {
    socket: socketRef.current,
    isReady: socketReady,
    launchMt5: (payload?: { path?: string; login?: string; password?: string; server?: string }) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('mt5:launch', payload ?? {}, (r: any) => resolve(r))
        setTimeout(() => resolve({ ok: true, msg: 'launching' }), 8000)
      }),
    disconnectMt5: () => ensureSocket()?.emit('mt5:disconnect'),
    openTrade: (p: { symbol: string; side: 'BUY' | 'SELL'; lots: number; sl?: number; tp?: number; isAuto?: boolean; strategyId?: string }) =>
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
    modifyTrade: (ticket: number, sl?: number, tp?: number) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('trade:modify', { ticket, sl, tp })
        s?.once('trade:modify:result', (r: any) => resolve(r))
      }),
    analyzeNews: (id: string) =>
      new Promise((resolve) => {
        const s = ensureSocket()
        s?.emit('news:analyze', { id })
        s?.once('news:analyze:result', (r: any) => resolve(r))
      }),
    addNews: (ev: NewsEvent) => ensureSocket()?.emit('news:add', ev),
  }
}

export function getSocket() {
  return socket
}
