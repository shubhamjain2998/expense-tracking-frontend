import * as Sentry from '@sentry/react'

import { APP_VERSION, IS_PROD, SENTRY_DSN, SENTRY_ENVIRONMENT } from './config'

export function initSentry(): void {
  if (!SENTRY_DSN) return
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: APP_VERSION,
    sampleRate: IS_PROD ? 1.0 : 0,
    tracesSampleRate: IS_PROD ? 0.1 : 0,
    integrations: [Sentry.browserTracingIntegration()],
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip the access_token from any captured request URLs / headers.
      if (event.request?.headers && 'Authorization' in event.request.headers) {
        event.request.headers.Authorization = '[redacted]'
      }
      return event
    },
  })
}

export function reportError(error: Error, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
