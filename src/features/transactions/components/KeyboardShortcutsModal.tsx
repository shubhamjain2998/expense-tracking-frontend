import { useEffect } from 'react'

import { Icon } from '@/components/ui/Icon'

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  heading: string
  shortcuts: Shortcut[]
}

const GROUPS: ShortcutGroup[] = [
  {
    heading: 'Navigation',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Move between transactions' },
      { keys: ['Esc'], description: 'Deselect row / close panel' },
    ],
  },
  {
    heading: 'Categorise',
    shortcuts: [
      { keys: ['1', '–', '9'], description: 'Categorise selected row with shortcut category' },
    ],
  },
  {
    heading: 'Quick add',
    shortcuts: [{ keys: ['Alt', 'N'], description: 'Open quick-add transaction dialog' }],
  },
  {
    heading: 'Help',
    shortcuts: [{ keys: ['?'], description: 'Show this keyboard shortcut overlay' }],
  },
]

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
            <Icon name="keyboard" size={16} style={{ color: 'var(--ink-3)' }} />
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="btn ghost icon sm" aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-auto px-5 py-4">
          {GROUPS.map((group) => (
            <div key={group.heading}>
              <p
                className="eyebrow mb-2"
                style={{
                  color: 'var(--ink-4)',
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {group.heading}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                      {s.description}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <span key={ki}>
                          {k === '–' ? (
                            <span style={{ color: 'var(--ink-4)', fontSize: 12, padding: '0 2px' }}>
                              –
                            </span>
                          ) : (
                            <kbd
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 26,
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--line)',
                                background: 'var(--surface-2)',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                color: 'var(--ink)',
                                boxShadow: '0 1px 0 var(--line)',
                              }}
                            >
                              {k}
                            </kbd>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="border-t border-[var(--line)] px-5 py-3 text-[11.5px]"
          style={{ color: 'var(--ink-4)' }}
        >
          Press{' '}
          <kbd
            style={{
              padding: '1px 5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            ?
          </kbd>{' '}
          or{' '}
          <kbd
            style={{
              padding: '1px 5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            Esc
          </kbd>{' '}
          to dismiss
        </div>
      </div>
    </div>
  )
}
