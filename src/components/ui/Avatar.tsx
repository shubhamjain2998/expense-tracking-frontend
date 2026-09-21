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
        // `prefs.color` is a `linear-gradient(...)` string assigned to the
        // `background` shorthand, which only ever sets `background-image` —
        // `background-color` stays at its initial `transparent`. An
        // explicit solid fallback here paints underneath it (invisible in
        // normal use, since the gradient is fully opaque) so nothing ever
        // renders as literally transparent if a custom color string is
        // ever malformed.
        backgroundColor: '#3f3f46',
        background: prefs.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: showEmoji ? size * 0.5 : size * 0.38,
        fontWeight: 800,
        color: '#fff',
        // Several palette gradients (useAvatarPrefs.AVATAR_COLORS) run
        // light enough at their lighter stop that white initials alone
        // fall under 4.5:1 there. A soft dark halo keeps the glyph legible
        // across the whole gradient without changing the color palette.
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
        userSelect: 'none',
      }}
      aria-label={showEmoji ? prefs.emoji : initials}
    >
      {showEmoji ? prefs.emoji : initials}
    </div>
  )
}
