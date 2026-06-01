import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

import { type MeResponse, updatePeriodModePref } from '../lib/api/auth'
import {
  DEFAULT_PERIOD_MODE,
  PERIOD_MODE_STORAGE_KEY,
  type PeriodMode,
  loadPeriodMode,
  savePeriodMode,
} from '../lib/period'
import { qk } from '../lib/queryKeys'

import { useMe } from './useMe'

export interface UsePeriodModeResult {
  mode: PeriodMode
  /** True when the user has explicitly chosen — i.e. server has period_mode set. */
  isExplicitlySet: boolean
  /** True while /auth/me is still in-flight — prevents the onboarding gate from flashing. */
  isLoadingPreference: boolean
  /** True while the PATCH /auth/me/preferences request is in-flight. */
  isSavingMode: boolean
  /** True if the last PATCH /auth/me/preferences request failed. */
  isModeError: boolean
  setMode: (next: PeriodMode) => void
}

/**
 * Period mode is now persisted server-side per user. Reads come from `/auth/me`
 * (cached); writes hit `PATCH /auth/me/preferences`. localStorage is kept only
 * as a one-time migration source for users who set their mode before the
 * server preference existed.
 */
export function usePeriodMode(): UsePeriodModeResult {
  const qc = useQueryClient()
  const me = useMe()

  const serverMode = me.data?.period_mode ?? null
  const isExplicitlySet = serverMode !== null
  // While the /me request is in flight (or for unauth contexts), fall back to
  // the last-known localStorage value so the UI doesn't flicker.
  const mode: PeriodMode = serverMode ?? loadPeriodMode()

  const mutation = useMutation({
    mutationFn: (next: PeriodMode) => updatePeriodModePref(next),
    onSuccess: (data) => {
      qc.setQueryData<MeResponse>(qk.auth.me, data)
      savePeriodMode(data.period_mode ?? DEFAULT_PERIOD_MODE)
    },
  })

  // Sync the localStorage cache so pages that read it synchronously during
  // mount (for initial year/month state) see the right value on next visit.
  useEffect(() => {
    if (!me.data?.period_mode) return
    savePeriodMode(me.data.period_mode)
  }, [me.data?.period_mode])

  // One-time migration: if the server has no preference but localStorage does,
  // push the local value up so this device stops being the source of truth.
  useEffect(() => {
    if (!me.data) return
    if (me.data.period_mode !== null) return
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(PERIOD_MODE_STORAGE_KEY)
    if (stored !== 'calendar' && stored !== 'fy') return
    mutation.mutate(stored)
    // mutation is intentionally omitted — we only want this to fire on the
    // first /me response per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data])

  const setMode = useCallback(
    (next: PeriodMode) => {
      // Optimistic UI: write to cache immediately so the page re-renders without
      // waiting for the round-trip. The mutation will overwrite with the
      // server's authoritative value (or revert on failure).
      qc.setQueryData<MeResponse>(qk.auth.me, (prev) =>
        prev ? { ...prev, period_mode: next } : prev
      )
      savePeriodMode(next)
      mutation.mutate(next)
    },
    [mutation, qc]
  )

  return {
    mode,
    isExplicitlySet,
    isLoadingPreference: me.isPending,
    isSavingMode: mutation.isPending,
    isModeError: mutation.isError,
    setMode,
  }
}
