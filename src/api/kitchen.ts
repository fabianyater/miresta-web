import { apiClient } from './client'
import type { KitchenMessageResponse } from '@/types'

export const kitchenApi = {
  send: (text: string) =>
    apiClient.post<KitchenMessageResponse>('/api/kitchen/messages', { text }).then((r) => r.data),

  // Sin `since`: los últimos 20 (historial). Con `since` (ISO): solo los nuevos.
  list: (since?: string) =>
    apiClient
      .get<KitchenMessageResponse[]>('/api/kitchen/messages', {
        params: since ? { since } : undefined,
      })
      .then((r) => r.data),

  getPhrases: () => apiClient.get<string[]>('/api/kitchen/phrases').then((r) => r.data),

  savePhrases: (phrases: string[]) =>
    apiClient.put<string[]>('/api/kitchen/phrases', { phrases }).then((r) => r.data),
}
