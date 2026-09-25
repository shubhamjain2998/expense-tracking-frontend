/**
 * WebGL materials can't use var(--ink), so the scene reads the resolved
 * token values off <html> and re-reads them when the theme flips. Fallbacks
 * are the light-theme values from tokens.css, used only when a token is
 * missing (tests, or a stylesheet that hasn't loaded yet).
 */
export interface SceneColors {
  ink: string
  ink4: string
  line: string
  surface2: string
  accent: string
  neg: string
}

const FALLBACK: SceneColors = {
  ink: '#323641',
  ink4: '#838b98',
  line: '#c6ccd6',
  surface2: '#eef1f4',
  accent: '#2563eb',
  neg: '#b91c1c',
}

const TOKENS: Record<keyof SceneColors, string> = {
  ink: '--ink',
  ink4: '--ink-4',
  line: '--line-strong',
  surface2: '--surface-2',
  accent: '--accent',
  neg: '--neg',
}

export function readSceneColors(root: Element = document.documentElement): SceneColors {
  const style = getComputedStyle(root)
  const out = { ...FALLBACK }
  for (const key of Object.keys(TOKENS) as (keyof SceneColors)[]) {
    const value = style.getPropertyValue(TOKENS[key]).trim()
    if (value) out[key] = value
  }
  return out
}
