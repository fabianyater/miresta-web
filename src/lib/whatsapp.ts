import type { MenuResponse } from '@/types'

const RESTAURANT_NAME = 'Restaurante Tradición — Leña y Carbón'

// Los teléfonos se guardan como 10 dígitos (celular colombiano, ej. 3132322323).
// wa.me necesita el formato internacional sin "+" ni "00": 57 + número.
export function toWhatsappNumber(phone: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('3')) return '57' + digits
  if (digits.length === 12 && digits.startsWith('57')) return digits
  if (digits.length >= 10) return digits
  return null
}

const CATEGORY_ORDER = ['Sopas', 'Principios', 'Proteínas', 'Acompañantes', 'Especiales']
const CATEGORY_EMOJI: Record<string, string> = {
  Sopas: '\u{1F963}',
  Principios: '\u{1F35A}',
  'Proteínas': '\u{1F357}',
  'Acompañantes': '\u{1F957}',
  Especiales: '⭐',
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Texto del menú de almuerzo de hoy para mandar por WhatsApp. `null` si no hay menú. */
export function buildMenuMessage(almuerzo: MenuResponse | undefined): string | null {
  if (!almuerzo || almuerzo.items.length === 0) return null

  const today = capitalize(
    new Date()
      .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
      .replace(',', ''),
  )

  const sortedItems = [...almuerzo.items].sort((a, b) => catRank(a.category) - catRank(b.category))

  const lines = sortedItems
    .map((item) => {
      const products = item.products.map((p) => p.name.trim()).filter(Boolean)
      if (products.length === 0) return null
      const emoji = CATEGORY_EMOJI[item.category] ?? '•'
      return `${emoji} *${item.category}:* ${products.join(', ')}`
    })
    .filter(Boolean)

  return [
    `\u{1F37D} *${RESTAURANT_NAME}*`,
    `*Menú de hoy* · ${today}`,
    '',
    ...lines,
    '',
    '¡Los esperamos! \u{1F525}',
  ].join('\n')
}

function catRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category)
  return i === -1 ? CATEGORY_ORDER.length : i
}

/** Link "click to chat" de WhatsApp con el mensaje ya escrito. */
export function whatsappLink(phone: string, message: string): string | null {
  const number = toWhatsappNumber(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
