'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Heart, ExternalLink, Trash2, Send, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'

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

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  is_mine: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  pol: 'Política', eco: 'Economía', int: 'Internacional',
  ai: 'IA', tec: 'Tecnología', dep: 'Deportes',
  cien: 'Ciencia', esp: 'Espectáculos', sal: 'Salud',
}

export function ArticleModal({ article, userId, onClose }: {
  article: Article
  userId: string | null
  onClose: () => void
}) {
  const supabase = createClient()

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Animación de entrada
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Cargar datos
  useEffect(() => {
    async function load() {
      const [{ count: likes }, { count: cCount }, likeData, commentsData] = await Promise.all([
        supabase.from('article_likes').select('*', { count: 'exact', head: true }).eq('article_url', article.source_url),
        supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('article_url', article.source_url),
        userId
          ? supabase.from('article_likes').select('id').eq('article_url', article.source_url).eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('article_comments')
          .select('id, content, created_at, user_id')
          .eq('article_url', article.source_url)
          .order('created_at', { ascending: true })
          .limit(50),
      ])
      setLikeCount(likes ?? 0)
      setCommentCount(cCount ?? 0)
      setLiked(!!likeData.data)
      setComments((commentsData.data || []).map(c => ({ ...c, is_mine: c.user_id === userId })))
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.source_url, userId])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  async function toggleLike() {
    if (!userId) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    if (wasLiked) {
      await supabase.from('article_likes').delete().eq('article_url', article.source_url).eq('user_id', userId)
    } else {
      await supabase.from('article_likes').insert({ user_id: userId, article_url: article.source_url })
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting || !userId) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('article_comments')
      .insert({ user_id: userId, article_url: article.source_url, article_title: article.title, content: newComment.trim() })
      .select().single()
    if (!error && data) {
      setComments(prev => [...prev, { ...data, is_mine: true }])
      setCommentCount(prev => prev + 1)
      setNewComment('')
    }
    setSubmitting(false)
  }

  async function deleteComment(commentId: string) {
    await supabase.from('article_comments').delete().eq('id', commentId).eq('user_id', userId!)
    setComments(prev => prev.filter(c => c.id !== commentId))
    setCommentCount(prev => prev - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel — slide up en mobile, fade+scale en desktop */}
      <div
        className={`relative w-full md:max-w-lg max-h-[96dvh] md:max-h-[90dvh] flex flex-col bg-zinc-950 rounded-t-2xl md:rounded-2xl shadow-2xl transition-all duration-300 ease-out ${visible ? 'translate-y-0 opacity-100 md:scale-100' : 'translate-y-8 opacity-0 md:scale-95 md:translate-y-0'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Imagen */}
          <div className="relative w-full aspect-[16/9] bg-zinc-900">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="100vw"
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />

            {/* Cerrar */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Categoría */}
            <div className="absolute top-3 left-3">
              {article.is_good_news ? (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">🌱 Buena noticia</span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-black/50 backdrop-blur-sm text-zinc-300">
                  {CATEGORY_LABELS[article.category] || article.category}
                </span>
              )}
            </div>
          </div>

          {/* Contenido del artículo */}
          <div className="px-4 pt-4 pb-3 space-y-3">
            <h1 className="text-white font-bold text-lg leading-snug">{article.title}</h1>

            {article.summary && (
              <p className="text-zinc-300 text-sm leading-relaxed">{article.summary}</p>
            )}

            {/* Fuente + fecha + like */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="font-medium">{article.source_name}</span>
                </a>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-600 text-xs">
                  {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: es })}
                </span>
              </div>

              <button
                onClick={toggleLike}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-red-400 transition-colors group"
              >
                <Heart className={`w-5 h-5 transition-all group-active:scale-125 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount > 0 && (
                  <span className={`text-sm font-medium ${liked ? 'text-red-400' : ''}`}>{likeCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 mx-4" />

          {/* Comentarios */}
          <div className="px-4 py-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              Comentarios{commentCount > 0 && <span className="text-zinc-500 font-normal ml-1">({commentCount})</span>}
            </h3>

            {loading && (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-zinc-800 rounded w-1/4" />
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && comments.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Sé el primero en comentar</p>
              </div>
            )}

            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {comment.is_mine ? 'Tú' : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-zinc-300">{comment.is_mine ? 'Tú' : 'Lector'}</span>
                    <span className="text-xs text-zinc-600">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed">{comment.content}</p>
                </div>
                {comment.is_mine && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Espacio para el input fijo */}
            <div className="h-4" />
          </div>
        </div>

        {/* Input comentario — fijo al fondo */}
        <form
          onSubmit={submitComment}
          className="px-4 py-3 border-t border-zinc-800 flex gap-2 items-end bg-zinc-950 flex-shrink-0"
        >
          {userId ? (
            <>
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="¿Qué piensas de esta noticia?"
                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm resize-none min-h-[40px] max-h-[100px]"
                rows={1}
                maxLength={500}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitComment(e as unknown as React.FormEvent)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="p-2 rounded-lg bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          ) : (
            <p className="text-zinc-500 text-xs text-center w-full py-1">Inicia sesión para comentar</p>
          )}
        </form>
      </div>
    </div>
  )
}
