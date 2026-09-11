import { apiClient } from './client'
import type {
  CashMovementRequest,
  CashShiftResponse,
  CloseShiftRequest,
  OpenShiftRequest,
} from '@/types'

export const cashShiftsApi = {
  getCurrent: () =>
    apiClient.get<CashShiftResponse | null>('/api/cash-shifts/current').then((r) => r.data || null),

  list: () => apiClient.get<CashShiftResponse[]>('/api/cash-shifts').then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<CashShiftResponse>(`/api/cash-shifts/${id}`).then((r) => r.data),

  open: (data: OpenShiftRequest) =>
    apiClient.post<CashShiftResponse>('/api/cash-shifts/open', data).then((r) => r.data),

  close: (id: number, data: CloseShiftRequest) =>
    apiClient.patch<CashShiftResponse>(`/api/cash-shifts/${id}/close`, data).then((r) => r.data),

  addMovement: (id: number, data: CashMovementRequest) =>
    apiClient.post<CashShiftResponse>(`/api/cash-shifts/${id}/movements`, data).then((r) => r.data),
}
