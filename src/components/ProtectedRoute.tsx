import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { isTokenExpired } from '@/lib/jwt'
import type { Permission, Role } from '@/types'

export default function ProtectedRoute({ roles, permission }: { roles?: Role[]; permission?: Permission }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const logout = useAuthStore((s) => s.logout)

  const expired = isAuthenticated && !!token && isTokenExpired(token)

  // Side effect (clear storage/query cache) happens after render — the redirect
  // below already keeps the user out of protected content on this same pass.
  useEffect(() => {
    if (expired) logout()
  }, [expired, logout])

  if (!isAuthenticated || expired) {
    return <Navigate to="/login" replace />
  }

  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to="/mesas" replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}
