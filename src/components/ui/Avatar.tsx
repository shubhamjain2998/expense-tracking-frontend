import type { AvatarPrefs } from '@/hooks/useAvatarPrefs'

interface AvatarProps {
  initials: string
  prefs: AvatarPrefs
  size?: number
  className?: string
}

export function Avatar({ initials, prefs, size = 32, className }: AvatarProps) {
  const showEmoji = prefs.mode === 'emoji' && prefs.emoji

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: prefs.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: showEmoji ? size * 0.5 : size * 0.38,
        fontWeight: 800,
        color: '#fff',
        userSelect: 'none',
      }}
      aria-label={showEmoji ? prefs.emoji : initials}
    >
      {showEmoji ? prefs.emoji : initials}
    </div>
  )
}
