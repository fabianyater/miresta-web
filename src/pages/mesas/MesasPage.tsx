import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Users2, Settings, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { tablesApi } from '@/api/tables'
import { useAuthStore } from '@/store/auth'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { isAdminRole } from '@/lib/roles'
import { StockAlert } from '@/components/StockAlert'

export default function MesasPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = useAuthStore((s) => isAdminRole(s.user?.role))
  const [manageOpen, setManageOpen] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesApi.getTables,
    refetchInterval: 15000,
  })

  const createTable = useMutation({
    mutationFn: () => tablesApi.createTable(Number(newNumber)),
    onSuccess: () => {
      toast.success('Mesa creada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setNewNumber('')
    },
    onError: (e) => toast.error('No se pudo crear la mesa', { description: getApiErrorMessage(e) }),
  })

  const renameTable = useMutation({
    mutationFn: ({ id, number }: { id: number; number: number }) => tablesApi.renameTable(id, number),
    onSuccess: () => {
      toast.success('Mesa actualizada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setEditingId(null)
    },
    onError: (e) => toast.error('No se pudo actualizar la mesa', { description: getApiErrorMessage(e) }),
  })

  const deleteTable = useMutation({
    mutationFn: (id: number) => tablesApi.deleteTable(id),
    onSuccess: () => {
      toast.success('Mesa eliminada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (e) => toast.error('No se pudo eliminar la mesa', { description: getApiErrorMessage(e) }),
  })

  const tables = data?.tables ?? []

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <StockAlert />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Mesas</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-24 mt-1.5" />
          ) : (
            <p className="text-sm text-neutral-500 mt-0.5">
              {data?.freeTables ?? 0} libres · {data?.inUseTables ?? 0} en uso
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setManageOpen(true)} variant="secondary">
              <Settings size={16} />
              Administrar
            </Button>
          )}
          <Button onClick={() => navigate('/pedido/nuevo')} variant="secondary">
            <ShoppingBag size={16} />
            Para llevar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="aspect-square flex flex-col items-center justify-center gap-1.5 p-3">
              <Skeleton className="h-[22px] w-[22px] rounded-full" />
              <Skeleton className="h-5 w-6" />
              <Skeleton className="h-3.5 w-10 rounded-full" />
            </Card>
          ))}
        {!isLoading && tables.map((table) => {
          const isFree = table.status === 'OPEN'
          return (
            <button
              key={table.id}
              onClick={() => navigate(`/pedido/mesa/${table.id}`)}
              className="text-left"
            >
              <Card
                className={cn(
                  'aspect-square flex flex-col items-center justify-center gap-1.5 p-3 transition-transform active:scale-95',
                  isFree ? 'hover:border-status-free/40' : 'hover:border-status-busy/40',
                )}
              >
                <Users2
                  size={22}
                  className={isFree ? 'text-status-free' : 'text-status-busy'}
                />
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{table.number}</span>
                <Badge variant={isFree ? 'free' : 'busy'} className="text-[10px] px-1.5 py-0.5">
                  {isFree ? 'Libre' : 'En uso'}
                </Badge>
              </Card>
            </button>
          )
        })}
      </div>

      {!isLoading && tables.length === 0 && (
        <p className="text-center text-neutral-400 text-sm py-16">No hay mesas configuradas.</p>
      )}

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} title="Administrar mesas">
        <div className="flex gap-2 mb-4">
          <Input
            type="number"
            placeholder="Número de mesa"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newNumber) createTable.mutate()
            }}
            className="flex-1"
          />
          <Button onClick={() => createTable.mutate()} disabled={!newNumber} loading={createTable.isPending}>
            <Plus size={16} />
            Agregar
          </Button>
        </div>

        <div className="space-y-1.5">
          {tables.map((table) => {
            const isFree = table.status === 'OPEN'
            const isEditing = editingId === table.id

            if (isEditing) {
              return (
                <div
                  key={table.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-700"
                >
                  <Input
                    type="number"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editValue) {
                        renameTable.mutate({ id: table.id, number: Number(editValue) })
                      }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => editValue && renameTable.mutate({ id: table.id, number: Number(editValue) })}
                    disabled={!editValue || renameTable.isPending}
                    className="text-status-free disabled:opacity-30"
                  >
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={18} />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={table.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Mesa {table.number}
                  </span>
                  <Badge variant={isFree ? 'free' : 'busy'}>{isFree ? 'Libre' : 'En uso'}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingId(table.id)
                      setEditValue(String(table.number))
                    }}
                    title="Editar número"
                    className="text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteTable.mutate(table.id)}
                    disabled={!isFree || deleteTable.isPending}
                    title={!isFree ? 'No se puede eliminar una mesa en uso' : 'Eliminar mesa'}
                    className="text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Dialog>
    </div>
  )
}
