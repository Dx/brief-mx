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

export function NewsCardCompact({
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
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all p-3 space-y-2">

      {/* Área clickeable → abre modal */}
      <button
        onClick={onSelect}
        className="flex gap-3 w-full text-left active:scale-[0.99] transition-transform"
      >
        {/* Texto */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            {article.is_good_news ? (
              <span className="text-xs font-semibold text-emerald-400">🌱 Ciencia</span>
            ) : (
              <span className="text-xs font-medium text-zinc-500">
                {CATEGORY_LABELS[article.category] || article.category}
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-zinc-400 text-xs leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>

        {/* Imagen */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 self-start">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="80px"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      </button>

      {/* Fuente + fecha + social (no abren el modal) */}
      <div onClick={e => e.stopPropagation()} className="space-y-1.5">
        <div className="flex items-center gap-2 px-1">
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
