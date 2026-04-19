'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'

// ─── Datos ────────────────────────────────────────────────────────────────────

const CITIES = [
  { id: 'cdmx', label: 'Ciudad de México' },
  { id: 'gdl',  label: 'Guadalajara' },
  { id: 'mty',  label: 'Monterrey' },
  { id: 'otra', label: 'Otra ciudad' },
]

const CATEGORIES = [
  {
    id: 'pol', label: 'Política', emoji: '🏛️',
    subtopics: ['Presidencia', 'Congreso', 'CDMX', 'Seguridad', 'Morena', 'PAN', 'PRI', 'MC'],
  },
  {
    id: 'eco', label: 'Economía', emoji: '📈',
    subtopics: ['Tipo de cambio', 'Bolsa', 'Criptomonedas', 'Nearshoring', 'Startups MX'],
  },
  {
    id: 'int', label: 'Internacional', emoji: '🌍',
    subtopics: ['EE.UU.–México', 'Europa', 'Asia', 'Conflictos', 'Diplomacia'],
  },
  {
    id: 'ai', label: 'Inteligencia Artificial', emoji: '🤖',
    subtopics: ['OpenAI', 'Anthropic', 'Google', 'Meta', 'xAI', 'Regulación', 'IA en MX'],
  },
  {
    id: 'tec', label: 'Tecnología', emoji: '💻',
    subtopics: ['Apple', 'Google', 'Redes sociales', 'Ciberseguridad', 'Startups'],
  },
  {
    id: 'dep', label: 'Deportes', emoji: '⚽',
    subtopics: ['Liga MX', 'Selección MX', 'NFL', 'F1', 'NBA', 'Box / MMA'],
  },
  {
    id: 'cien', label: 'Ciencia', emoji: '🔬',
    subtopics: ['Espacio', 'Biología', 'Física', 'Medicina del futuro'],
  },
  {
    id: 'esp', label: 'Espectáculos', emoji: '🎬',
    subtopics: ['Cine / Series', 'Música', 'Farándula MX', 'Arte', 'Libros'],
  },
  {
    id: 'sal', label: 'Salud', emoji: '🧬',
    subtopics: ['Salud pública', 'Nutrición', 'Biotech', 'Medio ambiente'],
  },
]

const NEWS_COUNT_OPTIONS = [5, 10, 20]
const HOURS = Array.from({ length: 12 }, (_, i) => i + 5) // 5am a 4pm

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  // Paso 2 — Ciudad
  const [city, setCity] = useState('')

  // Paso 3 — Intereses
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cien'])
  const [selectedSubtopics, setSelectedSubtopics] = useState<Record<string, string[]>>({})
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Paso 4 — Formato
  const [newsCount, setNewsCount] = useState(10)
  const [notifHour, setNotifHour] = useState(7)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  function toggleCategory(id: string) {
    if (id === 'cien') return // siempre activa
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  function toggleSubtopic(categoryId: string, subtopic: string) {
    setSelectedSubtopics(prev => {
      const current = prev[categoryId] || []
      return {
        ...prev,
        [categoryId]: current.includes(subtopic)
          ? current.filter(s => s !== subtopic)
          : [...current, subtopic],
      }
    })
  }

  async function handleFinish() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Guardar perfil
      await supabase.from('users').upsert({
        id: user.id,
        city,
        notif_hour: notifHour,
        audio_enabled: audioEnabled,
      })

      // Guardar preferencias
      type Pref = { user_id: string; category: string; subcategory?: string; weight: number }
      const prefs: Pref[] = selectedCategories.flatMap(catId => {
        const subs = selectedSubtopics[catId] || []
        if (subs.length === 0) return [{ user_id: user.id, category: catId, weight: 1.0 }]
        return subs.map(sub => ({ user_id: user.id, category: catId, subcategory: sub.toLowerCase(), weight: 1.0 }))
      })

      if (prefs.length > 0) {
        await supabase.from('user_preferences').insert(prefs)
      }

      router.push('/feed')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 max-w-lg mx-auto w-full">
        <div className="text-2xl font-black tracking-tighter mb-4">
          brief<span className="text-red-500">.</span>mx
        </div>
        <Progress value={progress} className="h-1 bg-zinc-800 [&>div]:bg-red-500" />
        <p className="text-xs text-zinc-500 mt-2">Paso {step} de {totalSteps}</p>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* ── Paso 1: Ciudad ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">¿Desde dónde nos lees?</h1>
              <p className="text-zinc-400 text-sm mt-1">Personalizamos noticias locales según tu ciudad.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CITIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCity(c.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    city === c.id
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <span className="font-medium text-sm">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Paso 2: Intereses ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">¿Qué te interesa?</h1>
              <p className="text-zinc-400 text-sm mt-1">Elige temas y expándelos para afinar subtemas.</p>
            </div>
            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat.id)
                const isLocked = cat.id === 'cien'
                const isExpanded = expandedCategory === cat.id
                const subCount = (selectedSubtopics[cat.id] || []).length

                return (
                  <div key={cat.id} className={`rounded-xl border transition-all ${
                    isSelected ? 'border-red-500/50 bg-zinc-900' : 'border-zinc-800 bg-zinc-900'
                  }`}>
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'border-red-500 bg-red-500' : 'border-zinc-600'
                        } ${isLocked ? 'opacity-60 cursor-default' : ''}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      <span className="text-lg">{cat.emoji}</span>
                      <span className="flex-1 font-medium text-sm">{cat.label}</span>

                      {isLocked && (
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">Siempre</Badge>
                      )}
                      {subCount > 0 && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">{subCount}</Badge>
                      )}

                      {isSelected && (
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {isSelected && isExpanded && (
                      <div className="px-3 pb-3 flex flex-wrap gap-2">
                        {cat.subtopics.map(sub => {
                          const active = (selectedSubtopics[cat.id] || []).includes(sub)
                          return (
                            <button
                              key={sub}
                              onClick={() => toggleSubtopic(cat.id, sub)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                active
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                              }`}
                            >
                              {sub}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Paso 3: Formato ── */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold">Tu formato ideal</h1>
              <p className="text-zinc-400 text-sm mt-1">Así recibirás tu noticiero cada día.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">Noticias por día</p>
              <div className="flex gap-3">
                {NEWS_COUNT_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setNewsCount(n)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-lg transition-all ${
                      newsCount === n
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">Hora de notificación matutina</p>
              <div className="grid grid-cols-4 gap-2">
                {HOURS.map(h => (
                  <button
                    key={h}
                    onClick={() => setNotifHour(h)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      notifHour === h
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {h}:00
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900">
              <div>
                <p className="font-medium text-sm">Audio diario</p>
                <p className="text-xs text-zinc-500 mt-0.5">Resumen narrado de 6-7 minutos</p>
              </div>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors overflow-hidden ${audioEnabled ? 'bg-red-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${audioEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 4: Confirmación ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Todo listo 🎉</h1>
              <p className="text-zinc-400 text-sm mt-1">Así quedó tu perfil de brief.mx</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Ciudad</p>
                <p className="font-medium">{CITIES.find(c => c.id === city)?.label}</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Intereses</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(id => {
                    const cat = CATEGORIES.find(c => c.id === id)
                    return (
                      <span key={id} className="px-2 py-1 rounded-full bg-zinc-800 text-xs font-medium">
                        {cat?.emoji} {cat?.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Formato</p>
                <p className="font-medium">{newsCount} noticias · {notifHour}:00 am · Audio {audioEnabled ? 'activado' : 'desactivado'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con botones */}
      <div className="px-4 pb-8 pt-4 max-w-lg mx-auto w-full flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-900"
            onClick={() => setStep(s => s - 1)}
          >
            Atrás
          </Button>
        )}
        <Button
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
          onClick={() => {
            if (step < totalSteps) {
              setTransitioning(true)
              setStep(s => s + 1)
              setTimeout(() => setTransitioning(false), 400)
            } else {
              handleFinish()
            }
          }}
          disabled={(step === 1 && !city) || (step === 2 && selectedCategories.length === 0) || saving || transitioning}
        >
          {saving ? 'Guardando...' : step === totalSteps ? 'Ir al feed →' : 'Continuar'}
        </Button>
      </div>
    </main>
  )
}
