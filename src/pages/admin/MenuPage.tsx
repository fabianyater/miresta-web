import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Minus, Plus, Trash2 } from 'lucide-react'
import { menusApi } from '@/api/menus'
import { catalogApi } from '@/api/catalog'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { todayIso } from '@/lib/utils'
import type { MenuResponse, ProductDto, ProductInfo } from '@/types'

function toDdMmYyyy(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function buildInitialSelection(menu: MenuResponse | undefined): Record<number, number | null> {
  const map: Record<number, number | null> = {}
  if (!menu) return map
  for (const item of menu.items) {
    for (const p of item.products as ProductDto[]) {
      map[p.id] = p.quantity
    }
  }
  return map
}

export default function MenuPage() {
  const [date, setDate] = useState(todayIso())
  const [foodType, setFoodType] = useState('ALMUERZO')

  const { data: menus, isLoading: loadingMenus } = useQuery({
    queryKey: ['menus', date],
    queryFn: () => menusApi.getMenus(date),
  })

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: catalogApi.getProducts,
  })

  const existingMenu = menus?.find((m) => m.type === foodType)
  const formReady = !loadingProducts && !loadingMenus

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-5">Menú del día</h1>

      <Card className="p-4 mb-6">
        {/* El selector de fecha/tipo no depende de nada — se ve de una, aunque el
            resto del formulario (que sí depende del catálogo y del menú ya guardado)
            todavía esté cargando. */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={foodType} onChange={(e) => setFoodType(e.target.value)}>
            <option value="DESAYUNO">Desayuno</option>
            <option value="ALMUERZO">Almuerzo</option>
            <option value="ESPECIAL">Especial</option>
          </Select>
        </div>

        {formReady ? (
          <MenuForm
            key={`${date}-${foodType}`}
            date={date}
            foodType={foodType}
            products={products ?? []}
            existingMenu={existingMenu}
          />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg mt-4" />
          </div>
        )}
      </Card>

      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Menús de este día</h2>
      <div className="space-y-2">
        {loadingMenus &&
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-3 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        {!loadingMenus &&
          menus?.map((m) => (
            <Card key={m.id} className="p-3">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">{m.type}</p>
              {m.items.map((item) => (
                <p key={item.category} className="text-xs text-neutral-500">
                  {item.category}:{' '}
                  {item.products
                    .map((p) => (p.quantity == null ? p.name : `${p.name} (${p.quantity})`))
                    .join(', ')}
                </p>
              ))}
            </Card>
          ))}
        {!loadingMenus && menus?.length === 0 && <p className="text-sm text-neutral-400">No hay menús para este día.</p>}
      </div>
    </div>
  )
}

interface MenuFormProps {
  date: string
  foodType: string
  products: ProductInfo[]
  existingMenu: MenuResponse | undefined
}

function MenuForm({ date, foodType, products, existingMenu }: MenuFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!existingMenu
  const [selected, setSelected] = useState<Record<number, number | null>>(() => buildInitialSelection(existingMenu))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, ProductInfo[]>()
    for (const p of products) {
      const key = p.category?.name ?? 'Otros'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [products])

  const selectedIds = Object.keys(selected).map(Number)
  // Solo las proteínas necesitan límite de cantidad — lo demás (sopas, principios,
  // acompañantes, bebidas) se asume sin límite y no se les muestra el control.
  const proteinSelectedIds = selectedIds.filter(
    (id) => products.find((p) => p.id === id)?.category?.name === 'Proteínas',
  )

  const saveMenu = useMutation({
    mutationFn: () =>
      menusApi.createMenu({
        date: toDdMmYyyy(date),
        foodType,
        products: selectedIds.map((id) => ({
          id,
          quantity: selected[id],
          replacement: null,
        })),
      }),
    onSuccess: () => {
      toast.success(isEditing ? 'Menú actualizado' : 'Menú creado')
      queryClient.invalidateQueries({ queryKey: ['menus', date] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar el menú')),
  })

  const deleteMenu = useMutation({
    mutationFn: () => menusApi.deleteMenu(date, foodType),
    onSuccess: () => {
      toast.success('Menú eliminado')
      queryClient.invalidateQueries({ queryKey: ['menus', date] })
      setSelected({})
      setConfirmingDelete(false)
    },
    onError: (e) => {
      toast.error('No se pudo eliminar el menú', { description: getApiErrorMessage(e) })
      setConfirmingDelete(false)
    },
  })

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (id in prev) {
        const rest = { ...prev }
        delete rest[id]
        return rest
      }
      return { ...prev, [id]: null } // por defecto, sin límite
    })
  }

  const setQuantity = (id: number, value: number | null) => {
    setSelected((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <>
      {isEditing && (
        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium mb-3">
          Editando el menú ya creado para este día — los cambios reemplazan lo que había.
        </p>
      )}

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">{category}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={
                    p.id in selected
                      ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500 text-white'
                      : 'px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {proteinSelectedIds.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 dark:border-neutral-700 pt-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Cantidad disponible hoy (opcional — vacío = sin límite)
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {proteinSelectedIds.map((id) => {
              const product = products.find((p) => p.id === id)
              const qty = selected[id]
              return (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                    {product?.name ?? id}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setQuantity(id, Math.max(0, (qty ?? 0) - 1))}
                      disabled={qty == null || qty <= 0}
                      className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-600 flex items-center justify-center text-neutral-500 dark:text-neutral-400 disabled:opacity-30"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty ?? ''}
                      onChange={(e) =>
                        setQuantity(id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
                      }
                      placeholder="Sin límite"
                      className="w-16 text-xs rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-right text-neutral-900 dark:text-neutral-50"
                    />
                    <button
                      onClick={() => setQuantity(id, (qty ?? 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          className="flex-1"
          onClick={() => saveMenu.mutate()}
          disabled={selectedIds.length === 0}
          loading={saveMenu.isPending}
        >
          <CalendarPlus size={16} />
          {isEditing ? 'Actualizar menú' : 'Crear menú'}
        </Button>
        {isEditing && (
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <Dialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Eliminar menú">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar el menú de <strong>{foodType.toLowerCase()}</strong> para el {date.split('-').reverse().join('/')}?
          Si ya hay pedidos con este menú, no se podrá eliminar — puedes editarlo en su lugar.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmingDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deleteMenu.mutate()}
            loading={deleteMenu.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>
    </>
  )
}
