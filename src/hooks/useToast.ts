import { useState, useCallback } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  duration?: number
  action?: ToastAction
}

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  action?: ToastAction
}

let idCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant, opts: ToastOptions = {}) => {
      const id = String(++idCounter)
      setToasts((prev) => [...prev, { id, message, variant, action: opts.action }])
      setTimeout(() => dismiss(id), opts.duration ?? 4000)
    },
    [dismiss]
  )

  const toast = {
    success: (msg: string, opts?: ToastOptions) => show(msg, 'success', opts),
    error: (msg: string, opts?: ToastOptions) => show(msg, 'error', opts),
    warning: (msg: string, opts?: ToastOptions) => show(msg, 'warning', opts),
    info: (msg: string, opts?: ToastOptions) => show(msg, 'info', opts),
  }

  return { toasts, toast, dismiss }
}
