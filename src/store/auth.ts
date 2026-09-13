import { create } from 'zustand'
import { queryClient } from '@/lib/queryClient'
import type { Permission, Role } from '@/types'

interface AuthUser {
  email: string
  name: string
  displayName: string
  role: Role
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  // Permisos efectivos del usuario actual — se llenan tras el login y se refrescan
  // en cada carga de AppLayout (ver useSyncPermissions), por si el owner editó la
  // matriz desde la última vez que este usuario inició sesión.
  permissions: Permission[]
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  setPermissions: (permissions: Permission[]) => void
  hasPermission: (code: Permission) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('miresta_token'),
  user: (() => {
    const raw = localStorage.getItem('miresta_user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  })(),
  permissions: (() => {
    const raw = localStorage.getItem('miresta_permissions')
    return raw ? (JSON.parse(raw) as Permission[]) : []
  })(),
  isAuthenticated: !!localStorage.getItem('miresta_token'),

  login: (token, user) => {
    localStorage.setItem('miresta_token', token)
    localStorage.setItem('miresta_user', JSON.stringify(user))
    localStorage.removeItem('miresta_permissions')
    set({ token, user, permissions: [], isAuthenticated: true })
  },

  setPermissions: (permissions) => {
    localStorage.setItem('miresta_permissions', JSON.stringify(permissions))
    set({ permissions })
  },

  hasPermission: (code) => get().user?.role === 'OWNER' || get().permissions.includes(code),

  logout: () => {
    localStorage.removeItem('miresta_token')
    localStorage.removeItem('miresta_user')
    localStorage.removeItem('miresta_permissions')
    queryClient.clear()
    set({ token: null, user: null, permissions: [], isAuthenticated: false })
  },
}))
