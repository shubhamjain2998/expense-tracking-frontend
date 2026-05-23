import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'
import { onboardingStorage } from '@/lib/onboardingStorage'

/**
 * Lets the user re-show the first-login welcome modal and the Getting Started
 * checklist on the dashboard. Useful after dismissing them prematurely or for
 * onboarding a second household member sharing the same browser profile.
 */
export function OnboardingResetSection() {
  const toast = useToastContext()

  function handleReset() {
    onboardingStorage.reset()
    toast.success('Onboarding will re-appear on your next dashboard visit')
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Onboarding</p>
          <p className="card-sub">
            Re-show the welcome modal and the Getting Started checklist on the dashboard.
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={handleReset}>
        Restart onboarding
      </Button>
    </section>
  )
}
