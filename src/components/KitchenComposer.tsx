import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Send, Volume2, Mic } from 'lucide-react'
import { kitchenApi } from '@/api/kitchen'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { KITCHEN_QUICK_PHRASES } from '@/lib/kitchenPhrases'
import { useDictation } from '@/lib/useDictation'
import { cn } from '@/lib/utils'

/** Botón fijo (barra lateral en desktop, barra superior en móvil) para mandar un
 * mensaje corto a la pantalla de cocina, que lo lee en voz alta. */
export function KitchenComposer({ variant }: { variant: 'sidebar' | 'header' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const { data: phrases } = useQuery({
    queryKey: ['kitchen-phrases'],
    queryFn: kitchenApi.getPhrases,
    staleTime: 5 * 60 * 1000,
  })
  const quickPhrases = phrases && phrases.length > 0 ? phrases : KITCHEN_QUICK_PHRASES

  const dictation = useDictation(setText)

  const send = useMutation({
    mutationFn: (message: string) => kitchenApi.send(message),
    onSuccess: () => {
      toast.success('Enviado a cocina')
      setOpen(false)
      setText('')
    },
    onError: (e) => toast.error('No se pudo enviar', { description: getApiErrorMessage(e) }),
  })

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15 hover:bg-brand-100 dark:hover:bg-brand-500/25 transition-colors"
        >
          <MessageSquare size={17} />
          Avisar a cocina
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Avisar a cocina"
          className="text-brand-600 dark:text-brand-400 p-2"
        >
          <MessageSquare size={18} />
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Avisar a cocina">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickPhrases.map((phrase) => (
              <button
                key={phrase}
                disabled={send.isPending}
                onClick={() => send.mutate(phrase)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                  'border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200',
                  'hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50',
                )}
              >
                {phrase}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) send.mutate(text.trim())
            }}
          >
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={dictation.listening ? 'Escuchando…' : 'Otro mensaje…'}
                maxLength={200}
                className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 outline-none focus:border-brand-400"
              />
              {dictation.supported && (
                <button
                  type="button"
                  onClick={dictation.toggle}
                  aria-label="Dictar por voz"
                  className={cn(
                    'w-10 flex items-center justify-center rounded-lg border flex-shrink-0',
                    dictation.listening
                      ? 'border-red-400 text-red-500 animate-pulse'
                      : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 hover:text-brand-600 dark:hover:text-brand-400',
                  )}
                >
                  <Mic size={16} />
                </button>
              )}
              <Button type="submit" disabled={!text.trim()} loading={send.isPending}>
                <Send size={16} />
              </Button>
            </div>
            {dictation.supported && (
              <p className="text-xs text-neutral-400 mt-1.5">
                {dictation.listening ? 'Habla ahora, se transcribe al texto.' : 'También puedes dictar por voz con el micrófono.'}
              </p>
            )}
          </form>

          <button
            onClick={() => {
              setOpen(false)
              navigate('/cocina')
            }}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <Volume2 size={14} />
            Abrir pantalla de cocina
          </button>
        </div>
      </Dialog>
    </>
  )
}
