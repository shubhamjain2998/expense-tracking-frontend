import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional fallback. Receives the caught error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Hook for telemetry — Sentry, console, etc. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
    console.error('[ErrorBoundary]', error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset)
      return <DefaultFallback error={error} onReset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-[40vh] flex-col items-center justify-center text-center"
      style={{ padding: 32, color: 'var(--ink)' }}
    >
      <p className="card-eyebrow mb-2">Something went wrong</p>
      <h1
        className="text-[22px] font-semibold"
        style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
      >
        Unexpected error
      </h1>
      <p className="mt-2 max-w-md text-[13px]" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
        {error.message || 'An unrecoverable error occurred while rendering this view.'}
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={onReset} className="btn primary">
          Try again
        </button>
        <button onClick={() => window.location.assign('/dashboard')} className="btn">
          Go to dashboard
        </button>
      </div>
    </div>
  )
}
