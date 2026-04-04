import { createContext, useContext } from 'react'

export interface ToastFns {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
  info: (msg: string) => void
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
