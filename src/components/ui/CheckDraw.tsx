/** Animated checkmark — circle and tick draw themselves in on mount.
 *  Stroke-dash animation lives in utilities.css (.check-draw). */
export function CheckDraw({ size = 56 }: { size?: number }) {
  return (
    <svg
      className="check-draw"
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
    >
      <circle cx="28" cy="28" r="25" stroke="var(--pos)" strokeWidth="2.5" />
      <path
        d="M17 29l8 8 14-16"
        stroke="var(--pos)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
