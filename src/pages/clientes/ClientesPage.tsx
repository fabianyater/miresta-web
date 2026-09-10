import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Phone, ChevronRight, Send, Check, ExternalLink } from 'lucide-react'
import { customersApi } from '@/api/customers'
import { ordersApi } from '@/api/orders'
import { menusApi } from '@/api/menus'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn, formatMoney, todayIso } from '@/lib/utils'
import { buildMenuMessage, whatsappLink } from '@/lib/whatsapp'
import type { CustomerResponse } from '@/types'

export default function ClientesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showSend, setShowSend] = useState(false)
  const [opened, setOpened] = useState<Set<number>>(new Set())

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers(),
  })

  const { data: balances } = useQuery({
    queryKey: ['customer-balances'],
    queryFn: ordersApi.getCustomerBalances,
  })

  const { data: menus } = useQuery({
    queryKey: ['menus', todayIso()],
    queryFn: () => menusApi.getMenus(todayIso()),
  })

  const menuMessage = useMemo(
    () => buildMenuMessage(menus?.find((m) => m.type === 'ALMUERZO')),
    [menus],
  )

  const balanceByCustomer = new Map((balances ?? []).map((b) => [b.customerId, b]))
  const selectedCustomers = (customers ?? []).filter((c) => selected.has(c.id))

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

  const exitSelection = () => {
    setSelecting(false)
    setSelected(new Set())
    setShowSend(false)
    setOpened(new Set())
  }

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const cardBody = (c: CustomerResponse) => {
    const balance = balanceByCustomer.get(c.id)
    return (
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
          {selecting ? (
            <span
              className={cn(
                'w-5 h-5 rounded-md border flex items-center justify-center',
                selected.has(c.id)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-neutral-300 dark:border-neutral-600',
              )}
            >
              {selected.has(c.id) && <Check size={13} />}
            </span>
          ) : (
            <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600" />
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between gap-2 mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
          Clientes
        </h1>
        {selecting ? (
          <Button variant="secondary" onClick={exitSelection}>
            Cancelar
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" onClick={() => setSelecting(true)} title="Enviar menú por WhatsApp">
              <Send size={16} />
              <span className="hidden sm:inline">Enviar menú</span>
            </Button>
            <Button onClick={() => setOpen(true)}>
              <UserPlus size={16} />
              Nuevo
            </Button>
          </div>
        )}
      </div>

      {selecting && (
        <p className="text-sm text-neutral-500 mb-4">
          Toca los clientes a los que quieres mandarles el menú de hoy por WhatsApp.
        </p>
      )}

      <div className={cn('space-y-2', selecting && 'pb-24')}>
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
        {!isLoading &&
          customers?.map((c) => (
            <button
              key={c.id}
              onClick={() => (selecting ? toggle(c.id) : navigate(`/clientes/${c.id}`))}
              className={cn('w-full text-left', !c.active && 'opacity-60')}
            >
              {cardBody(c)}
            </button>
          ))}
        {!isLoading && customers?.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-16">Aún no hay clientes registrados.</p>
        )}
      </div>

      {selecting && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-60 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 flex items-center gap-3 z-20">
          <span className="text-sm text-neutral-500 flex-shrink-0">{selected.size} sel.</span>
          <Button className="flex-1" disabled={selected.size === 0} onClick={() => setShowSend(true)}>
            <Send size={16} />
            Enviar menú
          </Button>
        </div>
      )}

      <Dialog open={showSend} onClose={() => setShowSend(false)} title="Enviar menú por WhatsApp">
        {!menuMessage ? (
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            <p className="mb-3">No hay un menú de almuerzo configurado para hoy.</p>
            <Button variant="secondary" onClick={() => navigate('/admin/menu')}>
              Ir a Menú del día
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Mensaje</p>
              <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 whitespace-pre-wrap break-words text-neutral-700 dark:text-neutral-200 font-sans">
                {menuMessage}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                {selectedCustomers.length} cliente{selectedCustomers.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-neutral-400 mb-2">
                Se abre el chat de cada uno con el menú ya escrito — solo queda darle enviar.
              </p>
              <div className="space-y-2">
                {selectedCustomers.map((c) => {
                  const link = whatsappLink(c.phone, menuMessage)
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-neutral-500">{c.phone}</p>
                      </div>
                      {link ? (
                        <button
                          onClick={() => {
                            window.open(link, '_blank', 'noopener')
                            setOpened((prev) => new Set(prev).add(c.id))
                          }}
                          className={cn(
                            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0',
                            opened.has(c.id)
                              ? 'bg-status-free-bg text-status-free'
                              : 'bg-brand-500 text-white',
                          )}
                        >
                          {opened.has(c.id) ? <Check size={14} /> : <ExternalLink size={14} />}
                          {opened.has(c.id) ? 'Abierto' : 'Abrir'}
                        </button>
                      ) : (
                        <span className="text-xs text-status-busy flex-shrink-0">Número inválido</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <Button className="w-full" onClick={exitSelection}>
              Listo
            </Button>
          </div>
        )}
      </Dialog>

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
