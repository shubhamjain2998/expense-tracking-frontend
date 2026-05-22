import { createContext, useContext } from 'react'

import type { ToastOptions } from './useToast'

export interface ToastFns {
  success: (msg: string, opts?: ToastOptions) => void
  error: (msg: string, opts?: ToastOptions) => void
  warning: (msg: string, opts?: ToastOptions) => void
  info: (msg: string, opts?: ToastOptions) => void
}

export const ToastContext = createContext<ToastFns>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

export function useToastContext() {
  return useContext(ToastContext)
}
