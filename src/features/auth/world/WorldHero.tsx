import { useReducedMotion } from 'motion/react'
import { lazy, Suspense, useMemo } from 'react'

import { readSceneColors } from '@/components/world/sceneColors'
import { useThemeContext } from '@/hooks/useThemeContext'

import type { HeroSceneName } from './HeroCanvas'
import { useHeroSupported } from './useHeroSupported'
import './world.css'

// three.js, fiber and drei are ~250 KB gzipped: fetched only when a hero mounts.
const HeroCanvas = lazy(() => import('./HeroCanvas'))

/**
 * The decorative 3D turntable beside a signed-out page's content. Renders
 * nothing below 900px or without WebGL, so the page reads the same without
 * it; the canvas itself is aria-hidden.
 */
export function WorldHero({ scene, className }: { scene: HeroSceneName; className?: string }) {
  const supported = useHeroSupported()
  const still = useReducedMotion() ?? false
  const { isDark } = useThemeContext()
  // Re-read the tokens when the theme flips; html.dark swaps the CSS vars.
  const colors = useMemo(() => readSceneColors(), [isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) return null
  return (
    <div className={['world-hero', className].filter(Boolean).join(' ')} aria-hidden="true">
      <Suspense fallback={null}>
        <HeroCanvas scene={scene} colors={colors} still={still} />
      </Suspense>
    </div>
  )
}
