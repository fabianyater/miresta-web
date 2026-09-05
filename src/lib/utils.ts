import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
