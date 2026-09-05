import { apiClient } from './client'
import type { TableEntityDto, TableSummaryResponse } from '@/types'

export const tablesApi = {
  getTables: () => apiClient.get<TableSummaryResponse>('/api/v1/tables').then((r) => r.data),

  createTable: (number: number) =>
    apiClient.post<TableEntityDto>('/api/v1/tables', { number }).then((r) => r.data),

  renameTable: (id: number, number: number) =>
    apiClient.patch<TableEntityDto>(`/api/v1/tables/${id}`, { number }).then((r) => r.data),

  deleteTable: (id: number) => apiClient.delete(`/api/v1/tables/${id}`).then((r) => r.data),
}
