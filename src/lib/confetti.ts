import confetti from 'canvas-confetti'

/* Brand-palette confetti — oxblood, warm amber, green, cream, ink.
   One short burst; never loops. */
const PALETTE = ['#8f2f33', '#d9a13b', '#3e8e63', '#ece1cd', '#2b2622']

// JSDOM has no canvas 2D context — firing confetti there throws asynchronously
// inside its rAF loop, so feature-detect once instead of try/catch.
let canvasSupported: boolean | null = null
function hasCanvas(): boolean {
  if (canvasSupported === null) {
    try {
      canvasSupported = !!document.createElement('canvas').getContext('2d')
    } catch {
      canvasSupported = false
    }
  }
  return canvasSupported
}

/** One-shot celebration burst for successful imports/restores. */
export function celebrate() {
  if (!hasCanvas()) return
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
