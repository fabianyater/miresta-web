import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { menusApi } from '@/api/menus'
import { todayIso } from '@/lib/utils'

// Un producto del menú del día se marca "por agotarse" cuando quedan estas unidades
// o menos. Fijo por ahora; podría volverse un ajuste en Admin más adelante.
const LOW_STOCK_THRESHOLD = 3

/**
 * Aviso fijo con los productos del menú de hoy que ya se agotaron o están por
 * agotarse. Se alimenta de la misma consulta del menú (refresco cada 15s), así que
 * todos los dispositivos lo ven casi al mismo tiempo sin nada de tiempo real "de
 * verdad". No muestra nada si no hay ningún producto en riesgo.
 */
export function StockAlert() {
  const { data: menus } = useQuery({
    queryKey: ['menus', todayIso()],
    queryFn: () => menusApi.getMenus(todayIso()),
    refetchInterval: 15000,
  })

  const { out, low } = useMemo(() => {
    // Un mismo producto puede estar en varios menús (almuerzo y especial) — se toma
    // la cantidad más baja para no dar un falso "todavía hay".
    const byId = new Map<number, { name: string; qty: number }>()
    for (const menu of menus ?? []) {
      for (const item of menu.items) {
        for (const p of item.products) {
          if (p.quantity == null) continue
          const prev = byId.get(p.id)
          if (!prev || p.quantity < prev.qty) byId.set(p.id, { name: p.name.trim(), qty: p.quantity })
        }
      }
    }
    const all = [...byId.values()].sort((a, b) => a.qty - b.qty)
    return {
      out: all.filter((p) => p.qty <= 0),
      low: all.filter((p) => p.qty > 0 && p.qty <= LOW_STOCK_THRESHOLD),
    }
  }, [menus])

  if (out.length === 0 && low.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-status-busy/40 bg-status-busy-bg dark:bg-status-busy/10 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-status-busy mt-0.5 flex-shrink-0" />
        <div className="min-w-0 text-sm">
          {out.length > 0 && (
            <p className="text-neutral-800 dark:text-neutral-100">
              <span className="font-semibold">Agotado:</span> {out.map((p) => p.name).join(', ')}
            </p>
          )}
          {low.length > 0 && (
            <p className="text-neutral-700 dark:text-neutral-200">
              <span className="font-semibold">Quedan pocos:</span>{' '}
              {low.map((p) => `${p.name} (${p.qty})`).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
