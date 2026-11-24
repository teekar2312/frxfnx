'use client'

import { useCallback, useState } from 'react'

// API Key Vault
// Saat ini hanya menyimpan metadata di localStorage (for demo).
// Untuk production, gunakan OS Keychain (Windows Credential Manager) atau env vars.

export interface StoredKey {
  provider: 'groq' | 'tiingo' | 'ollama' | 'finex_api'
  keyName: string
  value: string  // di production tidak disimpan di JS
  masked: string  // untuk display: gsk_***xxxx
  storedIn: 'localstorage' | 'keychain' | 'env'
  createdAt: string
}

const VAULT_KEY = 'finex-forex-api-vault'

export function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '*'.repeat(key.length)
  return key.slice(0, 4) + '*'.repeat(Math.max(4, key.length - 8)) + key.slice(-4)
}

export function getVault(): StoredKey[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(VAULT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveKey(provider: StoredKey['provider'], value: string, keyName?: string, storedIn: StoredKey['storedIn'] = 'localstorage'): void {
  if (typeof window === 'undefined') return
  const vault = getVault()
  const idx = vault.findIndex((k) => k.provider === provider)
  const entry: StoredKey = {
    provider,
    keyName: keyName ?? provider,
    value,
    masked: maskKey(value),
    storedIn,
    createdAt: new Date().toISOString(),
  }
  if (idx >= 0) vault[idx] = entry
  else vault.push(entry)
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

export function getKey(provider: StoredKey['provider']): string {
  const vault = getVault()
  return vault.find((k) => k.provider === provider)?.value ?? ''
}

export function deleteKey(provider: StoredKey['provider']): void {
  if (typeof window === 'undefined') return
  const vault = getVault().filter((k) => k.provider !== provider)
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

// For Windows Credential Manager integration (production):
// const result = await window.ipcRenderer.invoke('vault:set', { provider, value })
// Requires Electron app with main process having keytar/node-keytar package.
// Atau gunakan PowerShell: powershell -Command "cmdkey /generic:FINEX_GROQ /user:api /pass:<value>"
export async function saveToKeychain(provider: string, value: string): Promise<boolean> {
  // Stub: untuk production di Windows 11, panggil backend service (Python or PowerShell)
  // yang menggunakan Windows Credential Manager via `keytar` (Node) atau `wincred` (Python).
  console.log(`[vault] Would save ${provider} to OS keychain (stub)`)
  return true
}

// React hook for vault access with re-render on changes
export function useVault() {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  return {
    vault: getVault(),  // re-read every render (vault is small)
    saveKey: (p: StoredKey['provider'], v: string) => { saveKey(p, v); refresh() },
    deleteKey: (p: StoredKey['provider']) => { deleteKey(p); refresh() },
    maskKey,
    saveToKeychain,
    version,
  }
}

