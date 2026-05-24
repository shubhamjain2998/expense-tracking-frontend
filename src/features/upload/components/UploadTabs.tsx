import type { UploadMode } from '../types'

interface UploadTabsProps {
  mode: UploadMode
  onSwitch: (mode: UploadMode) => void
}

const TABS: { id: UploadMode; label: string; icon: string }[] = [
  { id: 'pdf', label: 'PDF statement', icon: 'picture_as_pdf' },
  { id: 'paste', label: 'Paste text', icon: 'content_paste' },
  { id: 'manual', label: 'Manual entry', icon: 'add' },
]

export function UploadTabs({ mode, onSwitch }: UploadTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const isOn = mode === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            className="flex items-center gap-1.5"
            style={{
              height: 30,
              padding: '0 11px',
              border: isOn ? '1.5px solid var(--accent)' : '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
              background: isOn ? 'var(--accent-soft)' : 'transparent',
              color: isOn ? 'var(--accent)' : 'var(--ink-3)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'inherit' }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
