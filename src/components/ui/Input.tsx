import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="space-y-1">
    <input
      ref={ref}
      className={cn(
        'w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400',
        'dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-50 dark:placeholder:text-neutral-500',
        'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-colors',
        error && 'border-red-400 focus:border-red-400 focus:ring-red-400/30',
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = 'Input'
