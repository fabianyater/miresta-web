import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Check, LayoutGrid, Minus, Package, Plus, Search, Trash2 } from 'lucide-react'
import { menusApi } from '@/api/menus'
import { catalogApi } from '@/api/catalog'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { Dialog } from '@/components/ui/Dialog'
import { CategoryChip, CategoryRow } from '@/components/ui/CategoryNav'
import { ROLE_ICONS } from '@/lib/comboCategoryUi'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn, todayIso } from '@/lib/utils'
import type { CategoryResponse, MenuResponse, ProductDto, ProductInfo } from '@/types'

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

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.getCategories,
  })

  const existingMenu = menus?.find((m) => m.type === foodType)
  const formReady = !loadingProducts && !loadingMenus

  // Las bebidas nunca dependen del menú del día — están siempre disponibles y se
  // piden sueltas, así que no tiene sentido incluirlas al armar el menú.
  const menuCategories = useMemo(() => (categories ?? []).filter((c) => c.code !== 'BEBIDA'), [categories])
  const menuProducts = useMemo(() => {
    const drinkCategoryNames = new Set((categories ?? []).filter((c) => c.code === 'BEBIDA').map((c) => c.name))
    return (products ?? []).filter((p) => !drinkCategoryNames.has(p.category.name))
  }, [products, categories])

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
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
            products={menuProducts}
            categories={menuCategories}
            existingMenu={existingMenu}
          />
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex md:flex-col gap-1.5 md:w-48 flex-shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 md:w-full rounded-full md:rounded-xl flex-shrink-0" />
              ))}
            </div>
            <div className="flex-1 space-y-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
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
  categories: CategoryResponse[]
  existingMenu: MenuResponse | undefined
}

function MenuForm({ date, foodType, products, categories, existingMenu }: MenuFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!existingMenu
  const [selected, setSelected] = useState<Record<number, number | null>>(() => buildInitialSelection(existingMenu))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  const countByCategoryName = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      map.set(p.category.name, (map.get(p.category.name) ?? 0) + 1)
    }
    return map
  }, [products])

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesCategory = !selectedCategory || p.category.name === selectedCategory.name
      const matchesSearch = !q || p.name.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, search])

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

      <div className="flex flex-col md:flex-row gap-4">
        {/* Categories: horizontal chips on mobile, a sidebar list on desktop — igual que Catálogo */}
        <aside className="md:w-48 flex-shrink-0">
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
            <CategoryChip
              icon={LayoutGrid}
              label="Todos"
              count={products.length}
              active={selectedCategoryId === 'all'}
              onClick={() => setSelectedCategoryId('all')}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                icon={ROLE_ICONS[c.code]}
                label={c.name}
                count={countByCategoryName.get(c.name) ?? 0}
                active={selectedCategoryId === c.id}
                onClick={() => setSelectedCategoryId(c.id)}
              />
            ))}
          </div>
          <div className="hidden md:block space-y-1 max-h-[27rem] overflow-y-auto pr-1">
            <CategoryRow
              icon={LayoutGrid}
              label="Todos"
              count={products.length}
              active={selectedCategoryId === 'all'}
              onClick={() => setSelectedCategoryId('all')}
            />
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                icon={ROLE_ICONS[c.code]}
                label={c.name}
                count={countByCategoryName.get(c.name) ?? 0}
                active={selectedCategoryId === c.id}
                onClick={() => setSelectedCategoryId(c.id)}
              />
            ))}
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1 min-w-0">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[26rem] overflow-y-auto pr-1">
            {visibleProducts.map((p) => {
              const isSelected = p.id in selected
              const cat = categories.find((c) => c.name === p.category.name)
              const Icon = cat ? ROLE_ICONS[cat.code] : Package
              return (
                <button key={p.id} onClick={() => toggle(p.id)} className="relative text-left">
                  <Card
                    className={cn(
                      'p-2.5 flex flex-col items-center text-center gap-1.5',
                      isSelected && 'border-brand-500 dark:border-brand-500',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center mt-1',
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400',
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50 truncate w-full">
                      {p.name}
                    </span>
                  </Card>
                </button>
              )
            })}
          </div>
          {visibleProducts.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-6">
              {search ? 'Ningún producto coincide con la búsqueda.' : 'No hay productos en esta categoría.'}
            </p>
          )}
        </div>
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
