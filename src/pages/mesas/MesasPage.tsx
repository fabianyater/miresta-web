import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Settings, Plus, Trash2, Pencil, Check, X, Link2 } from 'lucide-react'
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
import type { TableEntityDto } from '@/types'

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
  const [mergeOpen, setMergeOpen] = useState(false)
  // Orden en que se van tocando — la primera queda como principal (ahí corre el pedido).
  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([])

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

  const mergeTables = useMutation({
    mutationFn: () => tablesApi.mergeTables(selectedForMerge[0], selectedForMerge.slice(1)),
    onSuccess: () => {
      toast.success('Mesas unidas')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setSelectedForMerge([])
    },
    onError: (e) => toast.error('No se pudieron unir', { description: getApiErrorMessage(e) }),
  })

  const unmergeTables = useMutation({
    mutationFn: (primaryId: number) => tablesApi.unmergeTables(primaryId),
    onSuccess: () => {
      toast.success('Mesas separadas')
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (e) => toast.error('No se pudo separar', { description: getApiErrorMessage(e) }),
  })

  const allTables = data?.tables ?? []
  const tables = activeSalonId != null ? allTables.filter((t) => t.salonId === activeSalonId) : allTables
  const loading = isLoading || loadingSalones

  const toggleMergeSelection = (id: number) =>
    setSelectedForMerge((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Grupos ya unidos, para poder listarlos y separarlos — sin importar el salón.
  const activeGroups = useMemo(() => {
    const membersByPrimaryId = new Map<number, TableEntityDto[]>()
    for (const t of allTables) {
      if (t.mergedIntoId == null) continue
      const list = membersByPrimaryId.get(t.mergedIntoId) ?? []
      list.push(t)
      membersByPrimaryId.set(t.mergedIntoId, list)
    }
    const groups: { primary: TableEntityDto; members: TableEntityDto[] }[] = []
    for (const [primaryId, members] of membersByPrimaryId) {
      const primary = allTables.find((t) => t.id === primaryId)
      if (primary) groups.push({ primary, members })
    }
    return groups
  }, [allTables])

  // Libres de este salón y que no formen ya parte de otro grupo (ni como principal ni
  // como secundaria) — eso el backend lo rechazaría igual, pero mejor no ofrecerlo.
  const primaryIdsInUse = useMemo(
    () => new Set(allTables.filter((t) => t.mergedIntoId != null).map((t) => t.mergedIntoId!)),
    [allTables],
  )
  const selectableForMerge = tables.filter(
    (t) => t.status === 'OPEN' && t.mergedIntoId == null && !primaryIdsInUse.has(t.id),
  )

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
          <Button onClick={() => setMergeOpen(true)} variant="secondary">
            <Link2 size={16} />
            Unir mesas
          </Button>
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
        <SalonCanvas
          tables={tables}
          allTables={allTables}
          onTableClick={(table) => navigate(`/pedido/mesa/${table.mergedIntoId ?? table.id}`)}
        />
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

      <Dialog
        open={mergeOpen}
        onClose={() => {
          setMergeOpen(false)
          setSelectedForMerge([])
        }}
        title="Unir mesas"
      >
        {activeGroups.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Grupos activos</p>
            <div className="space-y-1.5">
              {activeGroups.map(({ primary, members }) => (
                <div
                  key={primary.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-700"
                >
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    Mesa {[primary.number, ...members.map((m) => m.number)].join(' + ')}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => unmergeTables.mutate(primary.id)}
                    loading={unmergeTables.isPending}
                  >
                    Separar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">
          Nueva unión — mesas libres de «{salones?.find((s) => s.id === activeSalonId)?.name ?? '…'}»
        </p>
        <p className="text-xs text-neutral-400 mb-2">
          Toca las mesas en el orden que quieras — la primera queda como principal (ahí se toma y cobra el pedido).
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4 max-h-56 overflow-y-auto">
          {selectableForMerge.map((t) => {
            const order = selectedForMerge.indexOf(t.id)
            const selected = order >= 0
            return (
              <button
                key={t.id}
                onClick={() => toggleMergeSelection(t.id)}
                className={cn(
                  'relative px-2 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300',
                )}
              >
                Mesa {t.number}
                {selected && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {order + 1}
                  </span>
                )}
              </button>
            )
          })}
          {selectableForMerge.length === 0 && (
            <p className="col-span-3 text-sm text-neutral-400 text-center py-4">No hay mesas libres en este salón.</p>
          )}
        </div>
        <Button
          className="w-full"
          disabled={selectedForMerge.length < 2}
          loading={mergeTables.isPending}
          onClick={() => mergeTables.mutate()}
        >
          <Link2 size={16} />
          Unir{selectedForMerge.length >= 2 ? ` (${selectedForMerge.length})` : ''}
        </Button>
      </Dialog>
    </div>
  )
}
