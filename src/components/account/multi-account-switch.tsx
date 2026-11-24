'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Trash2, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useExtMarketStore } from '@/store/extended'
import { useMt5Socket } from '@/lib/mt5/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MultiAccountSwitch() {
  const accounts = useExtMarketStore((s) => s.accounts)
  const activeId = useExtMarketStore((s) => s.activeAccountId)
  const setActive = useExtMarketStore((s) => s.setActiveAccountId)
  const { switchAccount, addAccount, deleteAccount } = useMt5Socket()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [login, setLogin] = useState('')
  const [server, setServer] = useState('FINEX-Live')
  const [type, setType] = useState<'live' | 'demo' | 'contest'>('demo')

  const active = accounts.find((a) => a.id === activeId) ?? accounts[0]

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <UserCircle className="size-3" />
            {active?.label ?? 'No account'}
            <ChevronsUpDown className="size-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="end">
          <div className="space-y-1">
            {accounts.map((a) => (
              <div key={a.id} className={cn('flex items-center justify-between rounded px-2 py-1.5 text-xs', a.id === activeId && 'bg-primary/10')}>
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setActive(a.id)
                    switchAccount(a.id)
                    toast.success(`Switched to ${a.label}`)
                    setOpen(false)
                  }}
                >
                  <div className="font-medium">{a.label}</div>
                  <div className="text-[10px] text-muted-foreground">#{a.login} · {a.server} · {a.accountType}</div>
                </button>
                {a.id === activeId && <Check className="size-3 text-primary" />}
                <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => deleteAccount(a.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            {showAdd ? (
              <div className="space-y-2 border-t pt-2">
                <div>
                  <Label className="text-[10px]">Label</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="FINEX Demo #2" className="h-7 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Label className="text-[10px]">Login</Label>
                    <Input value={login} onChange={(e) => setLogin(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Server</Label>
                    <Input value={server} onChange={(e) => setServer(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {(['demo', 'live', 'contest'] as const).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={type === t ? 'default' : 'outline'}
                      className={cn('h-7 flex-1 text-xs', type === t && 'bg-primary/15')}
                      onClick={() => setType(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 flex-1 text-xs"
                    onClick={() => {
                      if (!label || !login) return
                      addAccount({
                        id: 'acc_' + Math.random().toString(36).slice(2),
                        label, login, server, broker: 'FINEX Indonesia',
                        accountType: type, isDefault: false, isActive: true,
                      })
                      setLabel(''); setLogin(''); setShowAdd(false)
                      toast.success('Akun ditambahkan')
                    }}
                  >Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 w-full text-xs" onClick={() => setShowAdd(true)}>
                <Plus className="size-3" /> Add Account
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
