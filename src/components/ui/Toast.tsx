import type { Toast as ToastType, ToastVariant } from '../../hooks/useToast'

const variantIcons: Record<ToastVariant, string> = {
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
    <div className="animate-toast-in flex items-start gap-2.5 bg-[var(--ink)] text-[var(--bg)] rounded-[8px] py-2.5 px-3 shadow-[var(--shadow-pop)] min-w-[280px] max-w-[380px]">
      <span
        className="material-symbols-outlined mt-0.5 shrink-0 text-[16px]"
        style={{ color: variantAccent[toast.variant] }}
      >
        {variantIcons[toast.variant]}
      </span>
      <p className="flex-1 text-[12.5px] leading-snug font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0 text-[var(--ink-4)] opacity-70"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[14px]">
          close
        </span>
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
