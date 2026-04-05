import type { Toast as ToastType, ToastVariant } from '../../hooks/useToast'

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-primary-fixed-dim text-on-primary-fixed',
  error: 'bg-error-container text-on-error-container',
  warning: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
  info: 'bg-secondary-container text-on-secondary-container',
}

const variantIcons: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

interface ToastItemProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div
      className={`animate-toast-in flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${variantStyles[toast.variant]} max-w-sm min-w-[280px]`}
    >
      <span className="material-symbols-outlined mt-0.5 shrink-0">
        {variantIcons[toast.variant]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-base">close</span>
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
    <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
