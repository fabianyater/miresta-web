import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Send, ArrowLeft, ListPlus, X, Receipt, Repeat, User } from 'lucide-react'
import { catalogApi } from '@/api/catalog'
import { menusApi } from '@/api/menus'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
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

// Se preseleccionan siempre que estén en el menú del tipo de comida activo.
const DEFAULT_PICKS = ['arroz blanco', 'ensalada', 'maduro asado', 'frijoles']

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

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
  menuId: number
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

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['products'],
    queryFn: catalogApi.getProducts,
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

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers(),
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

  function remainingFor(productId: number): number | undefined {
    const serverLeft = remaining.get(productId)
    if (serverLeft === undefined) return undefined
    return serverLeft - (consumedInBatch.get(productId) ?? 0)
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof catalog>()
    for (const p of catalog ?? []) {
      const inMenu = menuProductIds.has(p.id)
      const isDrink = p.category?.name === 'Bebidas'
      if (!inMenu && !isDrink) continue
      const key = p.category?.name ?? 'Otros'
      // Especial es un plato completo de una sola pieza — no se arma con sopa/
      // principio/proteína/acompañante por separado, solo el plato en sí y bebidas.
      if (mealType === 'ESPECIAL' && key !== 'Especiales' && key !== 'Bebidas') continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [catalog, menuProductIds, mealType])

  // Bebidas siempre al final, sin importar el orden en que vengan del catálogo.
  const orderedCategories = useMemo(
    () => [...grouped.entries()].sort((a, b) => (a[0] === 'Bebidas' ? 1 : b[0] === 'Bebidas' ? -1 : 0)),
    [grouped],
  )

  // Reinicia el plato en construcción cada vez que se cambia de tipo de comida (las
  // selecciones eran contra otro menú) y deja siempre preseleccionados los acompañantes
  // de siempre, si están disponibles hoy.
  useEffect(() => {
    if (!catalog) return
    const defaults: Record<number, OrderLine> = {}
    for (const products of grouped.values()) {
      for (const p of products ?? []) {
        if (DEFAULT_PICKS.includes(normalize(p.name))) {
          defaults[p.id] = { quantity: 1, replacement: '' }
        }
      }
    }
    setLines(defaults)
    setComments('')
    setCustomer(null)
    setCustomerQuery('')
    setReplacementOpenFor(null)
    // Solo se reinicia al cambiar de tipo de comida o al cargar el catálogo — no en
    // cada refetch del menú (evita borrar lo que el mesero ya armó).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealType, catalog])

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
    if (!menuOffering || lineCount === 0) return
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
        menuId: menuOffering.id,
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
        lineCount > 0 && menuOffering
          ? [
              {
                items: currentItems(),
                mealType,
                menuId: menuOffering.id,
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
        customerId: null,
        orders: [...staged, ...current],
      })

      if (tableId) {
        return ordersApi.getPendingOrderForTable(Number(tableId))
      }
      const pending = await ordersApi.getOrders({ status: 'PENDING' })
      return pending[0] ?? null
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['pending-order', tableId] })
      queryClient.invalidateQueries({ queryKey: ['menus', todayIso()] })
      toast.success('Pedido enviado')
      setBatch([])
      setLines({})
      setCustomer(null)
      setCustomerQuery('')
      if (order) navigate(`/pedido/${order.id}`)
      else navigate('/mesas')
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
        {tableId ? `Mesa ${tableId}` : 'Pedido para llevar'}
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

      {/* Meal type tabs */}
      <div className="flex gap-2 mb-4">
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

      {!loadingMenus && !menuOffering && (
        <Card className="p-3 mb-4 bg-status-busy-bg dark:bg-status-busy/15 border-status-busy/20 text-sm text-status-busy">
          No hay menú de {mealType.toLowerCase()} configurado para hoy.
        </Card>
      )}

      <label className="flex items-center gap-2 mb-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={isToGo}
          onChange={(e) => setIsToGo(e.target.checked)}
          className="w-4 h-4 accent-brand-500"
        />
        Para llevar
      </label>

      {/* Catálogo del menú de hoy + Bebidas, siempre disponibles */}
      {(loadingCatalog || loadingMenus) && (
        <div className="space-y-5">
          {['Sopas', 'Proteínas', 'Acompañantes'].map((label) => (
            <div key={label}>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{label}</h2>
              <div className="space-y-1.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-[46px] w-full rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-5">
        {!loadingCatalog && !loadingMenus && orderedCategories.map(([category, products]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{category}</h2>
            <div className="space-y-1.5">
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
                      'p-2.5 rounded-full',
                      isSelected && 'bg-brand-600 border-brand-600 dark:bg-brand-600 dark:border-brand-600',
                      soldOut && !line && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 pl-1.5">
                        <span
                          className={cn(
                            'text-sm font-medium truncate block',
                            isSelected ? 'text-white' : 'text-neutral-900 dark:text-neutral-50',
                          )}
                        >
                          {product.name}
                        </span>
                        {left !== undefined && (
                          <span
                            className={cn(
                              'text-xs',
                              isSelected ? 'text-white/90' : soldOut ? 'text-status-busy' : 'text-neutral-400',
                            )}
                          >
                            {soldOut ? 'Agotado' : `Quedan ${left}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {line && (
                          <button
                            onClick={() => setReplacementOpenFor(replacementOpenFor === product.id ? null : product.id)}
                            className={cn(
                              'h-7 px-2 rounded-full border flex items-center gap-1 text-xs',
                              hasReplacement
                                ? isSelected
                                  ? 'border-white text-white'
                                  : 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : isSelected
                                  ? 'border-white/70 text-white'
                                  : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400',
                            )}
                          >
                            <Repeat size={12} />
                            {hasReplacement ? REPLACEMENT_OPTIONS.find((o) => o.value === line.replacement)?.label : 'Reemplazo'}
                          </button>
                        )}
                        <button
                          onClick={() => setLine(product.id, { quantity: (line?.quantity ?? 0) - 1 })}
                          className={cn(
                            'w-7 h-7 rounded-full border flex items-center justify-center disabled:opacity-30',
                            isSelected
                              ? 'border-white/70 text-white'
                              : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400',
                          )}
                          disabled={!line}
                        >
                          <Minus size={13} />
                        </button>
                        <span className={cn('w-4 text-center text-sm font-semibold', isSelected && 'text-white')}>
                          {line?.quantity ?? 0}
                        </span>
                        <button
                          onClick={() => setLine(product.id, { quantity: (line?.quantity ?? 0) + 1 })}
                          disabled={soldOut || atLimit}
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30',
                            isSelected ? 'bg-white text-brand-600' : 'bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400',
                          )}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    {line && replacementOpenFor === product.id && (
                      <div className="flex flex-wrap gap-1 mt-2 pl-1.5">
                        {REPLACEMENT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setLine(product.id, { replacement: opt.value })
                              setReplacementOpenFor(null)
                            }}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium',
                              line.replacement === opt.value
                                ? isSelected
                                  ? 'bg-white text-brand-600'
                                  : 'bg-brand-500 text-white'
                                : isSelected
                                  ? 'bg-white/20 text-white'
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

      {/* Customer */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Cliente de este plato (opcional)
        </h2>
        {customer ? (
          <Card className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{customer.name}</p>
              <p className="text-xs text-neutral-500">{customer.phone}</p>
            </div>
            <button onClick={() => setCustomer(null)} className="text-xs text-neutral-400">
              Quitar
            </button>
          </Card>
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

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Notas de este plato</h2>
        <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Ej: sin cebolla" />
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-60 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-2 z-20">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">{lineCount} producto(s) en este plato</span>
          <Button
            variant="secondary"
            onClick={addToBatch}
            disabled={lineCount === 0 || !menuOffering}
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
