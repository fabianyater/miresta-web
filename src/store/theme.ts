import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

function applyTheme(mode: ThemeMode) {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
}

const stored = (localStorage.getItem('miresta_theme') as ThemeMode | null) ?? 'system'
applyTheme(stored)

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const current = (localStorage.getItem('miresta_theme') as ThemeMode) ?? 'system'
  if (current === 'system') applyTheme('system')
})

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: stored,
  setMode: (mode) => {
    localStorage.setItem('miresta_theme', mode)
    applyTheme(mode)
    set({ mode })
  },
}))
