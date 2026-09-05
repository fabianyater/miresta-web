import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      free: 'bg-status-free-bg text-status-free dark:bg-status-free/15',
      busy: 'bg-status-busy-bg text-status-busy dark:bg-status-busy/15',
      pending: 'bg-status-pending-bg text-status-pending dark:bg-status-pending/15',
      done: 'bg-status-done-bg text-status-done dark:bg-status-done/20 dark:text-neutral-300',
      neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
})

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
}
