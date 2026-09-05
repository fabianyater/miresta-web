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

  const update = useMutation({
    mutationFn: () => printingApi.updatePrinterSetting({ printerName }),
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
      <Button className="w-full" onClick={() => update.mutate()} loading={update.isPending}>
        <Save size={16} />
        Guardar
      </Button>
    </Card>
  )
}
