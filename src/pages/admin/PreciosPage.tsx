import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, AlertTriangle, History, Trash2, PlusCircle } from 'lucide-react'
import { priceSettingsApi } from '@/api/priceSettings'
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
import type { PriceCode, PriceSettingResponse } from '@/types'

const ENVASE_CODES = new Set(['ENVASE_SOPA', 'ENVASE_BANDEJA'])

export default function PreciosPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<PriceSettingResponse | null>(null)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [confirmed, setConfirmed] = useState(true)
  const [historyCode, setHistoryCode] = useState<PriceCode | null>(null)
  const [deleting, setDeleting] = useState<PriceSettingResponse | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['price-settings'],
    queryFn: priceSettingsApi.getAll,
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['price-settings', historyCode, 'history'],
    queryFn: () => priceSettingsApi.getHistory(historyCode!),
    enabled: !!historyCode,
  })

  const update = useMutation({
    mutationFn: () =>
      priceSettingsApi.update(editing!.code, { amount: Number(amount), label, confirmed }),
    onSuccess: () => {
      toast.success('Precio actualizado')
      queryClient.invalidateQueries({ queryKey: ['price-settings'] })
      setEditing(null)
    },
    onError: (e) => toast.error('No se pudo actualizar el precio', { description: getApiErrorMessage(e) }),
  })

  const deletePrice = useMutation({
    mutationFn: () => priceSettingsApi.delete(deleting!.code),
    onSuccess: () => {
      toast.success('Precio eliminado')
      queryClient.invalidateQueries({ queryKey: ['price-settings'] })
      setDeleting(null)
    },
    onError: (e) => {
      toast.error('No se pudo eliminar el precio', { description: getApiErrorMessage(e) })
      setDeleting(null)
    },
  })

  const openEdit = (setting: PriceSettingResponse) => {
    setEditing(setting)
    setLabel(setting.label)
    setAmount(String(setting.amount))
    setConfirmed(setting.confirmed)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">Precios</h1>
      <p className="text-sm text-neutral-500 mb-5">
        Los marcados como provisional vienen de un proyecto anterior — confírmalos con el negocio. El precio "para
        llevar" de un combo no se configura aparte: se calcula sumando los envases (sopa/bandeja) que aplique.
      </p>

      <div className="space-y-2">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </Card>
          ))}
        {!isLoading && settings?.map((s) => (
          <Card
            key={s.code}
            className={cn('p-3.5 flex items-center justify-between gap-3', !s.configured && 'opacity-60')}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{s.label}</p>
                {!s.configured ? (
                  <Badge variant="neutral">Eliminado — cobra $0</Badge>
                ) : (
                  !s.confirmed && (
                    <Badge variant="busy">
                      <AlertTriangle size={11} />
                      Provisional
                    </Badge>
                  )
                )}
                {ENVASE_CODES.has(s.code) && <Badge variant="neutral">Envase</Badge>}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{formatMoney(s.amount)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {s.configured && (
                <button
                  onClick={() => setHistoryCode(s.code)}
                  title="Ver historial"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <History size={16} />
                </button>
              )}
              {s.configured && (
                <button
                  onClick={() => setDeleting(s)}
                  title="Eliminar precio"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                {s.configured ? <Pencil size={14} /> : <PlusCircle size={14} />}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.configured ? 'Editar precio' : 'Configurar precio'}
      >
        <div className="space-y-3">
          {editing && !editing.configured && (
            <p className="text-xs text-neutral-500">
              Este precio fue eliminado y hoy no cobra nada. Guarda para volver a configurarlo.
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Nombre
            </label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Precio
            </label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            Confirmado (no provisional)
          </label>
          <Button
            className="w-full"
            onClick={() => update.mutate()}
            disabled={!label || !amount}
            loading={update.isPending}
          >
            Guardar
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!historyCode} onClose={() => setHistoryCode(null)} title="Historial de cambios">
        {loadingHistory ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {history?.map((h) => (
              <Card key={h.id} className="p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-500">{formatDateTime(h.changedAt)}</span>
                  <span className="text-xs text-neutral-400">{h.changedBy ?? 'Sistema'}</span>
                </div>
                <div className="space-y-0.5 text-neutral-700 dark:text-neutral-300">
                  {h.previousAmount !== h.newAmount && (
                    <p>
                      Precio: {formatMoney(h.previousAmount)} → <strong>{formatMoney(h.newAmount)}</strong>
                    </p>
                  )}
                  {h.previousLabel !== h.newLabel && (
                    <p>
                      Nombre: "{h.previousLabel}" → <strong>"{h.newLabel}"</strong>
                    </p>
                  )}
                  {h.previousConfirmed !== h.newConfirmed && (
                    <p>
                      Confirmado: {h.previousConfirmed ? 'sí' : 'no'} →{' '}
                      <strong>{h.newConfirmed ? 'sí' : 'no'}</strong>
                    </p>
                  )}
                </div>
              </Card>
            ))}
            {history?.length === 0 && (
              <p className="text-center text-neutral-400 text-sm py-10">Sin cambios registrados todavía.</p>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar precio">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar <strong>{deleting?.label}</strong>? Mientras no lo repongas, ese componente pasa a costar{' '}
          <strong>$0</strong> — no se detiene ningún pedido, pero tampoco se cobrará. Puedes volver a configurarlo
          cuando quieras desde el botón <PlusCircle size={12} className="inline" />.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deletePrice.mutate()}
            loading={deletePrice.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
