import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="space-y-1">
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none bg-white border border-neutral-200 rounded-lg px-3.5 py-2.5 pr-9 text-sm text-neutral-900',
            'dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-50',
            'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-colors',
            error && 'border-red-400',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
