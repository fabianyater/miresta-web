import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Settings, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { tablesApi } from '@/api/tables'
import { salonsApi } from '@/api/salons'
import { useAuthStore } from '@/store/auth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { SalonCanvas } from '@/components/SalonCanvas'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { isAdminRole } from '@/lib/roles'
import { StockAlert } from '@/components/StockAlert'

// Recuerda el último salón que se estaba viendo — entrar a una mesa y volver debe
// dejar la pestaña donde estaba, no siempre en el primer salón.
const ACTIVE_SALON_STORAGE_KEY = 'miresta.mesas.activeSalonId'

function readStoredSalonId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SALON_STORAGE_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export default function MesasPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = useAuthStore((s) => isAdminRole(s.user?.role))
  const [manageOpen, setManageOpen] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSalonId, setEditSalonId] = useState<number | null>(null)
  const [activeSalonId, setActiveSalonId] = useState<number | null>(readStoredSalonId)

  const { data, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesApi.getTables,
    refetchInterval: 15000,
  })

  const { data: salones, isLoading: loadingSalones } = useQuery({
    queryKey: ['salons'],
    queryFn: salonsApi.getSalons,
  })

  // Si no hay salón guardado (o el guardado ya no existe — se borró, por ejemplo),
  // cae al primero. No pisa uno válido que ya esté seleccionado.
  useEffect(() => {
    if (!salones || salones.length === 0) return
    if (activeSalonId == null || !salones.some((s) => s.id === activeSalonId)) {
      setActiveSalonId(salones[0].id)
    }
  }, [salones, activeSalonId])

  useEffect(() => {
    if (activeSalonId == null) return
    try {
      localStorage.setItem(ACTIVE_SALON_STORAGE_KEY, String(activeSalonId))
    } catch {
      // localStorage no disponible (modo privado, etc.) — simplemente no se recuerda.
    }
  }, [activeSalonId])

  const createTable = useMutation({
    mutationFn: () => tablesApi.createTable(Number(newNumber), activeSalonId!),
    onSuccess: () => {
      toast.success('Mesa creada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['salons'] })
      setNewNumber('')
    },
    onError: (e) => toast.error('No se pudo crear la mesa', { description: getApiErrorMessage(e) }),
  })

  const renameTable = useMutation({
    mutationFn: ({ id, number, salonId }: { id: number; number: number; salonId?: number }) =>
      tablesApi.renameTable(id, number, salonId),
    onSuccess: () => {
      toast.success('Mesa actualizada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['salons'] })
      setEditingId(null)
    },
    onError: (e) => toast.error('No se pudo actualizar la mesa', { description: getApiErrorMessage(e) }),
  })

  const deleteTable = useMutation({
    mutationFn: (id: number) => tablesApi.deleteTable(id),
    onSuccess: () => {
      toast.success('Mesa eliminada')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['salons'] })
    },
    onError: (e) => toast.error('No se pudo eliminar la mesa', { description: getApiErrorMessage(e) }),
  })

  const allTables = data?.tables ?? []
  const tables = activeSalonId != null ? allTables.filter((t) => t.salonId === activeSalonId) : allTables
  const loading = isLoading || loadingSalones

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

      {!loadingSalones && salones && salones.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {salones.map((salon) => (
            <button
              key={salon.id}
              onClick={() => setActiveSalonId(salon.id)}
              className={cn(
                'flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                activeSalonId === salon.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300',
              )}
            >
              {salon.name}
            </button>
          ))}
        </div>
      )}

      {loading && <Skeleton className="h-[260px] w-full rounded-2xl" />}

      {!loading && (
        <SalonCanvas tables={tables} onTableClick={(table) => navigate(`/pedido/mesa/${table.id}`)} />
      )}

      {!loading && allTables.length === 0 && (
        <p className="text-center text-neutral-400 text-sm py-16">No hay mesas configuradas.</p>
      )}

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} title="Administrar mesas">
        <p className="text-xs text-neutral-400 mb-3">
          Mesas de «{salones?.find((s) => s.id === activeSalonId)?.name ?? '…'}» — para ver las de otro salón, cambia
          de pestaña antes de abrir esto. Con el lápiz también puedes mandar una mesa a otro salón.
        </p>
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
                      if (e.key === 'Enter' && editValue && editSalonId != null) {
                        renameTable.mutate({ id: table.id, number: Number(editValue), salonId: editSalonId })
                      }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-20 flex-shrink-0"
                  />
                  <Select
                    value={editSalonId ?? ''}
                    onChange={(e) => setEditSalonId(Number(e.target.value))}
                    className="flex-1"
                  >
                    {salones?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() =>
                      editValue &&
                      editSalonId != null &&
                      renameTable.mutate({ id: table.id, number: Number(editValue), salonId: editSalonId })
                    }
                    disabled={!editValue || editSalonId == null || renameTable.isPending}
                    className="text-status-free disabled:opacity-30 flex-shrink-0"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"
                  >
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
                      setEditSalonId(table.salonId)
                    }}
                    title="Editar mesa"
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
          {tables.length === 0 && (
            <p className="text-center text-neutral-400 text-sm py-6">Este salón no tiene mesas todavía.</p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
