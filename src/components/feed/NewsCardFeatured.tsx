import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import { SocialBar } from './SocialBar'

interface Article {
  id: string
  title: string
  summary: string
  source_name: string
  source_url: string
  image_url: string
  published_at: string
  category: string
  is_good_news: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  pol: 'Política', eco: 'Economía', int: 'Internacional',
  ai: 'IA', tec: 'Tecnología', dep: 'Deportes',
  cien: 'Ciencia', esp: 'Espectáculos', sal: 'Salud',
}

export function NewsCardFeatured({
  article,
  userId,
  onSelect,
}: {
  article: Article
  userId: string | null
  onSelect: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: es })

  return (
    <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all">

      {/* Imagen — clickeable para abrir modal */}
      <button
        onClick={onSelect}
        className="block w-full text-left active:scale-[0.99] transition-transform"
      >
        {/* Imagen grande */}
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />

          {/* Badge categoría */}
          <div className="absolute top-3 left-3">
            {article.is_good_news ? (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                🌱 Buena noticia
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-black/50 backdrop-blur-sm text-zinc-300">
                {CATEGORY_LABELS[article.category] || article.category}
              </span>
            )}
          </div>
        </div>

        {/* Texto */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          <h2 className="text-white font-bold text-base leading-snug">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-zinc-400 text-sm leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>
      </button>

      {/* Fuente + fecha + social (no abren el modal) */}
      <div className="px-4 pb-3 space-y-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{article.source_name}</span>
          </a>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500 text-xs">{timeAgo}</span>
        </div>
        <SocialBar articleUrl={article.source_url} articleTitle={article.title} userId={userId} />
      </div>
    </div>
  )
}
