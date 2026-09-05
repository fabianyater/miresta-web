// Espejo de los comboLabel que devuelve PricingCalculator (backend).
export const COMBO_LABELS: Record<string, string> = {
  ALMUERZO_COMPLETO: 'Almuerzo completo',
  ALMUERZO_BANDEJA: 'Bandeja',
  DESAYUNO_COMPLETO: 'Desayuno completo',
  DESAYUNO_BANDEJA: 'Bandeja',
  ESPECIAL_COMPLETO: 'Especial',
  SOLO_SOPA: 'Solo sopa',
  SOLO_PROTEINA: 'Solo proteína',
  SOLO_ACOMPANANTE: 'Solo acompañante',
  SUELTOS: 'Sueltos',
}

export function comboLabelText(comboLabel: string | null): string | null {
  if (!comboLabel) return null
  return COMBO_LABELS[comboLabel] ?? comboLabel
}
