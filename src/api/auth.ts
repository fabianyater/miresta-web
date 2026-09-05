import { apiClient } from './client'
import type { LoginResponse } from '@/types'

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>('/api/auth/login', data).then((r) => r.data),
}
