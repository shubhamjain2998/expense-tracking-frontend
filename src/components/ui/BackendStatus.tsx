import { useEffect, useState } from 'react'

import { useBackendHealth, RETRY_SECONDS } from '../../hooks/useBackendHealth'

const MESSAGES = [
  { emoji: '☕', headline: "Server's on a coffee break", sub: 'Brewing a reconnection…' },
  { emoji: '😴', headline: "Backend's having a nap", sub: 'Gently poking it awake…' },
  { emoji: '🐹', headline: 'Hamster fell off the wheel', sub: 'Dispatching a replacement…' },
  { emoji: '🌧️', headline: 'The cloud evaporated', sub: 'Looking for an umbrella…' },
  { emoji: '🤔', headline: 'Server? What server?', sub: 'It was here a moment ago…' },
  { emoji: '📡', headline: 'Yelling into the void', sub: 'The void is not responding…' },
]

export function BackendStatus() {
  const { status, retryIn, retryNow } = useBackendHealth()
  const [msgIdx, setMsgIdx] = useState(0)

  // Derive visibility directly from status — hook transitions 'recovered' → 'online' after 2.6s
  const visible = status !== 'online'

  useEffect(() => {
    if (status !== 'offline') return
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 5000)
    return () => clearInterval(t)
  }, [status])

  if (!visible) return null

  const isRecovered = status === 'recovered'
  const msg = MESSAGES[msgIdx]
  const progressPct = retryIn > 0 ? (retryIn / RETRY_SECONDS) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed',
        top: 44,
        left: 200,
        right: 0,
        zIndex: 9999,
        height: 46,
        background: isRecovered ? 'var(--pos-soft)' : 'var(--warn-soft)',
        borderBottom: `1px solid ${isRecovered ? 'oklch(from var(--pos) l c h / 0.5)' : 'oklch(from var(--warn) l c h / 0.5)'}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        animation: 'slide-down 0.28s ease both',
        overflow: 'hidden',
      }}
    >
      {/* Pulsing emoji */}
      <span
        style={{
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
          display: 'inline-block',
          animation: isRecovered ? 'none' : 'beacon 2.2s ease-in-out infinite',
        }}
      >
        {isRecovered ? '✅' : msg.emoji}
      </span>

      {/* Text */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isRecovered ? 'var(--pos)' : 'var(--warn)',
            flexShrink: 0,
          }}
        >
          {isRecovered ? 'Back online!' : msg.headline}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isRecovered
            ? 'Connection restored — resuming where you left off'
            : retryIn > 0
              ? `${msg.sub} Retrying in ${retryIn}s`
              : `${msg.sub} Connecting…`}
        </span>
      </div>

      {/* Retry button */}
      {!isRecovered && (
        <button
          onClick={retryNow}
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius)',
            background: 'var(--warn)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Try now
        </button>
      )}

      {/* Progress bar draining across the bottom edge */}
      {!isRecovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            width: `${progressPct}%`,
            background: 'var(--warn)',
            opacity: 0.6,
            transition: 'width 1s linear',
          }}
        />
      )}
    </div>
  )
}
