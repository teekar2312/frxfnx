'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMarketStore } from '@/store/market'
import { useExtMarketStore } from '@/store/extended'
import { correlationMatrix, correlationColor, correlationLabel, analyzeAggregateExposure } from '@/lib/indicators/correlation'
import { cn } from '@/lib/utils'

const SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY']

export function CorrelationMatrix() {
  const prices = useMarketStore((s) => s.prices)
  const positions = useMarketStore((s) => s.positions)
  const matrix = useMemo(() => correlationMatrix(prices), [prices])
  const exposure = useMemo(() => analyzeAggregateExposure(positions, matrix), [positions, matrix])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Correlation Matrix</span>
          <span className={cn('text-xs', exposure.severity === 'high' ? 'text-red-500' : exposure.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500')}>
            {exposure.severity.toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {SYMBOLS.map((s) => (
                <th key={s} className="px-2 py-1 text-center text-[10px]">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SYMBOLS.map((r, i) => (
              <tr key={r}>
                <td className="px-2 py-1 font-medium text-[10px]">{r}</td>
                {SYMBOLS.map((c, j) => (
                  <td key={c} className="px-1 py-1">
                    <div
                      className={cn('flex h-9 items-center justify-center rounded text-xs font-medium tabular-nums', correlationColor(matrix[i][j]))}
                      title={correlationLabel(matrix[i][j])}
                    >
                      {matrix[i][j].toFixed(2)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className={cn(
          'rounded-md border p-2 text-xs',
          exposure.severity === 'high' ? 'border-red-500/40 bg-red-500/10 text-red-500' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
        )}>
          {exposure.warning}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Korelasi Pearson dari returns per-tick. Hijau = searah, merah = berlawanan. Hindari double-exposure pada pair berkorelasi tinggi.
        </div>
      </CardContent>
    </Card>
  )
}
