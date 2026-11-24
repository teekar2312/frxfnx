// Hot keys hook
// F1 = BUY market, F2 = SELL market, ESC = Close all, F4 = Reverse, F8 = Flatten, F9 = Open Settings

'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'
import { useMarketStore } from '@/store/market'
import { useMt5Socket } from '@/lib/mt5/socket'
import { useAccountStore } from '@/store/account'
import { toast } from 'sonner'

export interface HotkeyHandler {
  onBuy?: () => void
  onSell?: () => void
  onCloseAll?: () => void
  onReverse?: () => void
  onFlatten?: () => void
  onSettings?: () => void
}

const DEFAULT_HOTKEYS = [
  { key: 'F1', action: 'buy_market', label: 'BUY Market (active symbol, default lots)', enabled: true },
  { key: 'F2', action: 'sell_market', label: 'SELL Market (active symbol, default lots)', enabled: true },
  { key: 'F3', action: 'partial_close_50', label: 'Partial Close 50% (last position)', enabled: true },
  { key: 'F4', action: 'reverse_position', label: 'Reverse last position', enabled: true },
  { key: 'F7', action: 'flatten_all', label: 'Flatten all positions', enabled: true },
  { key: 'F8', action: 'close_all', label: 'Close all positions', enabled: true },
  { key: 'F9', action: 'open_settings', label: 'Open Settings', enabled: true },
  { key: 'Escape', action: 'cancel_pending', label: 'Cancel all pending orders', enabled: true },
]

export function useHotkeys(handler: HotkeyHandler) {
  const activeSymbol = useUIStore((s) => s.activeSymbol)
  const mt5 = useMarketStore((s) => s.mt5)
  const { openTrade, closeTrade, modifyTrade } = useMt5Socket()
  const positions = useMarketStore((s) => s.positions)
  const settings = useUIStore((s) => s.settings)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip jika focus di input/textarea
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const key = e.key === 'Escape' ? 'Escape' : e.key
      const hk = DEFAULT_HOTKEYS.find((h) => h.key === key && h.enabled)
      if (!hk) return
      e.preventDefault()

      switch (hk.action) {
        case 'buy_market': {
          if (!mt5.connected) { toast.error('MT5 belum terhubung'); return }
          openTrade({ symbol: activeSymbol, side: 'BUY', lots: 0.01 }).then((r: any) => {
            if (r?.ok) toast.success(`F1: BUY 0.01 ${activeSymbol} (ticket #${r.ticket})`)
          })
          break
        }
        case 'sell_market': {
          if (!mt5.connected) { toast.error('MT5 belum terhubung'); return }
          openTrade({ symbol: activeSymbol, side: 'SELL', lots: 0.01 }).then((r: any) => {
            if (r?.ok) toast.success(`F2: SELL 0.01 ${activeSymbol} (ticket #${r.ticket})`)
          })
          break
        }
        case 'partial_close_50': {
          const last = positions[0]
          if (last) modifyTrade(last.ticket, undefined, undefined)
          break
        }
        case 'reverse_position': {
          const last = positions[0]
          if (last) {
            closeTrade(last.ticket).then(() => {
              openTrade({ symbol: last.symbol, side: last.side === 'BUY' ? 'SELL' : 'BUY', lots: last.lots })
              toast.success('F4: Position reversed')
            })
          }
          break
        }
        case 'flatten_all':
        case 'close_all': {
          handler.onCloseAll?.()
          toast.info(`${hk.key}: Close all positions`)
          break
        }
        case 'open_settings':
          handler.onSettings?.()
          break
        case 'cancel_pending':
          toast.info('ESC: Cancel pending (use Pending Orders view)')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSymbol, mt5.connected, positions, openTrade, closeTrade, modifyTrade, handler, settings])

  return DEFAULT_HOTKEYS
}

export { DEFAULT_HOTKEYS }
