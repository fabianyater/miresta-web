import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Bell, RotateCcw, ChefHat } from 'lucide-react'
import { kitchenApi } from '@/api/kitchen'
import type { KitchenMessageResponse } from '@/types'
import { cn } from '@/lib/utils'

const POLL_MS = 4000
const MAX_KEEP = 40

const WARN_AFTER = 60 // s — el mensaje pasa a ámbar
const URGENT_AFTER = 180 // s — pasa a rojo

function ageSeconds(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
}

function relativeTime(s: number) {
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  return `hace ${Math.floor(m / 60)} h ${m % 60} min`
}

function clockLabel(now: number) {
  return new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * Pantalla para el PC de la cocina: se deja abierta siempre. Cada mensaje nuevo de
 * sala suena un tono y se lee en voz alta por el parlante del PC, además de quedar en
 * el feed en letra grande. El navegador no deja sonar audio hasta que alguien toque
 * "Activar sonido" una vez (política de autoplay).
 */
export default function CocinaPage() {
  const [messages, setMessages] = useState<KitchenMessageResponse[]>([])
  const [audioReady, setAudioReady] = useState(false)
  const [muted, setMuted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [online, setOnline] = useState(true)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const sinceRef = useRef<string | undefined>(undefined)
  const liveRef = useRef(false)

  useEffect(() => {
    liveRef.current = audioReady && !muted
  }, [audioReady, muted])

  // Reloj + edad de los mensajes, refrescados cada segundo.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() ?? []
    const es = voices.filter((v) => v.lang.toLowerCase().startsWith('es'))
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
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new Ctx()
      void audioCtxRef.current.resume()
    } catch {
      /* sin WebAudio: seguimos igual, solo sin tono */
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
      pickVoice()
    }
    setAudioReady(true)
  }, [pickVoice])

  // Sondeo: primer llamado sin `since` (historial, no se lee); luego solo lo nuevo.
  useEffect(() => {
    let stop = false

    const tick = async () => {
      try {
        const batch = await kitchenApi.list(sinceRef.current)
        setOnline(true)
        if (stop || batch.length === 0) return
        const isFirstLoad = sinceRef.current === undefined
        sinceRef.current = batch[batch.length - 1].createdAt
        setMessages((prev) => [...batch].reverse().concat(prev).slice(0, MAX_KEEP))
        if (!isFirstLoad && liveRef.current) {
          chime()
          batch.forEach((m) => speak(m.text))
        }
      } catch {
        setOnline(false)
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
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      <header className="flex items-center justify-between gap-4 px-5 md:px-8 h-16 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold tracking-tight leading-none">COCINA</p>
            <p className="text-xs text-neutral-500 leading-none mt-1">
              {messages.length} mensaje{messages.length === 1 ? '' : 's'}
            </p>
          </div>
          <span
            className={cn(
              'ml-2 w-2 h-2 rounded-full',
              online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500',
            )}
            title={online ? 'En línea' : 'Sin conexión'}
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tabular-nums text-neutral-300">{clockLabel(now)}</span>
          {audioReady && (
            <button
              onClick={() => setMuted((m) => !m)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border',
                muted
                  ? 'border-neutral-700 text-neutral-400'
                  : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
              )}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {muted ? 'Silencio' : 'Sonido'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        {!audioReady && (
          <button
            onClick={enableAudio}
            className="w-full mb-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xl font-bold py-7 flex items-center justify-center gap-3 shadow-lg shadow-brand-500/20"
          >
            <Bell size={26} />
            Activar sonido
          </button>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-neutral-600 py-28 gap-3">
            <Bell size={40} strokeWidth={1.5} />
            <p className="text-lg">Sin mensajes de sala.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const age = ageSeconds(m.createdAt, now)
              const tone =
                age >= URGENT_AFTER ? 'urgent' : age >= WARN_AFTER ? 'warn' : 'fresh'
              const isNew = age < 12
              return (
                <li
                  key={m.id}
                  className={cn(
                    'relative rounded-2xl border bg-neutral-900 pl-5 pr-4 py-4 flex items-center justify-between gap-4 overflow-hidden transition-colors',
                    tone === 'urgent'
                      ? 'border-red-500/50'
                      : tone === 'warn'
                        ? 'border-amber-500/40'
                        : 'border-neutral-800',
                    isNew && 'ring-2 ring-brand-400/70',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 inset-y-0 w-1.5',
                      tone === 'urgent'
                        ? 'bg-red-500'
                        : tone === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-3xl md:text-4xl font-semibold leading-tight break-words">{m.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-medium">
                        {m.sentBy}
                      </span>
                      <span
                        className={cn(
                          'font-medium tabular-nums',
                          tone === 'urgent'
                            ? 'text-red-400'
                            : tone === 'warn'
                              ? 'text-amber-400'
                              : 'text-neutral-500',
                        )}
                      >
                        {relativeTime(age)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      chime()
                      speak(m.text)
                    }}
                    disabled={!audioReady || muted}
                    className="flex-shrink-0 w-14 h-14 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center disabled:opacity-30"
                    aria-label="Repetir en voz alta"
                  >
                    <RotateCcw size={22} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
