import { apiClient } from './client'
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '@/types'

export const usersApi = {
  getUsers: () => apiClient.get<UserResponse[]>('/api/v1/users').then((r) => r.data),

  createUser: (data: CreateUserRequest) =>
    apiClient.post<UserResponse>('/api/v1/users', data).then((r) => r.data),

  updateUser: (id: number, data: UpdateUserRequest) =>
    apiClient.patch<UserResponse>(`/api/v1/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: number) => apiClient.delete(`/api/v1/users/${id}`).then((r) => r.data),
}
