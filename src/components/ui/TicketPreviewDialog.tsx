import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import type { TicketPreviewResponse } from '@/types'

/** Vista previa de un ticket que no se envió a ninguna impresora real — usada cuando
 * la impresión está desactivada en Admin → Impresora (ej. en desarrollo, sin
 * impresora conectada). Simula el papel: blanco/negro fijo, sin importar el tema. */
export function TicketPreviewDialog({
  preview,
  onClose,
}: {
  preview: TicketPreviewResponse | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!preview} onClose={onClose} title={preview ? `Vista previa: ${preview.title}` : 'Vista previa'}>
      {preview && (
        <>
          <div className="bg-white text-black rounded-lg border border-neutral-200 shadow-inner mx-auto max-w-[280px] p-4 font-mono text-[11px] leading-relaxed">
            {preview.lines.map((line, i) =>
              line.rule ? (
                <div key={i}>{'-'.repeat(32)}</div>
              ) : (
                <div key={i} className={cn(line.center && 'text-center', line.bold && 'font-bold')}>
                  {line.text || ' '}
                </div>
              ),
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-3 text-center">
            No se envió a ninguna impresora — la impresión está desactivada en Admin → Impresora.
          </p>
        </>
      )}
    </Dialog>
  )
}
