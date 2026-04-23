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
    <div
      className="animate-toast-in flex items-start gap-2.5"
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: 'var(--shadow-pop)',
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      <span
        className="material-symbols-outlined mt-0.5 shrink-0"
        style={{ fontSize: 16, color: variantAccent[toast.variant] }}
      >
        {variantIcons[toast.variant]}
      </span>
      <p className="flex-1 text-[12.5px] leading-snug font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0"
        aria-label="Dismiss"
        style={{ color: 'var(--ink-4)', opacity: 0.7 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
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
