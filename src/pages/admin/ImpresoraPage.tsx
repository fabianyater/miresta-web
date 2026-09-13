import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save, Printer } from 'lucide-react'
import { printingApi } from '@/api/printing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { TicketPreviewDialog } from '@/components/ui/TicketPreviewDialog'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import type { PrinterSettingResponse, TicketPreviewResponse } from '@/types'

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
  const [headerLine1, setHeaderLine1] = useState(initial.headerLine1)
  const [headerLine2, setHeaderLine2] = useState(initial.headerLine2 ?? '')
  const [addressLine, setAddressLine] = useState(initial.addressLine ?? '')
  const [footerMessage, setFooterMessage] = useState(initial.footerMessage ?? '')
  const [paperWidthChars, setPaperWidthChars] = useState(String(initial.paperWidthChars))
  const [autoCut, setAutoCut] = useState(initial.autoCut)
  const [retryCount, setRetryCount] = useState(String(initial.retryCount))
  const [timeoutSeconds, setTimeoutSeconds] = useState(String(initial.timeoutSeconds))
  const [ticketPreview, setTicketPreview] = useState<TicketPreviewResponse | null>(null)

  const update = useMutation({
    mutationFn: () =>
      printingApi.updatePrinterSetting({
        printerName,
        printingEnabled,
        headerLine1,
        headerLine2: headerLine2.trim() || null,
        addressLine: addressLine.trim() || null,
        footerMessage: footerMessage.trim() || null,
        paperWidthChars: Number(paperWidthChars),
        autoCut,
        retryCount: Number(retryCount),
        timeoutSeconds: Number(timeoutSeconds),
      }),
    onSuccess: () => toast.success('Impresora actualizada'),
    onError: (e) => toast.error('No se pudo guardar', { description: getApiErrorMessage(e) }),
  })

  const testPrint = useMutation({
    mutationFn: () => printingApi.printTestTicket(),
    onSuccess: (preview) => {
      if (preview.printed) toast.success('Ticket de prueba enviado a la impresora')
      else setTicketPreview(preview)
    },
    onError: (e) => toast.error('No se pudo imprimir el ticket de prueba', { description: getApiErrorMessage(e) }),
  })

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Impresora</p>
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
        <Button variant="secondary" className="w-full" onClick={() => testPrint.mutate()} loading={testPrint.isPending}>
          <Printer size={16} />
          Imprimir ticket de prueba
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Encabezado y pie del ticket</p>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Línea 1 (nombre del negocio)
          </label>
          <Input value={headerLine1} onChange={(e) => setHeaderLine1(e.target.value)} placeholder="Restaurante Tradición" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Línea 2 (opcional)
          </label>
          <Input value={headerLine2} onChange={(e) => setHeaderLine2(e.target.value)} placeholder="Leña y Carbón" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Dirección / NIT (opcional)
          </label>
          <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Cra 10 #20-30 · NIT 900.123.456-7" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Mensaje de despedida (opcional, solo en el recibo de pago)
          </label>
          <Input value={footerMessage} onChange={(e) => setFooterMessage(e.target.value)} placeholder="¡Gracias por su visita!" />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Papel y corte</p>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Ancho del papel
          </label>
          <Select value={paperWidthChars} onChange={(e) => setPaperWidthChars(e.target.value)}>
            <option value="32">58mm (32 caracteres)</option>
            <option value="48">80mm (48 caracteres)</option>
          </Select>
        </div>
        <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
          <input
            type="checkbox"
            checked={autoCut}
            onChange={(e) => setAutoCut(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">Corte automático</span>
            <span className="block text-xs text-neutral-500">
              Desactívalo si la impresora no tiene cuchilla — igual alimenta papel al final para rasgarlo a mano.
            </span>
          </span>
        </label>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Si falla el envío</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Reintentos
            </label>
            <Input
              type="number"
              min={0}
              max={5}
              value={retryCount}
              onChange={(e) => setRetryCount(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Tiempo de espera (segundos)
            </label>
            <Input
              type="number"
              min={3}
              max={60}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          Si el envío no responde en ese tiempo, se reintenta automáticamente hasta agotar los reintentos antes de
          avisar que falló.
        </p>
      </Card>

      <Button className="w-full" onClick={() => update.mutate()} loading={update.isPending}>
        <Save size={16} />
        Guardar
      </Button>

      <TicketPreviewDialog preview={ticketPreview} onClose={() => setTicketPreview(null)} />
    </div>
  )
}
