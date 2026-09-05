import { apiClient } from './client'
import type { PriceCode, PriceSettingHistoryResponse, PriceSettingResponse, UpdatePriceSettingRequest } from '@/types'

export const priceSettingsApi = {
  getAll: () => apiClient.get<PriceSettingResponse[]>('/api/v1/price-settings').then((r) => r.data),

  update: (code: PriceCode, data: UpdatePriceSettingRequest) =>
    apiClient.put<PriceSettingResponse>(`/api/v1/price-settings/${code}`, data).then((r) => r.data),

  getHistory: (code: PriceCode) =>
    apiClient.get<PriceSettingHistoryResponse[]>(`/api/v1/price-settings/${code}/history`).then((r) => r.data),

  delete: (code: PriceCode) => apiClient.delete(`/api/v1/price-settings/${code}`).then((r) => r.data),
}
