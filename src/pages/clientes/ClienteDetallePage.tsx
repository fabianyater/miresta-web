import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Phone, Wallet, ReceiptText, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { customersApi } from '@/api/customers'
import { ordersApi } from '@/api/orders'
import { paymentTypesApi } from '@/api/paymentTypes'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { isAdminRole } from '@/lib/roles'
import { useAuthStore } from '@/store/auth'

export default function ClienteDetallePage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canManage = useAuthStore((s) => isAdminRole(s.user?.role))
  const [showPagar, setShowPagar] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const id = Number(customerId)

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id),
  })

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['orders-customer', id],
    queryFn: () => ordersApi.getOrders({ customerId: id }),
  })

  const { data: paymentTypes } = useQuery({
    queryKey: ['payment-types'],
    queryFn: paymentTypesApi.getPaymentTypes,
    enabled: showPagar,
  })

  const pendingOrders = (orders ?? []).filter((o) => o.orderStatus.name === 'COMPLETED' && !o.paid)
  const balance = pendingOrders.reduce((sum, o) => sum + o.total, 0)

  const invalidateCustomerLists = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['customer-balances'] })
  }

  const settleTab = useMutation({
    mutationFn: (paymentTypeId: number) => ordersApi.settleCustomerTab(id, { paymentTypeId }),
    onSuccess: (data) => {
      toast.success(`Cuenta pagada: ${data.ordersSettled} pedido(s), ${formatMoney(data.totalPaid)}`)
      queryClient.invalidateQueries({ queryKey: ['orders-customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customer-balances'] })
      setShowPagar(false)
    },
    onError: (e) => toast.error('No se pudo pagar la cuenta', { description: getApiErrorMessage(e) }),
  })

  const editCustomer = useMutation({
    mutationFn: () => customersApi.updateCustomer(id, { name: editName, phone: editPhone }),
    onSuccess: () => {
      toast.success('Cliente actualizado')
      invalidateCustomerLists()
      setShowEdit(false)
    },
    onError: (e) => toast.error('No se pudo actualizar el cliente', { description: getApiErrorMessage(e) }),
  })

  const toggleArchive = useMutation({
    mutationFn: () => customersApi.updateCustomer(id, { active: !customer?.active }),
    onSuccess: () => {
      toast.success(customer?.active ? 'Cliente archivado' : 'Cliente reactivado')
      invalidateCustomerLists()
    },
    onError: (e) => toast.error('No se pudo actualizar el cliente', { description: getApiErrorMessage(e) }),
  })

  const deleteCustomer = useMutation({
    mutationFn: () => customersApi.deleteCustomer(id),
    onSuccess: () => {
      toast.success('Cliente eliminado')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-balances'] })
      navigate('/clientes')
    },
    onError: (e) => {
      toast.error('No se pudo eliminar el cliente', { description: getApiErrorMessage(e) })
      setShowDelete(false)
    },
  })

  // "Volver a clientes" no depende de nada del cliente — se ve de una, el resto (que
  // sí depende de la base de datos) muestra su forma en esqueleto mientras carga.
  if (loadingCustomer || loadingOrders || !customer) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-10">
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4"
        >
          <ArrowLeft size={16} />
          Volver a clientes
        </button>
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-28 mb-5" />
        <Skeleton className="h-16 w-full rounded-xl mb-5" />
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-10">
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </button>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
          {customer.name}
        </h1>
        {canManage && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                setEditName(customer.name)
                setEditPhone(customer.phone)
                setShowEdit(true)
              }}
              title="Editar cliente"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => toggleArchive.mutate()}
              title={customer.active ? 'Archivar cliente' : 'Reactivar cliente'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {customer.active ? <Archive size={16} /> : <ArchiveRestore size={16} />}
            </button>
            <button
              onClick={() => setShowDelete(true)}
              title="Eliminar cliente"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-5">
        <p className="text-sm text-neutral-500 flex items-center gap-1.5">
          <Phone size={13} />
          {customer.phone}
        </p>
        {!customer.active && <Badge variant="neutral">Archivado</Badge>}
      </div>

      <Card className="p-4 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Cuenta pendiente</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{formatMoney(balance)}</p>
          </div>
        </div>
        {balance > 0 && (
          <Button onClick={() => setShowPagar(true)}>
            Pagar cuenta
          </Button>
        )}
      </Card>

      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Historial de pedidos</h2>
      <div className="space-y-2">
        {orders?.map((order) => (
          <button key={order.id} onClick={() => navigate(`/pedido/${order.id}`)} className="w-full text-left">
            <Card className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ReceiptText size={18} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    Pedido #{order.id} · {order.diningTable ? `Mesa ${order.diningTable.number}` : 'Para llevar'}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{formatMoney(order.total)}</p>
                {order.orderStatus.name !== 'COMPLETED' ? (
                  <Badge variant="pending">{order.orderStatus.name}</Badge>
                ) : order.paid ? (
                  <Badge variant="free">Pagado{order.paymentType ? ` · ${order.paymentType.name}` : ''}</Badge>
                ) : (
                  <Badge variant="busy">Debe</Badge>
                )}
              </div>
            </Card>
          </button>
        ))}
        {orders?.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-16">Este cliente aún no tiene pedidos.</p>
        )}
      </div>

      <Dialog open={showPagar} onClose={() => setShowPagar(false)} title="Pagar cuenta">
        <p className="text-sm text-neutral-500 mb-1">
          {pendingOrders.length} pedido(s) pendiente(s)
        </p>
        <p className="text-sm text-neutral-500 mb-4">Total a pagar: {formatMoney(balance)}</p>
        <div className="space-y-2">
          {paymentTypes?.map((pt) => (
            <Button
              key={pt.id}
              variant="secondary"
              className="w-full justify-between"
              onClick={() => settleTab.mutate(pt.id)}
              loading={settleTab.isPending}
            >
              {pt.name}
            </Button>
          ))}
        </div>
      </Dialog>

      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Editar cliente">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (editName && editPhone) editCustomer.mutate()
          }}
        >
          <Input placeholder="Nombre" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <Input placeholder="Teléfono" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          <Button type="submit" className="w-full" disabled={!editName || !editPhone} loading={editCustomer.isPending}>
            Guardar
          </Button>
        </form>
      </Dialog>

      <Dialog open={showDelete} onClose={() => setShowDelete(false)} title="Eliminar cliente">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar a <strong>{customer.name}</strong>? Esta acción no se puede deshacer. Si tiene pedidos
          registrados, no se podrá eliminar — archívalo en su lugar.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deleteCustomer.mutate()}
            loading={deleteCustomer.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
