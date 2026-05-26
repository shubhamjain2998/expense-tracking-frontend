import { Icon, type IconName } from '@/components/ui/Icon'

import type { Toast as ToastType, ToastVariant } from '../../hooks/useToast'

const variantIcons: Record<ToastVariant, IconName> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const variantAccent: Record<ToastVariant, string> = {
  success: 'var(--pos)',
  error: 'var(--neg)',
  warning: 'var(--warn)',
  info: 'var(--accent)',
}

interface ToastItemProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div className="animate-toast-in flex max-w-[380px] min-w-[280px] items-start gap-2.5 rounded-[8px] bg-[var(--ink)] px-3 py-2.5 text-[var(--bg)] shadow-[var(--shadow-pop)]">
      <Icon
        name={variantIcons[toast.variant]}
        size={16}
        className="mt-0.5 shrink-0"
        style={{ color: variantAccent[toast.variant] }}
      />
      <p className="flex-1 text-[12.5px] leading-snug font-medium">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick()
            onDismiss(toast.id)
          }}
          className="shrink-0 text-[12px] font-semibold underline"
          style={{ color: variantAccent[toast.variant] }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0 text-[var(--ink-4)] opacity-70"
        aria-label="Dismiss"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
