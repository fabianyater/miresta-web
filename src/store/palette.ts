import { create } from 'zustand'

export type Palette = 'ambar' | 'esmeralda' | 'vino'

export const PALETTES: { value: Palette; label: string; swatch: string }[] = [
  { value: 'ambar', label: 'Ámbar', swatch: '#f2a90e' },
  { value: 'esmeralda', label: 'Esmeralda', swatch: '#10b981' },
  { value: 'vino', label: 'Vino', swatch: '#dc3f68' },
]

function applyPalette(palette: Palette) {
  // "ambar" es el de siempre — no necesita el atributo puesto, así que simplemente
  // se quita para volver al valor por defecto del CSS.
  if (palette === 'ambar') {
    delete document.documentElement.dataset.palette
  } else {
    document.documentElement.dataset.palette = palette
  }
}

const stored = (localStorage.getItem('miresta_palette') as Palette | null) ?? 'ambar'
applyPalette(stored)

interface PaletteState {
  palette: Palette
  setPalette: (palette: Palette) => void
}

export const usePaletteStore = create<PaletteState>((set) => ({
  palette: stored,
  setPalette: (palette) => {
    localStorage.setItem('miresta_palette', palette)
    applyPalette(palette)
    set({ palette })
  },
}))
