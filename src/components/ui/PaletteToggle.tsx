import { Check } from 'lucide-react'
import { PALETTES, usePaletteStore } from '@/store/palette'
import { cn } from '@/lib/utils'

export function PaletteToggle() {
  const palette = usePaletteStore((s) => s.palette)
  const setPalette = usePaletteStore((s) => s.setPalette)

  return (
    <div className="flex items-center gap-2">
      {PALETTES.map(({ value, label, swatch }) => {
        const active = palette === value
        return (
          <button
            key={value}
            onClick={() => setPalette(value)}
            title={label}
            aria-label={label}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform',
              active ? 'scale-110 ring-2 ring-offset-2 ring-neutral-400 ring-offset-white dark:ring-offset-neutral-800' : 'hover:scale-105',
            )}
            style={{ backgroundColor: swatch }}
          >
            {active && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}
