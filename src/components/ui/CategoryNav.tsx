import type { LucideIcon } from 'lucide-react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Chip horizontal para el selector de categorías en móvil (fila con scroll). */
export function CategoryChip({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 border transition-colors',
        active
          ? 'bg-brand-500 border-brand-500 text-white'
          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300',
      )}
    >
      <Icon size={14} />
      {label}
      <span className={cn('text-[10px]', active ? 'text-white/80' : 'text-neutral-400')}>{count}</span>
    </button>
  )
}

/** Fila vertical para el sidebar de categorías en desktop — onEdit/onDelete opcionales
 * (Menú del día, por ejemplo, solo navega y no gestiona categorías desde aquí). */
export function CategoryRow({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  onEdit,
  onDelete,
}: {
  icon: LucideIcon
  label: string
  count: number
  active: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-colors border',
        active
          ? 'bg-brand-50 dark:bg-brand-500/15 border-brand-300 dark:border-brand-500/40'
          : 'bg-white dark:bg-neutral-800 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-700',
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          active
            ? 'bg-brand-500 text-white'
            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400',
        )}
      >
        <Icon size={15} />
      </div>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate flex-1">{label}</span>
      <span className="text-xs text-neutral-400 flex-shrink-0">{count}</span>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
