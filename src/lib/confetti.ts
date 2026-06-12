import confetti from 'canvas-confetti'

/* Brand-palette confetti — oxblood, warm amber, green, cream, ink.
   One short burst; never loops. */
const PALETTE = ['#8f2f33', '#d9a13b', '#3e8e63', '#ece1cd', '#2b2622']

/** One-shot celebration burst for successful imports/restores. */
export function celebrate() {
  void confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    gravity: 1.1,
    ticks: 190,
    scalar: 0.9,
    origin: { y: 0.72 },
    colors: PALETTE,
    disableForReducedMotion: true,
    zIndex: 2000,
  })
}
