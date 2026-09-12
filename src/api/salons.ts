import { apiClient } from './client'
import type { SalonResponse } from '@/types'

export const salonsApi = {
  getSalons: () => apiClient.get<SalonResponse[]>('/api/v1/salons').then((r) => r.data),

  createSalon: (name: string) =>
    apiClient.post<SalonResponse>('/api/v1/salons', { name }).then((r) => r.data),

  renameSalon: (id: number, name: string) =>
    apiClient.patch<SalonResponse>(`/api/v1/salons/${id}`, { name }).then((r) => r.data),

  moveSalon: (id: number, direction: 'UP' | 'DOWN') =>
    apiClient.patch<SalonResponse>(`/api/v1/salons/${id}/move`, { direction }).then((r) => r.data),

  deleteSalon: (id: number) => apiClient.delete(`/api/v1/salons/${id}`).then((r) => r.data),
}
