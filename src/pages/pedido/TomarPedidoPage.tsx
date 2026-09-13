import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Send, ArrowLeft, ListPlus, X, Receipt, Repeat, User } from 'lucide-react'
import { catalogApi } from '@/api/catalog'
import { menusApi } from '@/api/menus'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
import { printingApi } from '@/api/printing'
import { tablesApi } from '@/api/tables'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/store/toast'
import { cn, formatMoney, todayIso } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiErrors'
import type { ComboCategory, CustomerResponse, ProductWithIdAndQuantity } from '@/types'

const MEAL_TYPES: { value: string; label: string }[] = [
  { value: 'DESAYUNO', label: 'Desayuno' },
  { value: 'ALMUERZO', label: 'Almuerzo' },
  { value: 'ESPECIAL', label: 'Especial' },
]

const MEAL_TYPE_LABELS: Record<string, string> = Object.fromEntries(MEAL_TYPES.map((m) => [m.value, m.label]))

const REPLACEMENT_OPTIONS: { value: ComboCategory | ''; label: string }[] = [
  { value: '', label: 'Ninguno' },
  { value: 'SOPA', label: 'Sopa' },
  { value: 'PRINCIPIO', label: 'Principio' },
  { value: 'PROTEINA', label: 'Proteína' },
  { value: 'ACOMPANANTE', label: 'Acompañante' },
]

interface OrderLine {
  quantity: number
  replacement: ComboCategory | ''
}

// Un plato ya armado, listo para enviar — una mesa con 4 personas puede tener hasta 4
// de estos antes de tocar "Enviar pedidos". Cada uno lleva su propio cliente (o
// ninguno) — una mesa puede mezclar platos de distintas personas en un solo pedido.
interface BatchEntry {
  key: string
  mealType: string
  isToGo: boolean
  // null si no hay menú configurado hoy para este tipo de comida — sigue siendo un
  // plato válido si solo trae bebidas, que no dependen del menú del día.
  menuId: number | null
  items: ProductWithIdAndQuantity[]
  comments: string | null
  customer: CustomerResponse | null
  summary: string
}


export default function TomarPedidoPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mealType, setMealType] = useState('ALMUERZO')
  const [isToGo, setIsToGo] = useState(!tableId)
  const [lines, setLines] = useState<Record<number, OrderLine>>({})
  const [replacementOpenFor, setReplacementOpenFor] = useState<number | null>(null)
  const [comments, setComments] = useState('')
  const [batch, setBatch] = useState<BatchEntry[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  // Productos que el mesero agregó a mano por el buscador aunque no estén en el menú
  // de hoy (ej. huevo, aunque hoy la proteína oficial sea otra) — se muestran en su
  // propia categoría como cualquier otro producto, con el mismo cálculo de precio.
  const [extraProductIds, setExtraProductIds] = useState<Set<number>>(new Set())
  const [extraSearch, setExtraSearch] = useState('')

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['products'],
    queryFn: catalogApi.getProducts,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.getCategories,
  })

  const { data: menus, isLoading: loadingMenus } = useQuery({
    queryKey: ['menus', todayIso()],
    queryFn: () => menusApi.getMenus(todayIso()),
    refetchInterval: 15000,
  })

  const { data: pendingOrder, isLoading: loadingPendingOrder } = useQuery({
    queryKey: ['pending-order', tableId],
    queryFn: () => ordersApi.getPendingOrderForTable(Number(tableId)),
    enabled: !!tableId,
    refetchInterval: 15000,
  })

  // `tableId` en la URL es el id de la mesa (llave primaria), no su número — hay que
  // buscarlo en la lista de mesas para mostrar el número real (ej. "Mesa 6", no
  // "Mesa 8" si esa mesa quedó con el id 8 pero renombrada al número 6).
  const { data: tablesSummary } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesApi.getTables,
    enabled: !!tableId,
  })
  const currentTableNumber = tablesSummary?.tables.find((t) => t.id === Number(tableId))?.number

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers(),
  })

  // Stock por lotes (hoy, básicamente bebidas) — independiente del menú del día y
  // del tipo de comida, así que se consulta una sola vez para toda la pantalla.
  const { data: drinkStock } = useQuery({
    queryKey: ['products-stock'],
    queryFn: catalogApi.getStock,
    refetchInterval: 15000,
  })

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return []
    return (customers ?? [])
      .filter((c) => c.active && (c.name.toLowerCase().includes(q) || c.phone.includes(q)))
      .slice(0, 6)
  }, [customers, customerQuery])

  const menuOffering = useMemo(() => menus?.find((m) => m.type === mealType), [menus, mealType])

  // Product id -> cuánto queda hoy para este tipo de comida. Sin entrada = sin límite.
  const remaining = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of menuOffering?.items ?? []) {
      for (const p of item.products) {
        if (p.quantity != null) map.set(p.id, p.quantity)
      }
    }
    return map
  }, [menuOffering])

  // Cuánto de cada producto ya quedó reservado en platos armados (sin enviar aún) del
  // mismo tipo de comida — se resta de `remaining` para no armar de más antes de enviar.
  const consumedInBatch = useMemo(() => {
    const map = new Map<number, number>()
    for (const entry of batch) {
      if (entry.mealType !== mealType) continue
      for (const item of entry.items) {
        map.set(item.id, (map.get(item.id) ?? 0) + (item.quantity ?? 0))
      }
    }
    return map
  }, [batch, mealType])

  // Igual, pero sin filtrar por tipo de comida — las bebidas se descuentan del mismo
  // stock sin importar en qué plato (desayuno/almuerzo/especial) se hayan pedido.
  const consumedInBatchAcrossMealTypes = useMemo(() => {
    const map = new Map<number, number>()
    for (const entry of batch) {
      for (const item of entry.items) {
        map.set(item.id, (map.get(item.id) ?? 0) + (item.quantity ?? 0))
      }
    }
    return map
  }, [batch])

  function remainingFor(productId: number): number | undefined {
    const menuLeft = remaining.get(productId)
    if (menuLeft !== undefined) {
      return menuLeft - (consumedInBatch.get(productId) ?? 0)
    }
    const loteLeft = drinkStock?.[productId]
    if (loteLeft !== undefined) {
      return loteLeft - (consumedInBatchAcrossMealTypes.get(productId) ?? 0)
    }
    return undefined
  }

  // Solo lo que está en el menú de hoy — más Bebidas, que no dependen del menú (se
  // piden y cobran sueltas).
  const menuProductIds = useMemo(() => {
    const set = new Set<number>()
    for (const item of menuOffering?.items ?? []) {
      for (const p of item.products) set.add(p.id)
    }
    return set
  }, [menuOffering])

  // Categorías cuyo rol es BEBIDA o ADICIONAL — no dependen del menú del día, siempre
  // se pueden pedir/agregar sueltas (una "adicional de pollo" no tiene por qué estar
  // entre las proteínas que el admin eligió para hoy).
  const alwaysAvailableCategoryNames = useMemo(() => {
    const set = new Set<string>()
    for (const c of categories ?? []) {
      if (c.code === 'BEBIDA' || c.code === 'ADICIONAL') set.add(c.name)
    }
    return set
  }, [categories])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof catalog>()
    for (const p of catalog ?? []) {
      const inMenu = menuProductIds.has(p.id)
      const isAlwaysAvailable = alwaysAvailableCategoryNames.has(p.category?.name ?? '')
      const wasAddedManually = extraProductIds.has(p.id)
      if (!inMenu && !isAlwaysAvailable && !wasAddedManually) continue
      const key = p.category?.name ?? 'Otros'
      // Especial es un plato completo de una sola pieza — no se arma con sopa/
      // principio/proteína/acompañante/adicionales por separado, solo el plato en sí
      // y bebidas.
      if (mealType === 'ESPECIAL' && key !== 'Especiales' && key !== 'Bebidas') continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [catalog, menuProductIds, alwaysAvailableCategoryNames, extraProductIds, mealType])

  // Bebidas siempre al final, Adicionales justo antes — el resto en el orden en que
  // vengan del catálogo.
  const orderedCategories = useMemo(() => {
    const codeByName = new Map((categories ?? []).map((c) => [c.name, c.code]))
    const rank = (name: string) => {
      const code = codeByName.get(name)
      return code === 'BEBIDA' ? 2 : code === 'ADICIONAL' ? 1 : 0
    }
    return [...grouped.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
  }, [grouped, categories])

  // Reinicia el plato en construcción cada vez que se cambia de tipo de comida (las
  // selecciones eran contra otro menú) — nada queda preseleccionado, el mesero elige
  // todo desde cero cada vez.
  useEffect(() => {
    if (!catalog) return
    setLines({})
    setComments('')
    setCustomer(null)
    setCustomerQuery('')
    setReplacementOpenFor(null)
    setExtraProductIds(new Set())
    setExtraSearch('')
    // Solo se reinicia al cambiar de tipo de comida o al cargar el catálogo — no en
    // cada refetch del menú (evita borrar lo que el mesero ya armó).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealType, catalog])

  // Buscador para agregar un producto que no está hoy en el menú (ni es bebida/
  // adicional siempre disponible) — ej. un huevo cuando la proteína de hoy es otra.
  const extraSearchMatches = useMemo(() => {
    const q = extraSearch.trim().toLowerCase()
    if (!q) return []
    return (catalog ?? [])
      .filter((p) => {
        const alreadyVisible =
          menuProductIds.has(p.id) ||
          alwaysAvailableCategoryNames.has(p.category?.name ?? '') ||
          extraProductIds.has(p.id)
        return !alreadyVisible && p.name.toLowerCase().includes(q)
      })
      .slice(0, 6)
  }, [catalog, extraSearch, menuProductIds, alwaysAvailableCategoryNames, extraProductIds])

  const currentItems = (): ProductWithIdAndQuantity[] =>
    Object.entries(lines).map(([productId, line]) => ({
      id: Number(productId),
      quantity: line.quantity,
      replacement: line.replacement || null,
    }))

  const lineCount = Object.keys(lines).length

  const setLine = (productId: number, patch: Partial<OrderLine>) => {
    setLines((prev) => {
      const current = prev[productId] ?? { quantity: 0, replacement: '' }
      const next = { ...current, ...patch }
      if (next.quantity <= 0) {
        const rest = { ...prev }
        delete rest[productId]
        return rest
      }
      return { ...prev, [productId]: next }
    })
  }

  const addToBatch = () => {
    if (lineCount === 0) return
    const summary = Object.keys(lines)
      .map((id) => catalog?.find((p) => p.id === Number(id))?.name)
      .filter(Boolean)
      .join(', ')
    setBatch((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        mealType,
        isToGo,
        menuId: menuOffering?.id ?? null,
        items: currentItems(),
        comments: comments || null,
        customer,
        summary,
      },
    ])
    setLines({})
    setComments('')
    setCustomer(null)
    setCustomerQuery('')
  }

  const removeFromBatch = (key: string) => setBatch((prev) => prev.filter((b) => b.key !== key))

  const submit = useMutation({
    mutationFn: async () => {
      const staged = batch.map((b) => ({
        items: b.items,
        mealType: b.mealType,
        menuId: b.menuId,
        isToGo: b.isToGo,
        count: 1,
        comments: b.comments,
        customerId: b.customer?.id ?? null,
      }))
      const current =
        lineCount > 0
          ? [
              {
                items: currentItems(),
                mealType,
                menuId: menuOffering?.id ?? null,
                isToGo,
                count: 1,
                comments: comments || null,
                customerId: customer?.id ?? null,
              },
            ]
          : []

      await ordersApi.createOrder({
        tableId: tableId ? Number(tableId) : null,
        // Cada plato trae su propio cliente — el de aquí ya no aplica a todo el envío.
        customerId: customer?.id ? Number(customer.id) : null,
        orders: [...staged, ...current],
      })

      if (tableId) {
        return ordersApi.getPendingOrderForTable(Number(tableId))
      }
      const pending = await ordersApi.getOrders({ status: 'PENDING' })
      return pending[0] ?? null
    },
    onSuccess: async (order) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['pending-order', tableId] })
      queryClient.invalidateQueries({ queryKey: ['menus', todayIso()] })
      toast.success('Pedido enviado')
      setBatch([])
      setLines({})
      setCustomer(null)
      setCustomerQuery('')
      if (order) {
        try {
          await printingApi.printComanda(order.id)
        } catch {
          toast.error('No se pudo imprimir la comanda', {
            description: 'Revisa la impresora en Admin. Puedes reimprimirla desde el pedido.',
          })
        }
      }
      navigate('/mesas')
    },
    onError: (e) => {
      toast.error('No se pudo enviar el pedido', { description: getApiErrorMessage(e, 'Revisa que haya menú configurado para hoy.') })
    },
  })

  const totalToSend = batch.length + (lineCount > 0 ? 1 : 0)

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-56 md:pb-32">
      <button
        onClick={() => navigate('/mesas')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4"
      >
        <ArrowLeft size={16} />
        Volver a mesas
      </button>

      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">
        {tableId ? `Mesa ${currentTableNumber ?? '…'}` : 'Pedido para llevar'}
      </h1>
      <p className="text-sm text-neutral-500 mb-5">Selecciona los productos del pedido</p>

      {/* Ya hay pedido en esta mesa */}
      {!!tableId && loadingPendingOrder && (
        <Card className="p-4 mb-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-32" />
        </Card>
      )}
      {pendingOrder && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Ya hay un pedido en esta mesa</p>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/pedido/${pendingOrder.id}`)}>
              <Receipt size={14} />
              Ver / Cobrar
            </Button>
          </div>
          {pendingOrder.customer && (
            <p className="text-xs text-neutral-500 flex items-center gap-1.5 mb-1.5">
              <User size={12} />
              {pendingOrder.customer.name}
            </p>
          )}
          <div className="space-y-1">
            {pendingOrder.orderItems.map((item) => (
              <p key={item.id} className="text-xs text-neutral-500">
                {MEAL_TYPE_LABELS[item.menuOffering.foodType] ?? item.menuOffering.foodType}
                {' · '}
                {item.orderType.name === 'OUT' ? 'para llevar' : 'en sitio'}:{' '}
                {item.itemsByCategory
                  .flatMap((g) => g.products.map((p) => (p.quantity > 1 ? `${p.quantity}x ${p.name}` : p.name)))
                  .join(', ')}
              </p>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">Total actual: {formatMoney(pendingOrder.total)}</p>
        </Card>
      )}

      {/* Pedidos ya armados, listos para enviar */}
      {batch.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Pedidos por enviar ({batch.length})
          </p>
          <div className="space-y-1.5">
            {batch.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-neutral-600 dark:text-neutral-300 truncate">
                  {MEAL_TYPE_LABELS[entry.mealType] ?? entry.mealType}
                  {entry.isToGo ? ' · para llevar' : ' · en sitio'}
                  {entry.customer ? ` · ${entry.customer.name}` : ''}
                  {' — '}
                  {entry.summary}
                </span>
                <button onClick={() => removeFromBatch(entry.key)} className="text-neutral-400 hover:text-red-500 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Paso 1: tipo de comida + para llevar, agrupados en una sola tarjeta */}
      <Card className="p-4 mb-4">
        <div className="flex gap-2 mb-3">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt.value}
              onClick={() => setMealType(mt.value)}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors border',
                mealType === mt.value
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300',
              )}
            >
              {mt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={isToGo}
            onChange={(e) => setIsToGo(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
          />
          Para llevar
        </label>
      </Card>

      {!loadingMenus && !menuOffering && (
        <Card className="p-3 mb-4 bg-status-busy-bg dark:bg-status-busy/15 border-status-busy/20 text-sm text-status-busy">
          No hay menú de {mealType.toLowerCase()} configurado para hoy. Puedes pedir bebidas igual.
        </Card>
      )}

      {/* Agregar un producto que no está en el menú de hoy (ej. huevo cuando la
          proteína de hoy es otra) — se agrega tal cual, con el mismo cálculo de
          precio que cualquier otro (si es la 2da proteína, cobra como adicional). */}
      {mealType !== 'ESPECIAL' && !loadingCatalog && (
        <div className="relative mb-4">
          <Input
            placeholder="Agregar otro producto (fuera del menú de hoy)..."
            value={extraSearch}
            onChange={(e) => setExtraSearch(e.target.value)}
          />
          {extraSearch && (
            <Card className="absolute z-10 mt-1 w-full p-1 max-h-56 overflow-y-auto">
              {extraSearchMatches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setExtraProductIds((prev) => new Set(prev).add(p.id))
                    setExtraSearch('')
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{p.name}</p>
                  <p className="text-xs text-neutral-400">{p.category?.name}</p>
                </button>
              ))}
              {extraSearchMatches.length === 0 && (
                <p className="text-xs text-neutral-400 px-2.5 py-2">Sin resultados.</p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Catálogo del menú de hoy + Bebidas, siempre disponibles */}
      {(loadingCatalog || loadingMenus) && (
        <div className="space-y-3">
          {['Sopas', 'Proteínas', 'Acompañantes'].map((label) => (
            <div key={label} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{label}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {!loadingCatalog && !loadingMenus && orderedCategories.map(([category, products]) => (
          <div key={category} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{category}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products?.map((product) => {
                const line = lines[product.id]
                const isSelected = !!line
                const hasReplacement = !!line?.replacement
                const left = remainingFor(product.id)
                const soldOut = left !== undefined && left <= 0
                const atLimit = left !== undefined && (line?.quantity ?? 0) >= left
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      'p-2.5 flex flex-col gap-2',
                      isSelected && 'bg-brand-50 border-brand-300 dark:bg-brand-500/10 dark:border-brand-500/50',
                      soldOut && !line && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          isSelected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-neutral-50',
                        )}
                      >
                        {product.name}
                      </p>
                      {left !== undefined && (
                        <p
                          className={cn(
                            'text-xs mt-0.5',
                            isSelected ? 'text-brand-600 dark:text-brand-400' : soldOut ? 'text-status-busy' : 'text-neutral-400',
                          )}
                        >
                          {soldOut ? 'Agotado' : `Quedan ${left}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-auto">
                      <button
                        onClick={() => setLine(product.id, { quantity: (line?.quantity ?? 0) - 1 })}
                        className={cn(
                          'w-7 h-7 rounded-full border flex items-center justify-center disabled:opacity-30',
                          isSelected
                            ? 'border-brand-300 dark:border-brand-500/50 text-brand-600 dark:text-brand-400'
                            : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400',
                        )}
                        disabled={!line}
                      >
                        <Minus size={13} />
                      </button>
                      <span className={cn('text-sm font-semibold', isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-neutral-900 dark:text-neutral-50')}>
                        {line?.quantity ?? 0}
                      </span>
                      <button
                        onClick={() => setLine(product.id, { quantity: (line?.quantity ?? 0) + 1 })}
                        disabled={soldOut || atLimit}
                        className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    {line && (
                      <button
                        onClick={() => setReplacementOpenFor(replacementOpenFor === product.id ? null : product.id)}
                        className={cn(
                          'h-7 px-2 rounded-lg border flex items-center justify-center gap-1 text-xs',
                          hasReplacement
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400',
                        )}
                      >
                        <Repeat size={12} />
                        <span className="truncate">
                          {hasReplacement ? REPLACEMENT_OPTIONS.find((o) => o.value === line.replacement)?.label : 'Reemplazo'}
                        </span>
                      </button>
                    )}
                    {line && replacementOpenFor === product.id && (
                      <div className="flex flex-wrap gap-1">
                        {REPLACEMENT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setLine(product.id, { replacement: opt.value })
                              setReplacementOpenFor(null)
                            }}
                            className={cn(
                              'px-2 py-1 rounded-full text-[11px] font-medium',
                              line.replacement === opt.value
                                ? 'bg-brand-500 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
        {!loadingCatalog && !loadingMenus && grouped.size === 0 && (
          <p className="text-sm text-neutral-400 text-center py-8">
            No hay productos disponibles para {mealType.toLowerCase()} hoy.
          </p>
        )}
      </div>

      {/* Cliente + notas de este plato, agrupados en una sola tarjeta */}
      <Card className="p-4 mt-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Cliente de este plato (opcional)
          </h2>
          {customer ? (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{customer.name}</p>
                <p className="text-xs text-neutral-500">{customer.phone}</p>
              </div>
              <button onClick={() => setCustomer(null)} className="text-xs text-neutral-400">
                Quitar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Buscar por nombre o teléfono"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {customerQuery && (
                <Card className="absolute z-10 mt-1 w-full p-1 max-h-56 overflow-y-auto">
                  {customerMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c)
                        setCustomerQuery('')
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    >
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{c.name}</p>
                      <p className="text-xs text-neutral-500">{c.phone}</p>
                    </button>
                  ))}
                  {customerMatches.length === 0 && (
                    <p className="text-xs text-neutral-400 px-2.5 py-2">
                      No se encontraron clientes. Regístralo desde la página Clientes.
                    </p>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Notas de este plato</h2>
          <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Ej: sin cebolla" />
        </div>
      </Card>

      {/* Submit bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-60 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-2 z-20">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">{lineCount} producto(s) en este plato</span>
          <Button
            variant="secondary"
            onClick={addToBatch}
            disabled={lineCount === 0}
          >
            <ListPlus size={16} />
            Agregar otro pedido
          </Button>
        </div>
        <Button
          size="lg"
          onClick={() => submit.mutate()}
          disabled={totalToSend === 0 || submit.isPending}
          loading={submit.isPending}
        >
          {!submit.isPending && (
            <>
              <Send size={16} />
              Enviar pedidos {totalToSend > 0 ? `(${totalToSend})` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
