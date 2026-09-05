import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-neutral-200 rounded-xl shadow-sm dark:bg-neutral-800 dark:border-neutral-700',
        className,
      )}
      {...props}
    />
  )
}
