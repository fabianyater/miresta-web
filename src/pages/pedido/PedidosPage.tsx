import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, User, ShoppingBag } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDateTime, formatMoney, paymentSummary, todayIso } from '@/lib/utils'
import type { OrdersResponse } from '@/types'

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'Recién'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  return `Hace ${hours}h ${mins % 60}min`
}

function OrderStatusBadge({ order }: { order: OrdersResponse }) {
  if (order.orderStatus.name === 'CANCELLED') {
    return <Badge variant="neutral">Cancelado</Badge>
  }
  if (order.orderStatus.name !== 'COMPLETED') {
    return <Badge variant="pending">Pendiente</Badge>
  }
  if (order.paid) {
    const summary = paymentSummary(order)
    return <Badge variant="free">Pagado{summary ? ` · ${summary}` : ''}</Badge>
  }
  return <Badge variant="busy">Debe</Badge>
}

function ParaLlevarBadge() {
  return (
    <Badge variant="neutral" className="flex items-center gap-1">
      <ShoppingBag size={12} />
      Para llevar
    </Badge>
  )
}

function OrderRowSkeleton() {
  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right flex-shrink-0 space-y-1.5">
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-5 w-20 rounded-full ml-auto" />
      </div>
    </Card>
  )
}

const TABS = [
  { value: 'EN_SITIO', label: 'En sitio' },
  { value: 'PARA_LLEVAR', label: 'Para llevar' },
  { value: 'HISTORIAL', label: 'Historial' },
] as const

type Tab = (typeof TABS)[number]['value']

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.value === value)
}

export default function PedidosPage() {
  const navigate = useNavigate()
  // La pestaña vive en la URL (no solo en memoria) para que "Volver" desde el
  // detalle de un pedido regrese exactamente a la misma pestaña, en vez de
  // resetear siempre a "En sitio".
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = isTab(tabParam) ? tabParam : 'EN_SITIO'
  const setTab = (next: Tab) => setSearchParams({ tab: next }, { replace: true })
  const [historyDate, setHistoryDate] = useState(todayIso())

  const { data: orders, isLoading: loadingActive } = useQuery({
    queryKey: ['orders', 'PENDING'],
    queryFn: () => ordersApi.getOrders({ status: 'PENDING' }),
    refetchInterval: 10000,
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['order-history', historyDate],
    queryFn: () => ordersApi.getOrderHistory(historyDate),
    enabled: tab === 'HISTORIAL',
  })

  // Orden de llegada: el más antiguo primero, para atender en el orden correcto.
  const sorted = useMemo(
    () => [...(orders ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders],
  )
  const enSitio = sorted.filter((o) => o.diningTable != null)
  const paraLlevar = sorted.filter((o) => o.diningTable == null)
  const list = tab === 'EN_SITIO' ? enSitio : tab === 'PARA_LLEVAR' ? paraLlevar : []

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">Pedidos</h1>
      <p className="text-sm text-neutral-500 mb-5">Pedidos activos, en el orden en que llegaron</p>

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors border',
              tab === t.value
                ? 'bg-brand-500 border-brand-500 text-white'
                : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300',
            )}
          >
            {t.label}
            {t.value === 'EN_SITIO' && ` (${enSitio.length})`}
            {t.value === 'PARA_LLEVAR' && ` (${paraLlevar.length})`}
          </button>
        ))}
      </div>

      {tab === 'HISTORIAL' ? (
        <>
          <Input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            className="mb-4"
          />
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <OrderRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {history?.map((order) => (
                <button key={order.id} onClick={() => navigate(`/pedido/${order.id}`)} className="w-full text-left">
                  <Card className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        Pedido #{order.id} · {order.diningTable ? `Mesa ${order.diningTable.number}` : 'Para llevar'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
                      {order.customer && (
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                          <User size={12} />
                          {order.customer.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{formatMoney(order.total)}</p>
                      <div className="mt-1 flex items-center gap-1.5 justify-end">
                        {!order.diningTable && <ParaLlevarBadge />}
                        <OrderStatusBadge order={order} />
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
              {history?.length === 0 && (
                <p className="text-center text-neutral-400 text-sm py-16">No hay pedidos este día.</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {loadingActive &&
            Array.from({ length: 3 }).map((_, i) => <OrderRowSkeleton key={i} />)}
          {!loadingActive && list.map((order) => (
            <button key={order.id} onClick={() => navigate(`/pedido/${order.id}`)} className="w-full text-left">
              <Card className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {order.diningTable ? `Mesa ${order.diningTable.number}` : 'Para llevar'}
                  </p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} />
                    {timeAgo(order.createdAt)}
                  </p>
                  {order.customer && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                      <User size={12} />
                      {order.customer.name}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{formatMoney(order.total)}</p>
                  <div className="mt-1 flex items-center gap-1.5 justify-end">
                    {tab === 'PARA_LLEVAR' && <ParaLlevarBadge />}
                    <Badge variant="pending">Pendiente</Badge>
                  </div>
                </div>
              </Card>
            </button>
          ))}
          {!loadingActive && list.length === 0 && (
            <p className="text-center text-neutral-400 text-sm py-16">
              No hay pedidos {tab === 'EN_SITIO' ? 'en sitio' : 'para llevar'} pendientes.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
