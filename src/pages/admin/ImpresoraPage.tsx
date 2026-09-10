import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { printingApi } from '@/api/printing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import type { PrinterSettingResponse } from '@/types'

export default function ImpresoraPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['printer-setting'],
    queryFn: printingApi.getPrinterSetting,
  })

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">Impresora</h1>
      <p className="text-sm text-neutral-500 mb-5">
        Impresora térmica USB (ESC/POS). Debe estar instalada y compartida en Windows en el mismo equipo que el servidor.
      </p>

      {isLoading || !data ? (
        <Card className="p-4 space-y-3">
          <div>
            <Skeleton className="h-3 w-48 mb-2" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
        </Card>
      ) : (
        <ImpresoraForm initial={data} />
      )}
    </div>
  )
}

function ImpresoraForm({ initial }: { initial: PrinterSettingResponse }) {
  const [printerName, setPrinterName] = useState(initial.printerName)
  const [printingEnabled, setPrintingEnabled] = useState(initial.printingEnabled)

  const update = useMutation({
    mutationFn: () => printingApi.updatePrinterSetting({ printerName, printingEnabled }),
    onSuccess: () => toast.success('Impresora actualizada'),
  })

  return (
    <Card className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Nombre de la impresora en Windows
        </label>
        <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="JALTECH-POS-80" />
      </div>
      <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
        <input
          type="checkbox"
          checked={printingEnabled}
          onChange={(e) => setPrintingEnabled(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-brand-500"
        />
        <span>
          <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Impresión activada
          </span>
          <span className="block text-xs text-neutral-500">
            Si la desactivas, comanda/cuenta/resumen no se envían a la impresora — en su lugar se muestra una
            vista previa de cómo se vería. Útil si la impresora no está conectada.
          </span>
        </span>
      </label>
      <Button className="w-full" onClick={() => update.mutate()} loading={update.isPending}>
        <Save size={16} />
        Guardar
      </Button>
    </Card>
  )
}
