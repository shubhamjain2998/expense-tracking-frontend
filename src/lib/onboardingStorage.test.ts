import { beforeEach, describe, expect, it } from 'vitest'

import { onboardingStorage } from './onboardingStorage'

describe('onboardingStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false for both flags when storage is empty', () => {
    expect(onboardingStorage.isOnboarded()).toBe(false)
    expect(onboardingStorage.isChecklistDismissed()).toBe(false)
  })

  it('round-trips the onboarded flag', () => {
    onboardingStorage.setOnboarded(true)
    expect(onboardingStorage.isOnboarded()).toBe(true)
    expect(localStorage.getItem('pf_onboarded')).toBe('true')
  })

  it('round-trips the checklist-dismissed flag', () => {
    onboardingStorage.setChecklistDismissed(true)
    expect(onboardingStorage.isChecklistDismissed()).toBe(true)
    expect(localStorage.getItem('pf_checklist_dismissed')).toBe('true')
  })

  it('setting false removes the underlying key rather than storing "false"', () => {
    onboardingStorage.setOnboarded(true)
    onboardingStorage.setOnboarded(false)
    expect(localStorage.getItem('pf_onboarded')).toBeNull()
    expect(onboardingStorage.isOnboarded()).toBe(false)
  })

  it('reset() clears both flags', () => {
    onboardingStorage.setOnboarded(true)
    onboardingStorage.setChecklistDismissed(true)
    onboardingStorage.reset()
    expect(onboardingStorage.isOnboarded()).toBe(false)
    expect(onboardingStorage.isChecklistDismissed()).toBe(false)
  })
})
