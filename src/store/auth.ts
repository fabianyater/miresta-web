import { create } from 'zustand'
import { queryClient } from '@/lib/queryClient'
import type { Role } from '@/types'

interface AuthUser {
  email: string
  name: string
  displayName: string
  role: Role
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('miresta_token'),
  user: (() => {
    const raw = localStorage.getItem('miresta_user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  })(),
  isAuthenticated: !!localStorage.getItem('miresta_token'),

  login: (token, user) => {
    localStorage.setItem('miresta_token', token)
    localStorage.setItem('miresta_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('miresta_token')
    localStorage.removeItem('miresta_user')
    queryClient.clear()
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
