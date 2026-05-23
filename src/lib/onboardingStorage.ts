/**
 * localStorage flags driving the welcome modal + Getting Started checklist.
 *
 * Two flags are intentional:
 *   - `onboarded`: user has either completed onboarding OR explicitly dismissed
 *     the welcome modal. Hides the welcome modal forever.
 *   - `checklistDismissed`: user closed the Getting Started checklist before
 *     finishing it. The checklist also auto-hides when all 4 steps are done.
 */

const ONBOARDED_KEY = 'pf_onboarded'
const CHECKLIST_DISMISSED_KEY = 'pf_checklist_dismissed'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, 'true')
    else localStorage.removeItem(key)
  } catch {
    // localStorage unavailable (private browsing on some browsers) — fail silently.
  }
}

export const onboardingStorage = {
  isOnboarded: () => readFlag(ONBOARDED_KEY),
  setOnboarded: (v: boolean) => writeFlag(ONBOARDED_KEY, v),

  isChecklistDismissed: () => readFlag(CHECKLIST_DISMISSED_KEY),
  setChecklistDismissed: (v: boolean) => writeFlag(CHECKLIST_DISMISSED_KEY, v),

  /** Clear both flags so the welcome + checklist re-appear. Used by Settings. */
  reset: () => {
    writeFlag(ONBOARDED_KEY, false)
    writeFlag(CHECKLIST_DISMISSED_KEY, false)
  },
}
