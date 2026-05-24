import { useEffect, useRef, useState } from 'react'

import { GOOGLE_CLIENT_ID } from '../../lib/config'

interface GoogleSignInButtonProps {
  /** "signin_with" on the login page, "signup_with" on the register page. */
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  onCredential: (credential: string) => void
  onError?: (message: string) => void
  disabled?: boolean
}

const SCRIPT_POLL_INTERVAL_MS = 50
const SCRIPT_POLL_TIMEOUT_MS = 5000

export function GoogleSignInButton({
  text = 'signin_with',
  onCredential,
  onError,
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Initialize from the live window so a fresh navigation with the script
  // already cached doesn't flash a non-ready state, which would also trip
  // the "no setState in effect body" lint rule.
  const [ready, setReady] = useState(() => Boolean(window.google?.accounts?.id))

  // Wait for the gsi/client script (loaded async/defer in index.html) to
  // attach window.google. Bail out after 5s so a CSP or network failure
  // surfaces a recoverable error instead of an indefinite spinner.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || ready) return
    const started = Date.now()
    const handle = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(handle)
        setReady(true)
      } else if (Date.now() - started > SCRIPT_POLL_TIMEOUT_MS) {
        window.clearInterval(handle)
        onError?.('Google sign-in failed to load')
      }
    }, SCRIPT_POLL_INTERVAL_MS)
    return () => window.clearInterval(handle)
  }, [ready, onError])

  useEffect(() => {
    if (!ready || !containerRef.current || !GOOGLE_CLIENT_ID) return
    const google = window.google!
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => {
        if (credential) onCredential(credential)
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320,
    })
  }, [ready, text, onCredential])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: 40,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  )
}
