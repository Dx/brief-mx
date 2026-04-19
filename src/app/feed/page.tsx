'use client'

import { useEffect, useState, useCallback } from 'react'
import { NewsCardFeatured } from '@/components/feed/NewsCardFeatured'
import { NewsCardCompact } from '@/components/feed/NewsCardCompact'
import { CiudadBar } from '@/components/feed/CiudadBar'
import { ArticleModal } from '@/components/feed/ArticleModal'
import { createClient } from '@/lib/supabase'

const CATEGORIES = [
  { id: 'all',  label: 'Todo' },
  { id: 'pol',  label: '🏛️ Política' },
  { id: 'eco',  label: '📈 Economía' },
  { id: 'int',  label: '🌍 Internacional' },
  { id: 'ai',   label: '🤖 IA' },
  { id: 'tec',  label: '💻 Tecnología' },
  { id: 'dep',  label: '⚽ Deportes' },
  { id: 'cien', label: '🔬 Ciencia' },
  { id: 'esp',  label: '🎬 Espectáculos' },
  { id: 'sal',  label: '🧬 Salud' },
]

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

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const fetchFeed = useCallback(async (category: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/feed?category=${category}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setArticles(data.articles)
    } catch (e) {
      setError('No se pudieron cargar las noticias. Intenta de nuevo.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(activeCategory)
  }, [activeCategory, fetchFeed])

  const featured = articles.slice(0, 1)
  const compact  = articles.slice(1)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter">
            brief<span className="text-red-500">.</span>mx
          </span>
          <span className="text-xs text-zinc-500">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Ciudad CDMX */}
        <CiudadBar />

        {/* Category chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-20">

        {loading && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 animate-pulse">
              <div className="w-full aspect-[16/9] bg-zinc-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                  <div className="h-4 bg-zinc-800 rounded w-full" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                </div>
                <div className="w-20 h-20 bg-zinc-800 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20 space-y-3">
            <p className="text-zinc-400">{error}</p>
            <button
              onClick={() => fetchFeed(activeCategory)}
              className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {featured.map(article => (
              <NewsCardFeatured
                key={article.id}
                article={article}
                userId={userId}
                onSelect={() => setSelectedArticle(article)}
              />
            ))}

            {compact.length > 0 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600">Más noticias</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            )}

            {compact.map(article => (
              <NewsCardCompact
                key={article.id}
                article={article}
                userId={userId}
                onSelect={() => setSelectedArticle(article)}
              />
            ))}

            {articles.length === 0 && (
              <div className="text-center py-20">
                <p className="text-zinc-500">No hay noticias disponibles.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de artículo */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          userId={userId}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  )
}
