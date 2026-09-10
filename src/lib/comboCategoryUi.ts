// Presentación compartida de ComboCategory (icono + label) — usada donde se navega o
// se elige por categoría: Catálogo, Menú del día, y donde más haga falta.
import { Soup, Wheat, Beef, Salad, PlusCircle, CupSoda, Star, Package, type LucideIcon } from 'lucide-react'
import type { ComboCategory } from '@/types'

export const ROLE_LABELS: Record<ComboCategory, string> = {
  SOPA: 'Sopa',
  PRINCIPIO: 'Principio',
  PROTEINA: 'Proteína',
  ACOMPANANTE: 'Acompañante',
  ADICIONAL: 'Adicional',
  BEBIDA: 'Bebida',
  ESPECIAL: 'Especial',
  ENVASE: 'Envase',
}

export const ROLE_ICONS: Record<ComboCategory, LucideIcon> = {
  SOPA: Soup,
  PRINCIPIO: Wheat,
  PROTEINA: Beef,
  ACOMPANANTE: Salad,
  ADICIONAL: PlusCircle,
  BEBIDA: CupSoda,
  ESPECIAL: Star,
  ENVASE: Package,
}

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [ComboCategory, string][]
