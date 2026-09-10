import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { kitchenApi } from '@/api/kitchen'
import type { KitchenMessageResponse } from '@/types'

const POLL_MS = 4000
const MAX_KEEP = 40

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'ahora'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  return `hace ${Math.floor(m / 60)} h`
}

/**
 * Pantalla para el PC de la cocina: se deja abierta siempre. Cada mensaje nuevo de
 * sala suena un tono y se lee en voz alta por el parlante del PC, además de quedar en
 * el feed en letra grande. El navegador no deja sonar audio hasta que alguien toque
 * "Activar sonido" una vez (política de autoplay).
 */
export default function CocinaPage() {
  const [messages, setMessages] = useState<KitchenMessageResponse[]>([])
  const [audioOn, setAudioOn] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const sinceRef = useRef<string | undefined>(undefined)
  const audioOnRef = useRef(false)
  const primedRef = useRef(false)

  useEffect(() => {
    audioOnRef.current = audioOn
  }, [audioOn])

  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() ?? []
    const es = voices.filter((v) => v.lang.toLowerCase().startsWith('es'))
    // Prioriza una voz que funcione sin internet (localService); si no, cae a la de
    // Colombia/México (aunque sea "online") y por último cualquiera en español.
    voiceRef.current =
      es.find((v) => v.localService && (v.lang === 'es-CO' || v.lang === 'es-MX')) ??
      es.find((v) => v.localService) ??
      es.find((v) => v.lang === 'es-CO') ??
      es.find((v) => v.lang === 'es-MX') ??
      es[0] ??
      null
  }, [])

  useEffect(() => {
    if (!window.speechSynthesis) return
    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
  }, [pickVoice])

  const chime = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = voiceRef.current?.lang ?? 'es-CO'
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  }, [])

  const enableAudio = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new Ctx()
      void audioCtxRef.current.resume()
    } catch {
      /* sin WebAudio: seguimos igual, solo sin tono */
    }
    // "Desbloquea" la síntesis de voz con una expresión vacía dentro del gesto del usuario.
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
      pickVoice()
    }
    primedRef.current = true
    setAudioOn(true)
  }, [pickVoice])

  // Sondeo: primer llamado sin `since` (historial, no se lee); luego solo lo nuevo.
  useEffect(() => {
    let stop = false

    const tick = async () => {
      try {
        const batch = await kitchenApi.list(sinceRef.current)
        if (stop || batch.length === 0) return
        const isFirstLoad = sinceRef.current === undefined
        sinceRef.current = batch[batch.length - 1].createdAt
        setMessages((prev) => [...batch].reverse().concat(prev).slice(0, MAX_KEEP))

        if (!isFirstLoad && audioOnRef.current) {
          chime()
          batch.forEach((m) => speak(m.text))
        }
      } catch {
        /* un fallo de red no debe matar el sondeo */
      }
    }

    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [chime, speak])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cocina</h1>
        {audioOn ? (
          <span className="flex items-center gap-2 text-sm text-status-free">
            <Volume2 size={18} />
            Sonido activo
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-neutral-400">
            <VolumeX size={18} />
            Sin sonido
          </span>
        )}
      </div>

      {!audioOn && (
        <button
          onClick={enableAudio}
          className="w-full mb-6 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xl font-bold py-8 flex items-center justify-center gap-3"
        >
          <Volume2 size={28} />
          Activar sonido
        </button>
      )}

      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-neutral-500 py-20 text-lg">Sin mensajes todavía.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-2xl md:text-3xl font-semibold leading-tight">{m.text}</p>
              <p className="text-sm text-neutral-500 mt-1">
                {m.sentBy} · {timeAgo(m.createdAt)}
              </p>
            </div>
            <button
              onClick={() => {
                if (!audioOnRef.current) return
                chime()
                speak(m.text)
              }}
              disabled={!audioOn}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center disabled:opacity-40"
              aria-label="Repetir"
            >
              <Volume2 size={22} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
