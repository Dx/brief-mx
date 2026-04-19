import { NextResponse } from 'next/server'

// Hoy No Circula CDMX — por terminal de placa (lunes a viernes)
const NO_CIRCULA: Record<number, { digitos: string; emoji: string }> = {
  1: { digitos: '5 y 6', emoji: '🚗' },
  2: { digitos: '7 y 8', emoji: '🚗' },
  3: { digitos: '3 y 4', emoji: '🚗' },
  4: { digitos: '1 y 2', emoji: '🚗' },
  5: { digitos: '9 y 0', emoji: '🚗' },
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Despejado'
  if (code === 1) return 'Mayorm. despejado'
  if (code === 2) return 'Parcialm. nublado'
  if (code === 3) return 'Nublado'
  if (code <= 48) return 'Neblina'
  if (code <= 55) return 'Llovizna'
  if (code <= 67) return 'Lluvia'
  if (code <= 82) return 'Chubascos'
  return 'Tormenta'
}

function getAQIInfo(aqi: number) {
  if (aqi <= 50)  return { label: 'Buena',     color: 'emerald', contingencia: false }
  if (aqi <= 100) return { label: 'Aceptable', color: 'yellow',  contingencia: false }
  if (aqi <= 150) return { label: 'Regular',   color: 'orange',  contingencia: false }
  if (aqi <= 200) return { label: 'Mala',      color: 'red',     contingencia: true  }
  return               { label: 'Muy mala',   color: 'purple',  contingencia: true  }
}

export async function GET() {
  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332&current=temperature_2m,apparent_temperature,weather_code&timezone=America%2FMexico_City&forecast_days=1',
        { next: { revalidate: 1800 } } // cache 30 min
      ),
      fetch(
        'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.4326&longitude=-99.1332&current=us_aqi,pm2_5&timezone=America%2FMexico_City',
        { next: { revalidate: 1800 } }
      ),
    ])

    const weather = await weatherRes.json()
    const aqiData = await aqiRes.json()

    const temp       = Math.round(weather.current.temperature_2m)
    const feelsLike  = Math.round(weather.current.apparent_temperature)
    const weatherCode = weather.current.weather_code as number
    const aqi        = Math.round(aqiData.current.us_aqi ?? 0)
    const aqiInfo    = getAQIInfo(aqi)

    // Calcular día en timezone CDMX (UTC-6)
    const nowCDMX   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    const dayOfWeek = nowCDMX.getDay() // 0=Dom, 1=Lun…6=Sáb
    const noCircula  = NO_CIRCULA[dayOfWeek] ?? null  // null en fin de semana

    return NextResponse.json({
      temp,
      feelsLike,
      weatherEmoji: getWeatherEmoji(weatherCode),
      weatherLabel: getWeatherLabel(weatherCode),
      aqi,
      aqiLabel:     aqiInfo.label,
      aqiColor:     aqiInfo.color,
      contingencia: aqiInfo.contingencia,
      noCircula,    // null si es fin de semana
    })
  } catch (err) {
    console.error('Ciudad API error:', err)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
