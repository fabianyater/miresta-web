import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Lock, History, ChevronDown, ChevronUp } from 'lucide-react'
import { cashShiftsApi } from '@/api/cashShifts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { cn, formatDateTime, formatMoney } from '@/lib/utils'
import type { CashShiftResponse } from '@/types'

function Row({
  label,
  amount,
  bold,
  tone,
}: {
  label: string
  amount: number
  bold?: boolean
  tone?: 'free' | 'busy'
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn('text-sm', bold ? 'font-semibold text-neutral-900 dark:text-neutral-50' : 'text-neutral-500')}>
        {label}
      </span>
      <span
        className={cn(
          'text-sm tabular-nums',
          bold ? 'font-bold text-neutral-900 dark:text-neutral-50' : 'text-neutral-700 dark:text-neutral-200',
          tone === 'free' && 'text-status-free',
          tone === 'busy' && 'text-status-busy',
        )}
      >
        {formatMoney(amount)}
      </span>
    </div>
  )
}

function DifferenceBadge({ difference }: { difference: number | null }) {
  if (difference == null) return null
  if (difference === 0) return <Badge variant="free">Cuadró exacto</Badge>
  return (
    <Badge variant="busy">
      {difference > 0 ? `Sobran ${formatMoney(difference)}` : `Faltan ${formatMoney(-difference)}`}
    </Badge>
  )
}

export default function CajaPage() {
  const queryClient = useQueryClient()
  const [openingCash, setOpeningCash] = useState('')
  const [showMovement, setShowMovement] = useState(false)
  const [movementType, setMovementType] = useState<'ENTRADA' | 'SALIDA'>('SALIDA')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [showClose, setShowClose] = useState(false)
  const [countedInputs, setCountedInputs] = useState<Record<string, string>>({})
  const [closeNotes, setCloseNotes] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const { data: shift, isLoading } = useQuery({
    queryKey: ['cash-shift-current'],
    queryFn: cashShiftsApi.getCurrent,
    refetchInterval: 20000,
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['cash-shift-history'],
    queryFn: cashShiftsApi.list,
    enabled: showHistory,
  })

  const invalidateCurrent = () => queryClient.invalidateQueries({ queryKey: ['cash-shift-current'] })

  const openShift = useMutation({
    mutationFn: () => cashShiftsApi.open({ openingCash: Number(openingCash) || 0 }),
    onSuccess: () => {
      toast.success('Turno abierto')
      setOpeningCash('')
      invalidateCurrent()
    },
    onError: (e) => toast.error('No se pudo abrir el turno', { description: getApiErrorMessage(e) }),
  })

  const addMovement = useMutation({
    mutationFn: () =>
      cashShiftsApi.addMovement(shift!.id, {
        type: movementType,
        amount: Number(movementAmount) || 0,
        reason: movementReason.trim(),
      }),
    onSuccess: () => {
      toast.success('Movimiento registrado')
      setShowMovement(false)
      setMovementAmount('')
      setMovementReason('')
      invalidateCurrent()
    },
    onError: (e) => toast.error('No se pudo registrar el movimiento', { description: getApiErrorMessage(e) }),
  })

  const closeShift = useMutation({
    mutationFn: () => {
      const countedByMethod: Record<string, number> = {}
      for (const [method, value] of Object.entries(countedInputs)) {
        countedByMethod[method] = Number(value) || 0
      }
      return cashShiftsApi.close(shift!.id, { countedByMethod, notes: closeNotes.trim() })
    },
    onSuccess: (closed) => {
      const diff = closed.totalDifferenceAllMethods ?? 0
      if (diff === 0) toast.success('Turno cerrado — todo cuadró')
      else toast.error(`Turno cerrado — ${diff > 0 ? 'sobran' : 'faltan'} ${formatMoney(Math.abs(diff))} en total`)
      setShowClose(false)
      setCountedInputs({})
      setCloseNotes('')
      invalidateCurrent()
      queryClient.invalidateQueries({ queryKey: ['cash-shift-history'] })
    },
    onError: (e) => toast.error('No se pudo cerrar el turno', { description: getApiErrorMessage(e) }),
  })

  const openCloseDialog = () => {
    if (!shift) return
    const seeded: Record<string, string> = {}
    for (const m of shift.methodReconciliations) seeded[m.paymentTypeName] = String(m.expected)
    setCountedInputs(seeded)
    setShowClose(true)
  }

  const closePreview = shift
    ? shift.methodReconciliations.map((m) => {
        const counted = Number(countedInputs[m.paymentTypeName] ?? m.expected) || 0
        return { ...m, previewCounted: counted, previewDifference: counted - m.expected }
      })
    : []
  const totalPreviewDifference = closePreview.reduce((sum, m) => sum + m.previewDifference, 0)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-10">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">Caja</h1>
      <p className="text-sm text-neutral-500 mb-5">Apertura, movimientos de efectivo y cierre con arqueo</p>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {!isLoading && !shift && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-1">No hay un turno abierto</p>
          <p className="text-sm text-neutral-500 mb-4">
            Registra la base con la que arranca la caja (el efectivo inicial).
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Base inicial"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => openShift.mutate()} loading={openShift.isPending}>
              Abrir turno
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && shift && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <Badge variant="pending">Turno abierto</Badge>
              <p className="text-xs text-neutral-500 mt-1.5">
                Abrió {shift.openedBy} · {formatDateTime(shift.openedAt)}
              </p>
            </div>
            <Button variant="danger" onClick={openCloseDialog}>
              <Lock size={16} />
              Cerrar turno
            </Button>
          </div>

          <Card className="p-4 mb-4">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">
              Efectivo esperado en caja
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-3">
              {formatMoney(shift.expectedCash)}
            </p>
            <div className="border-t border-neutral-100 dark:border-neutral-700 pt-2">
              <Row label="Base inicial" amount={shift.openingCash} />
              <Row label="+ Ventas en efectivo" amount={shift.cashSales} />
              <Row label="+ Entradas" amount={shift.totalEntradas} />
              <Row label="− Salidas" amount={shift.totalSalidas ? -shift.totalSalidas : 0} />
            </div>
          </Card>

          {shift.salesByMethod.length > 0 && (
            <Card className="p-4 mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                Ventas por método (este turno)
              </p>
              {shift.salesByMethod.map((row) => (
                <Row key={row.paymentTypeName} label={`${row.paymentTypeName} (${row.orderCount})`} amount={row.total} />
              ))}
            </Card>
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Movimientos de efectivo</p>
            <button
              onClick={() => setShowMovement(true)}
              className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"
            >
              <Plus size={15} />
              Agregar
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {shift.movements.length === 0 && (
              <p className="text-sm text-neutral-400 py-3">Sin movimientos todavía.</p>
            )}
            {shift.movements.map((m) => (
              <Card key={m.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      m.type === 'ENTRADA'
                        ? 'bg-status-free-bg text-status-free'
                        : 'bg-status-busy-bg text-status-busy',
                    )}
                  >
                    {m.type === 'ENTRADA' ? <Plus size={15} /> : <Minus size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">{m.reason}</p>
                    <p className="text-xs text-neutral-500">
                      {m.createdBy} · {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold flex-shrink-0',
                    m.type === 'ENTRADA' ? 'text-status-free' : 'text-status-busy',
                  )}
                >
                  {m.type === 'ENTRADA' ? '+' : '−'}
                  {formatMoney(m.amount)}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setShowHistory((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mt-2"
      >
        <History size={15} />
        Historial de turnos
        {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showHistory && (
        <div className="space-y-2 mt-3">
          {loadingHistory && <Skeleton className="h-16 w-full rounded-xl" />}
          {!loadingHistory && history?.length === 0 && (
            <p className="text-sm text-neutral-400 py-3">Sin turnos registrados todavía.</p>
          )}
          {history?.map((h: CashShiftResponse) => (
            <Card key={h.id} className="p-3.5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {formatDateTime(h.openedAt)}
                  {h.closedAt ? ` – ${formatDateTime(h.closedAt)}` : ''}
                </p>
                {h.closedAt ? (
                  <DifferenceBadge difference={h.totalDifferenceAllMethods} />
                ) : (
                  <Badge variant="pending">Abierto</Badge>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Abrió {h.openedBy}
                {h.closedBy ? ` · Cerró ${h.closedBy}` : ''}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                <span>Base {formatMoney(h.openingCash)}</span>
                <span>Efectivo esperado {formatMoney(h.expectedCash)}</span>
                {h.countedCash != null && <span>Efectivo contado {formatMoney(h.countedCash)}</span>}
              </div>
              {h.methodReconciliations.length > 1 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-500">
                  <span>Total esperado {formatMoney(h.totalExpectedAllMethods)}</span>
                  {h.totalCountedAllMethods != null && (
                    <span>Total contado {formatMoney(h.totalCountedAllMethods)}</span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showMovement} onClose={() => setShowMovement(false)} title="Nuevo movimiento">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMovementType('ENTRADA')}
              className={cn(
                'py-2 rounded-lg text-sm font-medium border',
                movementType === 'ENTRADA'
                  ? 'border-status-free bg-status-free-bg text-status-free'
                  : 'border-neutral-200 dark:border-neutral-600 text-neutral-500',
              )}
            >
              Entrada
            </button>
            <button
              onClick={() => setMovementType('SALIDA')}
              className={cn(
                'py-2 rounded-lg text-sm font-medium border',
                movementType === 'SALIDA'
                  ? 'border-status-busy bg-status-busy-bg text-status-busy'
                  : 'border-neutral-200 dark:border-neutral-600 text-neutral-500',
              )}
            >
              Salida
            </button>
          </div>
          <Input
            type="number"
            placeholder="Monto"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
          />
          <Input
            placeholder="Motivo (ej. compra de cocina, retiro)"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!movementAmount || !movementReason.trim()}
            loading={addMovement.isPending}
            onClick={() => addMovement.mutate()}
          >
            Guardar
          </Button>
        </div>
      </Dialog>

      <Dialog open={showClose} onClose={() => setShowClose(false)} title="Cerrar turno">
        {shift && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">
              Efectivo se cuenta a mano; tarjeta/transferencia se verifican contra el datáfono o el banco. Un
              método que dejes igual se asume cuadrado.
            </p>

            <div className="space-y-3">
              {closePreview.map((m, i) => (
                <div key={m.paymentTypeName}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {m.paymentTypeName}
                    </span>
                    <span className="text-xs text-neutral-500">Esperado {formatMoney(m.expected)}</span>
                  </div>
                  <Input
                    type="number"
                    value={countedInputs[m.paymentTypeName] ?? ''}
                    onChange={(e) =>
                      setCountedInputs((prev) => ({ ...prev, [m.paymentTypeName]: e.target.value }))
                    }
                    autoFocus={i === 0}
                  />
                  <p
                    className={cn(
                      'text-xs font-semibold mt-1',
                      m.previewDifference === 0 ? 'text-status-free' : 'text-status-busy',
                    )}
                  >
                    {m.previewDifference === 0
                      ? 'Cuadra exacto'
                      : m.previewDifference > 0
                        ? `Sobran ${formatMoney(m.previewDifference)}`
                        : `Faltan ${formatMoney(-m.previewDifference)}`}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
              <p
                className={cn(
                  'text-sm font-bold',
                  totalPreviewDifference === 0 ? 'text-status-free' : 'text-status-busy',
                )}
              >
                Total:{' '}
                {totalPreviewDifference === 0
                  ? 'cuadra exacto'
                  : totalPreviewDifference > 0
                    ? `sobran ${formatMoney(totalPreviewDifference)}`
                    : `faltan ${formatMoney(-totalPreviewDifference)}`}
              </p>
            </div>

            <Input
              placeholder="Notas (opcional)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
            <Button className="w-full" variant="danger" loading={closeShift.isPending} onClick={() => closeShift.mutate()}>
              Confirmar cierre
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  )
}
