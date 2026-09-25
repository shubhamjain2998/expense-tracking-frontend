import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'

const GROW_SECONDS = 0.8

/**
 * A 0→1 ref that rises once `run` turns true, and again whenever `key`
 * changes while it is true. Asks for frames only while rising.
 */
export function useGrow(run: boolean, key: unknown, instant: boolean) {
  const grow = useRef(instant ? 1 : 0)
  const invalidate = useThree((s) => s.invalidate)
  const lastKey = useRef<unknown>(undefined)
  useLayoutEffect(() => {
    if (instant) {
      grow.current = 1
    } else if (run && lastKey.current !== key) {
      lastKey.current = key
      grow.current = 0
      invalidate()
    }
  }, [run, key, instant, invalidate])
  useFrame((state, dt) => {
    if (grow.current >= 1 || (!run && !instant)) return
    grow.current = Math.min(1, grow.current + Math.min(dt, 1 / 30) / GROW_SECONDS)
    state.invalidate()
  })
  return grow
}
