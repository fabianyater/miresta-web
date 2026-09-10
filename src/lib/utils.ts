import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrdersResponse } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "Efectivo", o "Efectivo + Transferencia" si se pagó dividido entre métodos (en ese
// caso paymentType queda null en el backend — el desglose real vive en `payments`).
export function paymentSummary(order: OrdersResponse): string | null {
  if (!order.paid) return null
  if (order.paymentType) return order.paymentType.name
  if (order.payments.length > 0) return order.payments.map((p) => p.paymentTypeName).join(' + ')
  return null
}

export function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('es-CO')
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// La fecha LOCAL de hoy (no la de `toISOString()`, que es en UTC) — Bogotá es UTC-5,
// así que desde las 7pm hora local en adelante toISOString() ya reporta el día
// siguiente, haciendo que "el menú/reporte de hoy" busque el de mañana justo en
// horas de cena.
export function todayIso(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
