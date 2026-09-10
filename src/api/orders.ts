import { apiClient } from './client'
import type {
  CreateOrderRequest,
  CustomerBalanceResponse,
  CustomerPaymentResponse,
  DailyReportResponse,
  OrderDetailsResponse,
  OrdersResponse,
  PayOrderRequest,
  PaymentResultResponse,
  PaymentTotalResponse,
  SettleTabRequest,
  SettleTabResponse,
  UpdateStatusRequest,
} from '@/types'

export const ordersApi = {
  createOrder: (data: CreateOrderRequest) => apiClient.post('/api/orders', data).then((r) => r.data),

  getOrders: (params?: { status?: string; customerId?: number }) =>
    apiClient.get<OrdersResponse[]>('/api/orders', { params }).then((r) => r.data),

  getOrderHistory: (date: string) =>
    apiClient.get<OrdersResponse[]>('/api/orders/history', { params: { date } }).then((r) => r.data),

  getOrderDetail: (orderId: number) =>
    apiClient.get<OrderDetailsResponse>(`/api/orders/${orderId}`).then((r) => r.data),

  getPendingOrderForTable: (tableId: number) =>
    apiClient.get<OrderDetailsResponse | null>(`/api/orders/pending/${tableId}`).then((r) => r.data),

  updateStatus: (orderId: number, data: UpdateStatusRequest) =>
    apiClient
      .patch<PaymentResultResponse | null>(`/api/orders/${orderId}/status`, data)
      .then((r) => r.data || null),

  payOrder: (orderId: number, data: PayOrderRequest) =>
    apiClient.patch<PaymentResultResponse>(`/api/orders/${orderId}/pay`, data).then((r) => r.data),

  fiarCliente: (orderId: number, customerId: number) =>
    apiClient
      .patch<OrderDetailsResponse>(`/api/orders/${orderId}/fiar-cliente`, { customerId })
      .then((r) => r.data),

  settleCustomerTab: (customerId: number, data: SettleTabRequest) =>
    apiClient.post<SettleTabResponse>(`/api/orders/customers/${customerId}/settle`, data).then((r) => r.data),

  getCustomerBalances: () =>
    apiClient.get<CustomerBalanceResponse[]>('/api/orders/customers/balances').then((r) => r.data),

  getCustomerPayments: (customerId: number) =>
    apiClient
      .get<CustomerPaymentResponse[]>(`/api/orders/customers/${customerId}/payments`)
      .then((r) => r.data),

  getPaymentTotals: (date: string) =>
    apiClient
      .get<PaymentTotalResponse[]>('/api/orders/reports/payment-totals', { params: { date } })
      .then((r) => r.data),

  getDailyReport: (date: string) =>
    apiClient.get<DailyReportResponse>('/api/orders/reports/daily', { params: { date } }).then((r) => r.data),
}
