import { KoshSeal } from './KoshSeal'

/**
 * Branded loading indicator — the KoshSeal spun continuously. Replaces plain
 * spinners for app-wide / route-level loading. Honours prefers-reduced-motion
 * (falls back to a gentle opacity pulse). Styling lives in components.css
 * (`.kosh-spinner`).
 */
interface KoshSpinnerProps {
  size?: number
  label?: string
}

export function KoshSpinner({ size = 84, label }: KoshSpinnerProps) {
  return (
    <div className="kosh-spinner" role="status" aria-live="polite">
      <KoshSeal size={size} className="kosh-spinner-seal" />
      {label ? (
        <span className="kosh-spinner-label">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  )
}
