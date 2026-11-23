'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'

function SyncTheme() {
  const { theme, setTheme: setNext } = useTheme()
  const uiTheme = useUIStore((s) => s.theme)
  const setUiTheme = useUIStore((s) => s.setTheme)

  // Saat user ganti tema via UI store, apply ke next-themes
  useEffect(() => {
    if (uiTheme && uiTheme !== theme) {
      setNext(uiTheme)
    }
  }, [uiTheme, theme, setNext])

  // Saat next-themes resolve (mis. dari system), sync ke UI store
  useEffect(() => {
    if (theme && theme !== uiTheme) {
      setUiTheme(theme as 'dark' | 'light')
    }
  }, [theme, uiTheme, setUiTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <SyncTheme />
      {children}
    </NextThemesProvider>
  )
}
