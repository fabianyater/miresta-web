import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-sm',
        secondary:
          'bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-900 border border-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 dark:text-neutral-50 dark:border-neutral-600',
        ghost: 'hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 dark:text-neutral-300',
        danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
