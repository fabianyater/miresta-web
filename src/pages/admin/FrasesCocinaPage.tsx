import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { kitchenApi } from '@/api/kitchen'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'

const MAX_PHRASES = 24

export default function FrasesCocinaPage() {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-phrases'],
    queryFn: kitchenApi.getPhrases,
  })

  useEffect(() => {
    if (data) setRows(data)
  }, [data])

  const save = useMutation({
    mutationFn: () => kitchenApi.savePhrases(rows.map((r) => r.trim()).filter(Boolean)),
    onSuccess: (saved) => {
      toast.success('Frases guardadas')
      setRows(saved)
      queryClient.setQueryData(['kitchen-phrases'], saved)
    },
    onError: (e) => toast.error('No se pudo guardar', { description: getApiErrorMessage(e) }),
  })

  const setRow = (i: number, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? value : r)))
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const cleaned = rows.map((r) => r.trim()).filter(Boolean)
  const dirty = JSON.stringify(cleaned) !== JSON.stringify(data ?? [])

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">
        Frases de cocina
      </h1>
      <p className="text-sm text-neutral-500 mb-5">
        Los botones rápidos del panel «Avisar a cocina». Un toque los envía tal cual.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={row}
                  maxLength={60}
                  onChange={(e) => setRow(i, e.target.value)}
                  placeholder="Frase…"
                  className="flex-1"
                />
                <div className="flex items-center">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25"
                    aria-label="Subir"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-25"
                    aria-label="Bajar"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => removeRow(i)}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setRows((prev) => [...prev, ''])}
            disabled={rows.length >= MAX_PHRASES}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 disabled:opacity-40"
          >
            <Plus size={16} />
            Agregar frase
          </button>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={!dirty || cleaned.length === 0} loading={save.isPending}>
              Guardar
            </Button>
            {dirty && (
              <button
                onClick={() => setRows(data ?? [])}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Descartar cambios
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
