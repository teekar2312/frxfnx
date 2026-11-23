'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const uiTheme = useUIStore((s) => s.theme)
  const setUiTheme = useUIStore((s) => s.setTheme)
  const isDark = (theme ?? uiTheme) === 'dark'

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => {
        const next = isDark ? 'light' : 'dark'
        setTheme(next)
        setUiTheme(next)
      }}
      className={cn('rounded-full')}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
