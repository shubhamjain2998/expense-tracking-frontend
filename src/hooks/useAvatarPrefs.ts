import { useCallback, useState } from 'react'

export interface AvatarPrefs {
  mode: 'color' | 'emoji'
  color: string
  emoji: string
}

export const AVATAR_COLORS = [
  { label: 'Kosh amber', value: 'linear-gradient(135deg,#b8860b,#daa520)' },
  { label: 'Ruby', value: 'linear-gradient(135deg,#c0392b,#e74c3c)' },
  { label: 'Violet', value: 'linear-gradient(135deg,#8e44ad,#a569bd)' },
  { label: 'Sapphire', value: 'linear-gradient(135deg,#2471a3,#5dade2)' },
  { label: 'Emerald', value: 'linear-gradient(135deg,#1e8449,#52be80)' },
  { label: 'Terracotta', value: 'linear-gradient(135deg,#ba4a00,#e59866)' },
  { label: 'Midnight', value: 'linear-gradient(135deg,#1a252f,#2c3e50)' },
  { label: 'Lavender', value: 'linear-gradient(135deg,#6c3483,#d7bde2)' },
  { label: 'Teal', value: 'linear-gradient(135deg,#117a65,#76d7c4)' },
  { label: 'Caramel', value: 'linear-gradient(135deg,#784212,#f0b27a)' },
  { label: 'Slate', value: 'linear-gradient(135deg,#1c2833,#7f8c8d)' },
  { label: 'Coral', value: 'linear-gradient(135deg,#922b21,#f1948a)' },
] as const

export const AVATAR_EMOJI = [
  '😎',
  '🧠',
  '🦊',
  '🌿',
  '⚡',
  '🎯',
  '🚀',
  '🌊',
  '🔥',
  '💎',
  '🎵',
  '🌸',
  '🦋',
  '🏔️',
  '🎨',
  '⭐',
] as const

const STORAGE_KEY = 'pf_avatar'

const DEFAULT_PREFS: AvatarPrefs = {
  mode: 'color',
  color: AVATAR_COLORS[0].value,
  emoji: '',
}

function readPrefs(): AvatarPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<AvatarPrefs>
    return {
      mode: parsed.mode === 'emoji' ? 'emoji' : 'color',
      color: parsed.color || DEFAULT_PREFS.color,
      emoji: parsed.emoji || '',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function useAvatarPrefs() {
  const [prefs, setPrefsState] = useState<AvatarPrefs>(readPrefs)

  const setPrefs = useCallback((next: AvatarPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPrefsState(next)
  }, [])

  return { prefs, setPrefs }
}
