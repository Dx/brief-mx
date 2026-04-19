'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface AudioPlayerProps {
  title: string
  summary: string
}

export function AudioPlayer({ title, summary }: AudioPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'unsupported'>('idle')
  const [progress, setProgress] = useState(0)
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const charIndexRef = useRef(0)

  const text = `${title}. ${summary}`
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Cleanup al cerrar
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function pickSpanishVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    // Preferimos voces en español de México o latinoamérica
    return (
      voices.find(v => v.lang === 'es-MX') ||
      voices.find(v => v.lang === 'es-US') ||
      voices.find(v => v.lang.startsWith('es-') && v.localService) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null
    )
  }

  function startSpeaking(fromChar = 0) {
    window.speechSynthesis.cancel()

    const utter = new SpeechSynthesisUtterance(text.slice(fromChar))
    utter.lang = 'es-MX'
    utter.rate = 1.05
    utter.pitch = 1.0

    const voice = pickSpanishVoice()
    if (voice) utter.voice = voice

    utter.onstart = () => {
      setStatus('playing')
      // Simulamos progreso por tiempo (SpeechSynthesis no da posición exacta)
      const estimatedDuration = (text.length / 15) * 1000 // ~15 chars/seg
      const startTime = Date.now() - (fromChar / text.length) * estimatedDuration
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const p = Math.min(elapsed / estimatedDuration, 1)
        setProgress(p)
        if (p >= 1 && intervalRef.current) clearInterval(intervalRef.current)
      }, 100)
    }
    utter.onboundary = (e) => {
      charIndexRef.current = fromChar + (e.charIndex ?? 0)
    }
    utter.onend = () => {
      setStatus('idle')
      setProgress(0)
      charIndexRef.current = 0
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    utter.onerror = () => {
      setStatus('idle')
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    uttRef.current = utter
    window.speechSynthesis.speak(utter)
  }

  function handleToggle() {
    if (!supported) return

    if (status === 'playing') {
      window.speechSynthesis.pause()
      setStatus('paused')
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else if (status === 'paused') {
      window.speechSynthesis.resume()
      setStatus('playing')
      // Reanudar progreso
      const remaining = (1 - progress) * (text.length / 15) * 1000
      const startTime = Date.now() - progress * (text.length / 15) * 1000
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const p = Math.min(elapsed / (text.length / 15 * 1000), 1)
        setProgress(p)
        if (p >= 1 && intervalRef.current) clearInterval(intervalRef.current)
      }, 100)
      void remaining
    } else {
      // Cargar voces (puede que no estén listas al primer render)
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => startSpeaking()
      }
      startSpeaking()
    }
  }

  if (!supported) return null

  const isPlaying = status === 'playing'
  const isActive  = status === 'playing' || status === 'paused'

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
      isActive ? 'bg-zinc-800' : 'bg-zinc-800/50 hover:bg-zinc-800'
    }`}>
      {/* Botón play/pause */}
      <button
        onClick={handleToggle}
        className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
      >
        {isPlaying
          ? <Pause className="w-4 h-4 text-white" />
          : <Play  className="w-4 h-4 text-white ml-0.5" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          {isActive
            ? <Volume2 className="w-3 h-3 text-red-400 flex-shrink-0" />
            : <VolumeX className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          }
          <span className="text-xs text-zinc-400 truncate">
            {isPlaying ? 'Escuchando…' : status === 'paused' ? 'Pausado' : 'Escuchar resumen'}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
