/**
 * Single source of truth for runtime configuration.
 *
 * Vite exposes env vars prefixed with VITE_ through `import.meta.env`. Read them
 * here and re-export typed values so call sites don't repeat the fallback or
 * sprinkle `import.meta.env` lookups across the codebase.
 */

const DEFAULT_API_URL = 'http://localhost:8000'

function readApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (!raw) return DEFAULT_API_URL
  // Strip trailing slash for consistent path joining.
  return raw.replace(/\/+$/, '')
}

export const API_URL = readApiUrl()

export const IS_DEV = import.meta.env.DEV
export const IS_PROD = import.meta.env.PROD

export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN?.trim() || null
export const SENTRY_ENVIRONMENT =
  import.meta.env.VITE_SENTRY_ENV?.trim() || (IS_PROD ? 'production' : 'development')
export const APP_VERSION = import.meta.env.VITE_APP_VERSION?.trim() || 'dev'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''
