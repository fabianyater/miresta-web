import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type ToastItem } from '@/store/toast'
import { cn } from '@/lib/utils'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const iconCls = {
  success: 'text-status-free',
  error: 'text-red-500',
  info: 'text-status-pending',
}

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const Icon = icons[item.variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 shadow-lg',
        'transition-all duration-200 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      <Icon size={16} className={cn('mt-0.5 flex-shrink-0', iconCls[item.variant])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">{item.description}</p>
        )}
      </div>
      <button
        onClick={() => dismiss(item.id)}
        className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 md:top-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full flex justify-center">
          <Toast item={item} />
        </div>
      ))}
    </div>
  )
}
