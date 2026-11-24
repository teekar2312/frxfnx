'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMarketStore } from '@/store/market'
import { calcCurrencyStrength, strengthColor, strengthLabel } from '@/lib/indicators/currencyStrength'
import { cn } from '@/lib/utils'

export function CurrencyStrengthMeter() {
  const prices = useMarketStore((s) => s.prices)
  const strengths = useMemo(() => calcCurrencyStrength(prices, 3600 * 1000), [prices])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Currency Strength Meter</span>
          <Badge variant="outline" className="text-xs">1H</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {strengths.map((s) => (
          <div key={s.currency} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.currency}</span>
              <span className={cn('font-bold tabular-nums', strengthColor(s.strength))}>
                {s.strength.toFixed(1)} · {strengthLabel(s.strength)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className={cn(
                  'h-full rounded transition-all',
                  s.strength >= 70 ? 'bg-emerald-500' : s.strength >= 55 ? 'bg-emerald-400' : s.strength >= 45 ? 'bg-yellow-500' : s.strength >= 30 ? 'bg-red-400' : 'bg-red-500',
                )}
                style={{ width: `${s.strength}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>#{s.rank} rank</span>
              <span className={s.change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {s.change >= 0 ? '+' : ''}{s.change.toFixed(3)}%
              </span>
            </div>
          </div>
        ))}
        <div className="border-t pt-2 text-[10px] text-muted-foreground">
          Konfirmasi: Hindari BUY EUR/USD jika USD sangat kuat (#1) & EUR lemah.
        </div>
      </CardContent>
    </Card>
  )
}
