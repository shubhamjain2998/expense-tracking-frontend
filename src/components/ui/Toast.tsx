import type { Toast as ToastType, ToastVariant } from '../../hooks/useToast'

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-[#8dd0e7] text-[#001f27]',
  error: 'bg-[#ffdad6] text-[#93000a]',
  warning: 'bg-[#fbb97c] text-[#2d1600]',
  info: 'bg-[#d6e5ec] text-[#101d23]',
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
      className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${variantStyles[toast.variant]} min-w-[280px] max-w-sm`}
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
