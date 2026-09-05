import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Phone, ChevronRight } from 'lucide-react'
import { customersApi } from '@/api/customers'
import { ordersApi } from '@/api/orders'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn, formatMoney } from '@/lib/utils'

export default function ClientesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers(),
  })

  const { data: balances } = useQuery({
    queryKey: ['customer-balances'],
    queryFn: ordersApi.getCustomerBalances,
  })

  const balanceByCustomer = new Map((balances ?? []).map((b) => [b.customerId, b]))

  const createCustomer = useMutation({
    mutationFn: () => customersApi.createCustomer({ name, phone }),
    onSuccess: () => {
      toast.success('Cliente creado')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setOpen(false)
      setName('')
      setPhone('')
    },
    onError: (e) => toast.error('No se pudo crear el cliente', { description: getApiErrorMessage(e) }),
  })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Clientes</h1>
        <Button onClick={() => setOpen(true)}>
          <UserPlus size={16} />
          Nuevo
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </Card>
          ))}
        {!isLoading && customers?.map((c) => {
            const balance = balanceByCustomer.get(c.id)
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/clientes/${c.id}`)}
                className={cn('w-full text-left', !c.active && 'opacity-60')}
              >
                <Card className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 flex items-center gap-2 truncate">
                      {c.name}
                      {!c.active && <Badge variant="neutral">Archivado</Badge>}
                    </span>
                    <span className="text-sm text-neutral-500 flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} />
                      {c.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {balance && balance.totalOwed > 0 && (
                      <Badge variant="busy">Debe {formatMoney(balance.totalOwed)}</Badge>
                    )}
                    <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600" />
                  </div>
                </Card>
              </button>
            )
          })}
        {!isLoading && customers?.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-16">Aún no hay clientes registrados.</p>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (name && phone) createCustomer.mutate()
          }}
        >
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" className="w-full" disabled={!name || !phone} loading={createCustomer.isPending}>
            Guardar
          </Button>
        </form>
      </Dialog>
    </div>
  )
}
