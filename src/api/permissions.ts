import { apiClient } from './client'
import type { Permission, Role, RolePermissionsResponse } from '@/types'

export const permissionsApi = {
  getMyPermissions: () => apiClient.get<Permission[]>('/api/v1/me/permissions').then((r) => r.data),

  getMatrix: () => apiClient.get<RolePermissionsResponse>('/api/v1/role-permissions').then((r) => r.data),

  updateRolePermissions: (role: Role, permissions: Permission[]) =>
    apiClient
      .put<Permission[]>(`/api/v1/role-permissions/${role}`, { permissions })
      .then((r) => r.data),
}
