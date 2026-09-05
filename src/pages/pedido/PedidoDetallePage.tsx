import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, Receipt, CreditCard, ArrowLeft, HandCoins, User, ShoppingBag } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { printingApi } from '@/api/printing'
import { paymentTypesApi } from '@/api/paymentTypes'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn, formatMoney } from '@/lib/utils'
import { comboLabelText } from '@/lib/comboLabels'
import type { OrderItemResponse, OrderItemProductResponse } from '@/types'

function nameOnly(p: OrderItemProductResponse) {
  return p.quantity > 1 ? `${p.quantity}x ${p.name}` : p.name
}

// Fila de una sección: nombre a la izquierda, precio a la derecha.
function PriceRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
      <span>{label}</span>
      <span>{formatMoney(amount)}</span>
    </div>
  )
}

function SectionHeader({ label, amount }: { label: string; amount?: number }) {
  return (
    <div className="flex items-center justify-between mb-0.5">
      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{label}</span>
      {amount != null && <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{formatMoney(amount)}</span>}
    </div>
  )
}

function OrderItemCard({ item, showCustomer }: { item: OrderItemResponse; showCustomer: boolean }) {
  const comboFormed = item.baseTotal > 0
  const bebidas = item.itemsByCategory.find((g) => g.category === 'Bebidas')?.products ?? []
  const adicionales = item.itemsByCategory.find((g) => g.category === 'Adicionales')?.products ?? []
  const comida = item.itemsByCategory.filter((g) => g.category !== 'Bebidas' && g.category !== 'Adicionales')

  const hasAdicionalesSection =
    adicionales.length > 0 || item.proteinAdditionalsTotal > 0 || item.sideAdditionalsTotal > 0 || item.extrasTotal > 0

  const isToGo = item.orderType.name === 'OUT'

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{item.menuOffering.foodType}</span>
        <div className="flex items-center gap-1.5">
          {/* Solo se muestra cuando hay platos de distintos clientes en el mismo pedido —
              si todos son del mismo (o de nadie), ya se ve arriba y repetirlo aquí sobra. */}
          {showCustomer && item.customer && (
            <Badge variant="neutral" className="flex items-center gap-1">
              <User size={12} />
              {item.customer.name}
            </Badge>
          )}
          {isToGo && (
            <Badge variant="neutral" className="flex items-center gap-1">
              <ShoppingBag size={12} />
              Para llevar
            </Badge>
          )}
        </div>
      </div>

      {comida.length > 0 && (
        <div className="mb-2.5">
          <SectionHeader
            label={comboFormed ? (comboLabelText(item.comboLabel) ?? 'Comida') : 'Comida'}
            amount={comboFormed ? item.baseTotal : undefined}
          />
          {comboFormed ? (
            comida.map((group) => (
              <p key={group.category} className="text-sm text-neutral-600 dark:text-neutral-300">
                <span className="text-xs uppercase tracking-wide text-neutral-400">{group.category}: </span>
                {group.products.map(nameOnly).join(', ')}
              </p>
            ))
          ) : (
            comida.flatMap((group) => group.products).map((p) => (
              <PriceRow key={p.id} label={nameOnly(p)} amount={p.lineTotal ?? 0} />
            ))
          )}
        </div>
      )}

      {hasAdicionalesSection && (
        <div className="mb-2.5">
          <SectionHeader label="Adicionales" />
          {item.proteinAdditionalsTotal > 0 && <PriceRow label="Proteína adicional" amount={item.proteinAdditionalsTotal} />}
          {item.sideAdditionalsTotal > 0 && <PriceRow label="Acompañante/principio adicional" amount={item.sideAdditionalsTotal} />}
          {adicionales.map((p) => (
            <PriceRow key={p.id} label={nameOnly(p)} amount={p.lineTotal ?? 0} />
          ))}
          {item.extrasTotal > 0 && <PriceRow label="Extras" amount={item.extrasTotal} />}
        </div>
      )}

      {bebidas.length > 0 && (
        <div className="mb-2.5">
          <SectionHeader label="Bebidas" />
          {bebidas.map((p) => (
            <PriceRow key={p.id} label={nameOnly(p)} amount={p.lineTotal ?? 0} />
          ))}
        </div>
      )}

      {item.toGoSurcharge > 0 && (
        <div className="mb-2.5">
          <PriceRow label="Envase (para llevar)" amount={item.toGoSurcharge} />
        </div>
      )}

      {item.comments && <p className="text-xs text-neutral-400 italic mt-1">"{item.comments}"</p>}

      <div className="flex items-center justify-between text-sm font-semibold text-neutral-900 dark:text-neutral-50 pt-2 mt-1 border-t border-neutral-100 dark:border-neutral-700">
        <span>Total</span>
        <span>{formatMoney(item.total)}</span>
      </div>
    </Card>
  )
}

export default function PedidoDetallePage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCobrar, setShowCobrar] = useState(false)
  const [showPagarCuenta, setShowPagarCuenta] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrderDetail(Number(orderId)),
  })

  const { data: paymentTypes } = useQuery({
    queryKey: ['payment-types'],
    queryFn: paymentTypesApi.getPaymentTypes,
    enabled: showCobrar || showPagarCuenta,
  })

  // Clientes distintos que aparecen en este pedido, cada uno con la suma de sus
  // propios platos — una mesa puede tener platos de varias personas mezclados.
  const distinctCustomers = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; subtotal: number }>()
    for (const item of order?.orderItems ?? []) {
      if (!item.customer) continue
      const existing = byId.get(item.customer.id)
      byId.set(item.customer.id, {
        id: item.customer.id,
        name: item.customer.name,
        subtotal: (existing?.subtotal ?? 0) + item.total,
      })
    }
    return [...byId.values()]
  }, [order])

  const printComanda = useMutation({
    mutationFn: () => printingApi.printComanda(Number(orderId)),
    onSuccess: () => toast.success('Comanda enviada a la impresora'),
    onError: () => toast.error('No se pudo imprimir la comanda', { description: 'Revisa la impresora en Admin.' }),
  })

  const printCuenta = useMutation({
    mutationFn: () => printingApi.printCuenta(Number(orderId)),
    onSuccess: () => toast.success('Cuenta enviada a la impresora'),
    onError: () => toast.error('No se pudo imprimir la cuenta', { description: 'Revisa la impresora en Admin.' }),
  })

  const cobrar = useMutation({
    mutationFn: (paymentTypeId: number) =>
      ordersApi.updateStatus(Number(orderId), { status: 'COMPLETED', paymentTypeId }),
    onSuccess: () => {
      toast.success('Pedido cobrado')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCobrar(false)
      navigate('/mesas')
    },
    onError: (e) => toast.error('No se pudo cobrar el pedido', { description: getApiErrorMessage(e) }),
  })

  const fiarCliente = useMutation({
    mutationFn: (customerId: number) => ordersApi.fiarCliente(Number(orderId), customerId),
    onSuccess: (updatedOrder, customerId) => {
      const name = distinctCustomers.find((c) => c.id === customerId)?.name ?? 'el cliente'
      toast.success(`Platos de ${name} fiados`, { description: 'Quedaron en su cuenta abierta; el resto sigue aquí.' })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['customer-balances'] })
      if (updatedOrder.orderStatus.name === 'CANCELLED') {
        // Nada quedó por cobrar — todo el pedido se fue a la cuenta de ese cliente.
        setShowCobrar(false)
        navigate('/mesas')
      } else {
        queryClient.setQueryData(['order', orderId], updatedOrder)
      }
    },
    onError: (e) => toast.error('No se pudo fiar', { description: getApiErrorMessage(e) }),
  })

  const pagarCuenta = useMutation({
    mutationFn: (paymentTypeId: number) => ordersApi.payOrder(Number(orderId), { paymentTypeId }),
    onSuccess: () => {
      toast.success('Pedido pagado')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      if (order?.customer) {
        queryClient.invalidateQueries({ queryKey: ['orders-customer', order.customer.id] })
        queryClient.invalidateQueries({ queryKey: ['customer-balances'] })
      }
      setShowPagarCuenta(false)
    },
    onError: (e) => toast.error('No se pudo pagar el pedido', { description: getApiErrorMessage(e) }),
  })

  // "Volver" no depende de nada del pedido — se ve de una, el resto (que sí depende
  // de la base de datos) muestra su forma en esqueleto mientras carga.
  if (isLoading || !order) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-44 md:pb-28">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          <ArrowLeft size={16} />
          Volver
        </button>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-20 mb-5" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl mt-4" />
      </div>
    )
  }

  const isCompleted = order.orderStatus.name === 'COMPLETED'
  const isCancelled = order.orderStatus.name === 'CANCELLED'
  const isUnpaidTab = isCompleted && !order.paid

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-44 md:pb-28">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
          {order.diningTable ? `Mesa ${order.diningTable.number}` : 'Para llevar'}
        </h1>
        {isUnpaidTab ? (
          <Badge variant="busy">Cuenta abierta</Badge>
        ) : isCancelled ? (
          <Badge variant="neutral">Cancelado</Badge>
        ) : (
          <Badge variant={isCompleted ? 'done' : 'pending'}>{order.orderStatus.name}</Badge>
        )}
      </div>
      <p className={cn('text-sm text-neutral-500', distinctCustomers.length > 0 ? 'mb-1' : 'mb-5')}>Pedido #{order.id}</p>
      {distinctCustomers.length === 1 && (
        <p className="text-sm text-neutral-500 flex items-center gap-1.5 mb-5">
          <User size={13} />
          {distinctCustomers[0].name}
          {order.paid && order.paymentType && ` · pagado con ${order.paymentType.name}`}
        </p>
      )}
      {distinctCustomers.length > 1 && (
        <p className="text-sm text-neutral-500 mb-5">
          Platos de {distinctCustomers.length} clientes distintos — ver cada plato abajo
        </p>
      )}

      <div className="space-y-3">
        {order.orderItems.map((item) => (
          <OrderItemCard key={item.id} item={item} showCustomer={distinctCustomers.length > 1} />
        ))}
      </div>

      <Card className="p-4 mt-4">
        <div className="flex justify-between text-sm text-neutral-500 mb-1">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-neutral-900 dark:text-neutral-50">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </Card>

      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-60 min-h-20 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 flex gap-2 z-20">
        <Button variant="secondary" onClick={() => printComanda.mutate()} loading={printComanda.isPending}>
          <Printer size={16} />
        </Button>
        <Button variant="secondary" onClick={() => printCuenta.mutate()} loading={printCuenta.isPending}>
          <Receipt size={16} />
        </Button>
        {!isCompleted && !isCancelled && (
          <Button className="flex-1" size="lg" onClick={() => setShowCobrar(true)}>
            <CreditCard size={16} />
            Cobrar
          </Button>
        )}
        {isUnpaidTab && (
          <Button className="flex-1" size="lg" onClick={() => setShowPagarCuenta(true)}>
            <HandCoins size={16} />
            Cobrar cuenta
          </Button>
        )}
      </div>

      <Dialog open={showCobrar} onClose={() => setShowCobrar(false)} title="Cobrar pedido">
        <p className="text-sm text-neutral-500 mb-4">Total a cobrar: {formatMoney(order.total)}</p>
        <div className="space-y-2">
          {paymentTypes?.map((pt) => (
            <Button
              key={pt.id}
              variant="secondary"
              className="w-full justify-between"
              onClick={() => cobrar.mutate(pt.id)}
              loading={cobrar.isPending}
            >
              {pt.name}
            </Button>
          ))}
        </div>
        {distinctCustomers.length > 0 && (
          <>
            <div className="flex items-center gap-2 my-3">
              <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-700" />
              <span className="text-xs text-neutral-400">o fiar por cliente</span>
              <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-700" />
            </div>
            <div className="space-y-2">
              {distinctCustomers.map((c) => (
                <Button
                  key={c.id}
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => fiarCliente.mutate(c.id)}
                  loading={fiarCliente.isPending}
                >
                  <span className="flex items-center gap-2">
                    <HandCoins size={16} />
                    Fiar a {c.name}
                  </span>
                  <span className="text-xs text-neutral-400">{formatMoney(c.subtotal)}</span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-1.5">
              Deja solo los platos de ese cliente en su cuenta abierta — el resto de la mesa se cobra aparte.
            </p>
          </>
        )}
      </Dialog>

      <Dialog open={showPagarCuenta} onClose={() => setShowPagarCuenta(false)} title="Cobrar cuenta">
        <p className="text-sm text-neutral-500 mb-4">Total a cobrar: {formatMoney(order.total)}</p>
        <div className="space-y-2">
          {paymentTypes?.map((pt) => (
            <Button
              key={pt.id}
              variant="secondary"
              className="w-full justify-between"
              onClick={() => pagarCuenta.mutate(pt.id)}
              loading={pagarCuenta.isPending}
            >
              {pt.name}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  )
}
