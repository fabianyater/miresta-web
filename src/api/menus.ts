import { apiClient } from './client'
import type { CreateMenuRequest, MenuResponse } from '@/types'

export const menusApi = {
  getMenus: (date?: string) =>
    apiClient
      .get<MenuResponse[]>('/api/v1/menus', { params: date ? { date } : undefined })
      .then((r) => r.data),

  createMenu: (data: CreateMenuRequest) => apiClient.post('/api/v1/menus', data).then((r) => r.data),

  deleteMenu: (date: string, foodType: string) =>
    apiClient.delete('/api/v1/menus', { params: { date, foodType } }).then((r) => r.data),
}
