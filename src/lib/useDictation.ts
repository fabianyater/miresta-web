import { useEffect, useRef, useState } from 'react'

type WindowWithSR = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getCtor() {
  if (typeof window === 'undefined') return undefined
  const w = window as WindowWithSR
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/**
 * Dictado por voz con la API del navegador (Chrome/Android; no iOS Safari). Llama a
 * `onText` con la transcripción — el texto va al campo del mensaje para revisarlo
 * antes de enviar. Luego la pantalla de cocina lo dicta con voz sintética.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const supported = getCtor() !== undefined

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        /* noop */
      }
    },
    [],
  )

  const toggle = () => {
    const Ctor = getCtor()
    if (!Ctor) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new Ctor()
    rec.lang = 'es-CO'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      onText(transcript.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return { supported, listening, toggle }
}
