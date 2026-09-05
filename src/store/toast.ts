import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

interface ToastState {
  toasts: ToastItem[]
  _add: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  _add(t) {
    const id = Math.random().toString(36).slice(2, 9)
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 4000)
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

function add(variant: ToastVariant, title: string, opts?: { description?: string }) {
  useToastStore.getState()._add({ variant, title, ...opts })
}

export const toast = {
  success: (title: string, opts?: { description?: string }) => add('success', title, opts),
  error: (title: string, opts?: { description?: string }) => add('error', title, opts),
  info: (title: string, opts?: { description?: string }) => add('info', title, opts),
}
