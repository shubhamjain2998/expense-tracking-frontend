import { useCallback, useState } from 'react'

export interface AvatarPrefs {
  mode: 'color' | 'emoji'
  color: string
  emoji: string
}

// Darkened 2026-09-21 (Phase 9's follow-up cleanup): every gradient below
// clears 4.5:1 contrast against white initials at BOTH stops and at the
// midpoint (not just the midpoint, which is all the original palette was
// checked at). Verified with `src/hooks/useAvatarPrefs.test.ts`, which
// computes WCAG relative luminance directly from these strings rather than
// re-eyeballing hex values. Same hue families as before — this is a
// darkening pass, not a re-hue — except Lavender and Coral, which needed a
// small hue nudge (still within their family) because darkening otherwise
// collapsed them onto Violet's and Ruby's colors respectively.
export const AVATAR_COLORS = [
  { label: 'Kosh amber', value: 'linear-gradient(135deg,#976e09,#947016)' },
  { label: 'Ruby', value: 'linear-gradient(135deg,#c0392b,#e02e1c)' },
  { label: 'Violet', value: 'linear-gradient(135deg,#8e44ad,#9c5ab6)' },
  { label: 'Sapphire', value: 'linear-gradient(135deg,#2471a3,#217bb6)' },
  { label: 'Emerald', value: 'linear-gradient(135deg,#1e8449,#328455)' },
  { label: 'Terracotta', value: 'linear-gradient(135deg,#ba4a00,#b85b1f)' },
  { label: 'Midnight', value: 'linear-gradient(135deg,#1a252f,#2c3e50)' },
  { label: 'Lavender', value: 'linear-gradient(135deg,#523483,#8565bb)' },
  { label: 'Teal', value: 'linear-gradient(135deg,#117a65,#268371)' },
  { label: 'Caramel', value: 'linear-gradient(135deg,#784b12,#a86613)' },
  { label: 'Slate', value: 'linear-gradient(135deg,#1c2833,#6b7878)' },
  { label: 'Coral', value: 'linear-gradient(135deg,#924221,#c94d18)' },
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
