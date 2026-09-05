import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore, type ThemeMode } from '@/store/theme'
import { cn } from '@/lib/utils'

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = mode === value
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            title={label}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium transition-colors',
              active
                ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300',
            )}
          >
            <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggleIcon() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  const cycle = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(mode) + 1) % order.length]
    setMode(next)
  }

  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor

  return (
    <button onClick={cycle} className="text-neutral-400 dark:text-neutral-500 p-2 -mr-2">
      <Icon size={18} />
    </button>
  )
}
