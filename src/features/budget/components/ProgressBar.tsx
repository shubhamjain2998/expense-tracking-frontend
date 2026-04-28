export function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color = pct >= 100 ? 'var(--neg)' : pct >= 80 ? 'var(--warn)' : 'var(--pos)'
  return (
    <div
      style={{
        position: 'relative',
        height: 4,
        background: 'var(--line)',
        borderRadius: 2,
        minWidth: 80,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${capped}%`,
          background: color,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: -2,
          bottom: -2,
          width: 1,
          background: 'var(--line-strong)',
        }}
      />
    </div>
  )
}
