import { apiClient } from './client'
import type { PaymentTypeResponse } from '@/types'

export const paymentTypesApi = {
  getPaymentTypes: () =>
    apiClient.get<PaymentTypeResponse[]>('/api/v1/payment-types').then((r) => r.data),
}
