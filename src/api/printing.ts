import { apiClient } from './client'
import type { PrinterSettingResponse, TicketPreviewResponse, UpdatePrinterSettingRequest } from '@/types'

export const printingApi = {
  printComanda: (orderId: number) =>
    apiClient.post<TicketPreviewResponse>(`/api/orders/${orderId}/print/comanda`).then((r) => r.data),

  printCuenta: (orderId: number) =>
    apiClient.post<TicketPreviewResponse>(`/api/orders/${orderId}/print/cuenta`).then((r) => r.data),

  printResumen: (date: string) =>
    apiClient
      .post<TicketPreviewResponse>('/api/reports/print/resumen', null, { params: { date } })
      .then((r) => r.data),

  getPrinterSetting: () =>
    apiClient.get<PrinterSettingResponse>('/api/v1/printer-setting').then((r) => r.data),

  updatePrinterSetting: (data: UpdatePrinterSettingRequest) =>
    apiClient.put<PrinterSettingResponse>('/api/v1/printer-setting', data).then((r) => r.data),
}
