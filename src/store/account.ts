'use client'

import { create } from 'zustand'

// Account store: simple account manager state (untuk switch account display)
interface AccountStoreState {
  showSwitcher: boolean
  setShowSwitcher: (b: boolean) => void
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  showSwitcher: false,
  setShowSwitcher: (showSwitcher) => set({ showSwitcher }),
}))
