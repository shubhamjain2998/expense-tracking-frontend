/**
 * Ambient aurora background — a slow-moving, brand-coloured glow fixed behind
 * the entire app. Visible in the page margins and the gaps between cards;
 * regular cards stay opaque, so it never competes with data. Desktop-only and
 * motion-frozen under `prefers-reduced-motion` — both handled purely in CSS
 * (see `.aurora-bg` in components.css). Presentational only.
 */
export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true" data-testid="aurora-bg">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-grain" />
    </div>
  )
}
