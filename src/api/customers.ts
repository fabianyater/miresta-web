import { apiClient } from './client'
import type { CustomerRequest, CustomerResponse, UpdateCustomerRequest } from '@/types'

export const customersApi = {
  getCustomers: (phone?: string) =>
    apiClient
      .get<CustomerResponse[]>('/api/v1/customers', { params: phone ? { phone } : undefined })
      .then((r) => r.data),

  getCustomer: (id: number) => apiClient.get<CustomerResponse>(`/api/v1/customers/${id}`).then((r) => r.data),

  createCustomer: (data: CustomerRequest) =>
    apiClient.post<CustomerResponse>('/api/v1/customers', data).then((r) => r.data),

  updateCustomer: (id: number, data: UpdateCustomerRequest) =>
    apiClient.patch<CustomerResponse>(`/api/v1/customers/${id}`, data).then((r) => r.data),

  deleteCustomer: (id: number) => apiClient.delete(`/api/v1/customers/${id}`).then((r) => r.data),
}
