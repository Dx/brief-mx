import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CATEGORY_QUERIES: Record<string, string> = {
  pol: 'política México gobierno',
  eco: 'economía finanzas México peso',
  int: 'internacional México diplomacia',
  ai:  'inteligencia artificial IA',
  tec: 'tecnología Apple Google',
  dep: 'deportes Liga MX fútbol',
  cien: 'ciencia descubrimiento',
  esp: 'entretenimiento cine música',
  sal: 'salud medicina México',
}

const SYSTEM_PROMPT = `Eres un periodista mexicano. Tu única tarea es escribir un resumen noticioso en español neutro.

Reglas:
- Exactamente entre 70 y 90 palabras
- Un párrafo continuo, sin saltos de línea
- Solo hechos verificables del artículo
- Sin opinión, sin comentario editorial
- Sin frases introductorias como "El artículo trata de..." o "En esta nota..."
- Termina siempre con una oración completa, nunca con puntos suspensivos ni texto cortado
- Escribe directamente la noticia como si fuera el primer párrafo de una nota periodística`

// Obtiene el texto completo del artículo vía Jina AI Reader (gratuito, sin API key)
async function fetchFullContent(url: string): Promise<string> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return ''
    const text = await res.text()
    // Jina devuelve markdown — limpiamos metadatos del encabezado y tomamos hasta 3000 chars
    const body = text.replace(/^(?:Title:|URL:|Published|Author|Description)[^\n]*\n/gim, '').trim()
    return body.slice(0, 3000)
  } catch {
    return ''
  }
}

async function generateSummary(
  title: string,
  description: string | null,
  content: string | null,
  sourceUrl: string,
): Promise<string> {
  const fallback = description?.replace(/\[\+\d+\s*chars?\]/gi, '').trim()
               || content?.replace(/\[\+\d+\s*chars?\]/gi, '').trim()?.slice(0, 200)
               || ''
  try {
    // Primero intentamos obtener el artículo completo
    const fullContent = await fetchFullContent(sourceUrl)

    const userContent = [
      `Título: ${title}`,
      fullContent
        ? `Contenido completo del artículo:\n${fullContent}`
        : [
            description ? `Descripción: ${description}` : '',
            content     ? `Fragmento: ${content}`        : '',
          ].filter(Boolean).join('\n\n'),
    ].filter(Boolean).join('\n\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return text || fallback
  } catch (err) {
    console.error('Claude summary error:', err)
    return fallback
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'all'

  try {
    let url: string

    const q = category === 'all'
      ? 'México noticias hoy'
      : (CATEGORY_QUERIES[category] || 'México noticias')

    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=es&sortBy=publishedAt&pageSize=10&apiKey=${NEWSAPI_KEY}`

    const res = await fetch(url, { next: { revalidate: 900 } }) // cache 15 min
    const data = await res.json()

    if (data.status !== 'ok') {
      return NextResponse.json({ error: data.message }, { status: 400 })
    }

    // Filtrar artículos sin imagen o sin contenido, máximo 5
    const filtered = (data.articles as NewsAPIArticle[])
      .filter(a => a.urlToImage && a.title && !a.title.includes('[Removed]'))
      .slice(0, 5)

    // Generar resúmenes con Claude para todos en paralelo
    const summaries = await Promise.all(
      filtered.map(a => generateSummary(a.title, a.description, a.content, a.url))
    )

    const articles = filtered.map((a, i) => ({
      id: `${i}-${Date.now()}`,
      title: a.title,
      summary: summaries[i] || a.description?.replace(/\[\+\d+\s*chars?\]/gi, '').trim() || '',
      source_name: a.source?.name || '',
      source_url: a.url,
      image_url: a.urlToImage,
      published_at: a.publishedAt,
      category: category === 'all' ? guessCategory(a.title + ' ' + (a.description || '')) : category,
      is_good_news: category === 'cien',
    }))

    return NextResponse.json({ articles })
  } catch (err) {
    console.error('Feed error:', err)
    return NextResponse.json({ error: 'Error fetching news' }, { status: 500 })
  }
}

function guessCategory(text: string): string {
  const t = text.toLowerCase()
  // Política — alta prioridad, términos muy específicos
  if (t.match(/mañanera|sheinbaum|presidenta|presidente|congreso|senado|morena|gobierno federal|secretar[ií]a|diputad|partidos políticos|claudia/)) return 'pol'
  // IA — términos técnicos específicos
  if (t.match(/inteligencia artificial|openai|anthropic|chatgpt|deepmind|gemini|llm|modelo de lenguaje/)) return 'ai'
  // Economía
  if (t.match(/tipo de cambio|peso mexicano|bolsa de valores|inflaci[oó]n|banco de méxico|finanzas|pib|aranceles|inversión/)) return 'eco'
  // Deportes — solo términos inequívocos
  if (t.match(/liga mx|selección mexicana|selección nacional|nfl|fórmula 1\b|gran premio|nba|champions league|mundial|gol|partido de fútbol|deport/)) return 'dep'
  // Tecnología
  if (t.match(/iphone|apple\b|google\b|microsoft|android|startup|ciberseguridad|red social|tiktok|meta\b/)) return 'tec'
  // Ciencia
  if (t.match(/descubrimiento científico|nasa|espacio exterior|investigaci[oó]n científica|astro|planeta|gen[eé]tica|vacuna|biolog[ií]a/)) return 'cien'
  // Salud
  if (t.match(/salud p[uú]blica|hospital|m[eé]dico|enfermedad|pandemia|imss|issste|nutrici[oó]n/)) return 'sal'
  // Espectáculos
  if (t.match(/cine|pel[ií]cula|serie|netflix|spotify|concierto|far[aá]ndula|actor|actriz|música/)) return 'esp'
  // Internacional
  if (t.match(/estados unidos|trump|europa|china|rusia|diplomacia|acuerdo internacional|onu|g20/)) return 'int'
  // Política general como fallback si hay términos vagos
  if (t.match(/gobierno|político|ley |decreto|reforma|ministro|secretario/)) return 'pol'
  return 'int'
}

interface NewsAPIArticle {
  title: string
  description: string | null
  content: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  source: { name: string }
}
