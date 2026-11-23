'use client'

import { useState } from 'react'
import { Activity, Download, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarketStore } from '@/store/market'
import { cn } from '@/lib/utils'

export function LogsView() {
  const logs = useMarketStore((s) => s.logs)
  const [level, setLevel] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all')
  const [source, setSource] = useState<'all' | 'mt5' | 'trading' | 'news' | 'ai' | 'ws'>('all')
  const [query, setQuery] = useState('')

  const filtered = logs.filter((l) => {
    if (level !== 'all' && l.level !== level) return false
    if (source !== 'all' && l.source !== source) return false
    if (query && !l.message.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const exportLogs = () => {
    const txt = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}${l.details ? ' :: ' + JSON.stringify(l.details) : ''}`).join('\n')
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finex-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 p-3 md:p-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4" /> Logs & Audit
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari log..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Select value={level} onValueChange={(v) => setLevel(v as any)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <Filter className="mr-1 size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Source</SelectItem>
                <SelectItem value="mt5">MT5</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="ws">WebSocket</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={exportLogs}>
              <Download className="size-3" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-260px)]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Belum ada log yang cocok</div>
            ) : (
              <div className="font-mono text-xs">
                {filtered.map((l) => (
                  <div key={l.id} className="flex items-start gap-2 border-b px-3 py-1.5 hover:bg-muted/30">
                    <span className="tabular-nums text-muted-foreground">{new Date(l.timestamp).toLocaleTimeString('id-ID', { hour12: false })}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-1 py-0 text-[10px] uppercase',
                        l.level === 'error' ? 'border-red-500/40 text-red-500' : l.level === 'warn' ? 'border-amber-500/40 text-amber-500' : l.level === 'debug' ? 'border-slate-500/40 text-slate-500' : 'border-emerald-500/40 text-emerald-500',
                      )}
                    >
                      {l.level}
                    </Badge>
                    <span className="text-[10px] uppercase text-muted-foreground">[{l.source}]</span>
                    <span className="flex-1 break-words">{l.message}</span>
                    {l.details && <span className="hidden text-[10px] text-muted-foreground md:inline">{JSON.stringify(l.details)}</span>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
