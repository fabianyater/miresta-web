import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Check, X, MoveRight } from 'lucide-react'
import { salonsApi } from '@/api/salons'
import { tablesApi } from '@/api/tables'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { SalonCanvas } from '@/components/SalonCanvas'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn } from '@/lib/utils'

export default function SalonesPage() {
  const queryClient = useQueryClient()
  const [newSalonName, setNewSalonName] = useState('')
  const [editingSalonId, setEditingSalonId] = useState<number | null>(null)
  const [editSalonName, setEditSalonName] = useState('')
  const [activeSalonId, setActiveSalonId] = useState<number | null>(null)
  const [dragHoverSalonId, setDragHoverSalonId] = useState<number | null>(null)
  const dropTargetRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const { data: salones, isLoading: loadingSalones } = useQuery({
    queryKey: ['salons'],
    queryFn: salonsApi.getSalons,
  })

  const { data, isLoading: loadingTables } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesApi.getTables,
  })

  useEffect(() => {
    if (salones && salones.length > 0 && activeSalonId == null) {
      setActiveSalonId(salones[0].id)
    }
  }, [salones, activeSalonId])

  const invalidateSalones = () => queryClient.invalidateQueries({ queryKey: ['salons'] })

  const createSalon = useMutation({
    mutationFn: () => salonsApi.createSalon(newSalonName.trim()),
    onSuccess: (created) => {
      toast.success('Salón creado')
      setNewSalonName('')
      invalidateSalones()
      setActiveSalonId(created.id)
    },
    onError: (e) => toast.error('No se pudo crear el salón', { description: getApiErrorMessage(e) }),
  })

  const renameSalon = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => salonsApi.renameSalon(id, name),
    onSuccess: () => {
      toast.success('Salón actualizado')
      setEditingSalonId(null)
      invalidateSalones()
    },
    onError: (e) => toast.error('No se pudo renombrar el salón', { description: getApiErrorMessage(e) }),
  })

  const moveSalon = useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: 'UP' | 'DOWN' }) =>
      salonsApi.moveSalon(id, direction),
    onSuccess: invalidateSalones,
    onError: (e) => toast.error('No se pudo reordenar', { description: getApiErrorMessage(e) }),
  })

  const deleteSalon = useMutation({
    mutationFn: (id: number) => salonsApi.deleteSalon(id),
    onSuccess: () => {
      toast.success('Salón eliminado')
      invalidateSalones()
      setActiveSalonId(null)
    },
    onError: (e) => toast.error('No se pudo eliminar el salón', { description: getApiErrorMessage(e) }),
  })

  const updatePosition = useMutation({
    mutationFn: ({ id, x, y }: { id: number; x: number; y: number }) => tablesApi.updatePosition(id, x, y),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
    onError: (e) => toast.error('No se pudo mover la mesa', { description: getApiErrorMessage(e) }),
  })

  const moveTableToSalon = useMutation({
    mutationFn: ({ id, number, salonId }: { id: number; number: number; salonId: number }) =>
      tablesApi.renameTable(id, number, salonId),
    onSuccess: (_, vars) => {
      const salonName = salones?.find((s) => s.id === vars.salonId)?.name ?? 'otro salón'
      toast.success(`Mesa movida a ${salonName}`)
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      invalidateSalones()
    },
    onError: (e) => toast.error('No se pudo mover la mesa de salón', { description: getApiErrorMessage(e) }),
  })

  const tables = (data?.tables ?? []).filter((t) => t.salonId === activeSalonId)
  const activeSalon = salones?.find((s) => s.id === activeSalonId)
  const otherSalones = (salones ?? []).filter((s) => s.id !== activeSalonId)

  const salonAt = (clientX: number, clientY: number) => {
    for (const salon of otherSalones) {
      const el = dropTargetRefs.current[salon.id]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return salon.id
      }
    }
    return null
  }

  const handleDragPoint = (clientX: number, clientY: number) => setDragHoverSalonId(salonAt(clientX, clientY))

  const handleDropOutside = (tableId: number, clientX: number, clientY: number) => {
    const targetSalonId = salonAt(clientX, clientY)
    setDragHoverSalonId(null)
    if (targetSalonId == null) return
    const table = tables.find((t) => t.id === tableId)
    if (table) moveTableToSalon.mutate({ id: tableId, number: table.number, salonId: targetSalonId })
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-10">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">
        Salones
      </h1>
      <p className="text-sm text-neutral-500 mb-5">
        Organiza el restaurante en salones y acomoda las mesas como se ven en el local.
      </p>

      <Card className="p-4 mb-5">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Salones</p>

        {loadingSalones && <Skeleton className="h-10 w-full rounded-lg mb-3" />}

        <div className="space-y-1.5 mb-3">
          {salones?.map((salon, i) => (
            <div
              key={salon.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                activeSalonId === salon.id
                  ? 'bg-brand-50 dark:bg-brand-500/15'
                  : 'bg-neutral-50 dark:bg-neutral-700',
              )}
            >
              {editingSalonId === salon.id ? (
                <>
                  <Input
                    autoFocus
                    value={editSalonName}
                    onChange={(e) => setEditSalonName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editSalonName.trim()) {
                        renameSalon.mutate({ id: salon.id, name: editSalonName.trim() })
                      }
                      if (e.key === 'Escape') setEditingSalonId(null)
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => editSalonName.trim() && renameSalon.mutate({ id: salon.id, name: editSalonName.trim() })}
                    disabled={!editSalonName.trim()}
                    className="text-status-free disabled:opacity-30"
                  >
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingSalonId(null)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveSalonId(salon.id)}
                    className="flex-1 text-left flex items-center gap-2 min-w-0"
                  >
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                      {salon.name}
                    </span>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {salon.tableCount} mesa{salon.tableCount === 1 ? '' : 's'}
                    </span>
                  </button>
                  <button
                    onClick={() => moveSalon.mutate({ id: salon.id, direction: 'UP' })}
                    disabled={i === 0}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => moveSalon.mutate({ id: salon.id, direction: 'DOWN' })}
                    disabled={i === (salones?.length ?? 0) - 1}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingSalonId(salon.id)
                      setEditSalonName(salon.name)
                    }}
                    className="p-1 text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteSalon.mutate(salon.id)}
                    disabled={salon.tableCount > 0}
                    title={salon.tableCount > 0 ? 'Mueve o elimina sus mesas primero' : 'Eliminar salón'}
                    className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-25"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
          {!loadingSalones && salones?.length === 0 && (
            <p className="text-sm text-neutral-400 py-2">Todavía no hay salones.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nuevo salón (ej. Terraza)"
            value={newSalonName}
            onChange={(e) => setNewSalonName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSalonName.trim()) createSalon.mutate()
            }}
            className="flex-1"
          />
          <Button onClick={() => createSalon.mutate()} disabled={!newSalonName.trim()} loading={createSalon.isPending}>
            <Plus size={16} />
            Agregar
          </Button>
        </div>
      </Card>

      {activeSalonId && (
        <>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">
            Plano — {activeSalon?.name}
          </p>
          <p className="text-xs text-neutral-400 mb-2">
            Arrastra cada mesa a la casilla donde está de verdad en el salón — se acomoda sola a la cuadrícula.
            {otherSalones.length > 0 && ' Suéltala sobre otro salón para mandarla ahí.'}
          </p>

          {otherSalones.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {otherSalones.map((salon) => (
                <div
                  key={salon.id}
                  ref={(el) => {
                    dropTargetRefs.current[salon.id] = el
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border-2 border-dashed transition-colors',
                    dragHoverSalonId === salon.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-500',
                  )}
                >
                  <MoveRight size={14} />
                  {salon.name}
                </div>
              ))}
            </div>
          )}

          {loadingTables ? (
            <Skeleton className="h-[260px] w-full rounded-2xl" />
          ) : (
            <SalonCanvas
              tables={tables}
              editable
              onPositionChange={(id, x, y) => updatePosition.mutate({ id, x, y })}
              onDragPoint={handleDragPoint}
              onDropOutside={handleDropOutside}
            />
          )}
        </>
      )}
    </div>
  )
}
