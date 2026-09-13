import { apiClient } from './client'
import type { TableEntityDto, TableSummaryResponse } from '@/types'

export const tablesApi = {
  getTables: () => apiClient.get<TableSummaryResponse>('/api/v1/tables').then((r) => r.data),

  createTable: (number: number, salonId: number) =>
    apiClient.post<TableEntityDto>('/api/v1/tables', { number, salonId }).then((r) => r.data),

  renameTable: (id: number, number: number, salonId?: number) =>
    apiClient.patch<TableEntityDto>(`/api/v1/tables/${id}`, { number, salonId }).then((r) => r.data),

  updatePosition: (id: number, positionX: number, positionY: number) =>
    apiClient
      .patch<TableEntityDto>(`/api/v1/tables/${id}/position`, { positionX, positionY })
      .then((r) => r.data),

  deleteTable: (id: number) => apiClient.delete(`/api/v1/tables/${id}`).then((r) => r.data),

  mergeTables: (primaryId: number, tableIds: number[]) =>
    apiClient.post(`/api/v1/tables/${primaryId}/merge`, { tableIds }).then((r) => r.data),

  unmergeTables: (primaryId: number) =>
    apiClient.post(`/api/v1/tables/${primaryId}/unmerge`).then((r) => r.data),
}
