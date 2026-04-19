'use client'

import { useEffect, useState } from 'react'
import { Wind, Car, CheckCircle2, AlertTriangle } from 'lucide-react'

interface CiudadData {
  temp: number
  feelsLike: number
  weatherEmoji: string
  weatherLabel: string
  aqi: number
  aqiLabel: string
  aqiColor: string
  contingencia: boolean
  noCircula: { digitos: string; emoji: string } | null
}

export function CiudadBar() {
  const [data, setData] = useState<CiudadData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ciudad')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 h-7 w-28 rounded-full bg-zinc-900 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const aqiColorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    yellow:  'text-yellow-400',
    orange:  'text-orange-400',
    red:     'text-red-400',
    purple:  'text-purple-400',
  }
  const aqiTextColor = aqiColorMap[data.aqiColor] ?? 'text-zinc-400'

  return (
    <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">

      {/* Clima */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
        <span className="text-base leading-none">{data.weatherEmoji}</span>
        <span className="text-white text-xs font-semibold">{data.temp}°</span>
        <span className="text-zinc-500 text-xs">{data.weatherLabel}</span>
        {data.feelsLike !== data.temp && (
          <span className="text-zinc-600 text-xs">· ST {data.feelsLike}°</span>
        )}
      </div>

      {/* Calidad del aire / Contingencia */}
      {data.contingencia ? (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-800">
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-xs font-semibold">Contingencia ambiental</span>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <Wind className={`w-3 h-3 flex-shrink-0 ${aqiTextColor}`} />
          <span className="text-zinc-500 text-xs">Aire:</span>
          <span className={`text-xs font-medium ${aqiTextColor}`}>{data.aqiLabel}</span>
        </div>
      )}

      {/* Hoy No Circula */}
      {data.noCircula ? (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <Car className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <span className="text-zinc-500 text-xs">No circula:</span>
          <span className="text-white text-xs font-semibold">{data.noCircula.digitos}</span>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 text-xs font-medium">Circulan todos</span>
        </div>
      )}

    </div>
  )
}
