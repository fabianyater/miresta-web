import { apiClient } from './client'
import type { SalonLayoutResponse, SalonResponse } from '@/types'

export const salonsApi = {
  getSalons: () => apiClient.get<SalonResponse[]>('/api/v1/salons').then((r) => r.data),

  createSalon: (name: string) =>
    apiClient.post<SalonResponse>('/api/v1/salons', { name }).then((r) => r.data),

  renameSalon: (id: number, name: string) =>
    apiClient.patch<SalonResponse>(`/api/v1/salons/${id}`, { name }).then((r) => r.data),

  moveSalon: (id: number, direction: 'UP' | 'DOWN') =>
    apiClient.patch<SalonResponse>(`/api/v1/salons/${id}/move`, { direction }).then((r) => r.data),

  deleteSalon: (id: number) => apiClient.delete(`/api/v1/salons/${id}`).then((r) => r.data),

  getLayouts: (id: number) =>
    apiClient.get<SalonLayoutResponse[]>(`/api/v1/salons/${id}/layouts`).then((r) => r.data),

  saveLayout: (id: number, name: string) =>
    apiClient.post<SalonLayoutResponse>(`/api/v1/salons/${id}/layouts`, { name }).then((r) => r.data),

  renameLayout: (id: number, layoutId: number, name: string) =>
    apiClient.patch<SalonLayoutResponse>(`/api/v1/salons/${id}/layouts/${layoutId}`, { name }).then((r) => r.data),

  deleteLayout: (id: number, layoutId: number) =>
    apiClient.delete(`/api/v1/salons/${id}/layouts/${layoutId}`).then((r) => r.data),

  applyLayout: (id: number, layoutId: number) =>
    apiClient.post(`/api/v1/salons/${id}/layouts/${layoutId}/apply`).then((r) => r.data),
}
