'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, Send, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  is_mine: boolean
}

interface SocialBarProps {
  articleUrl: string
  articleTitle: string
  userId: string | null
}

export function SocialBar({ articleUrl, articleTitle, userId }: SocialBarProps) {
  const supabase = createClient()

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Cargar conteos y estado de like (sin llamar getUser)
  useEffect(() => {
    async function init() {
      const [{ count: total }, { count: cTotal }, likeData] = await Promise.all([
        supabase.from('article_likes').select('*', { count: 'exact', head: true }).eq('article_url', articleUrl),
        supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('article_url', articleUrl),
        userId
          ? supabase.from('article_likes').select('id').eq('article_url', articleUrl).eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setLikeCount(total ?? 0)
      setCommentCount(cTotal ?? 0)
      setLiked(!!likeData.data)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleUrl, userId])

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return

    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)

    if (wasLiked) {
      await supabase.from('article_likes').delete()
        .eq('article_url', articleUrl)
        .eq('user_id', userId)
    } else {
      await supabase.from('article_likes').insert({
        user_id: userId,
        article_url: articleUrl,
      })
    }
  }

  async function openComments(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setShowComments(true)
    setLoadingComments(true)

    const { data } = await supabase
      .from('article_comments')
      .select('id, content, created_at, user_id')
      .eq('article_url', articleUrl)
      .order('created_at', { ascending: false })
      .limit(50)

    setComments((data || []).map(c => ({ ...c, is_mine: c.user_id === userId })))
    setLoadingComments(false)
    setTimeout(() => textareaRef.current?.focus(), 300)
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting || !userId) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('article_comments')
      .insert({
        user_id: userId,
        article_url: articleUrl,
        article_title: articleTitle,
        content: newComment.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setComments(prev => [{ ...data, is_mine: true }, ...prev])
      setCommentCount(prev => prev + 1)
      setNewComment('')
    }
    setSubmitting(false)
  }

  async function deleteComment(commentId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('article_comments').delete().eq('id', commentId).eq('user_id', userId!)
    setComments(prev => prev.filter(c => c.id !== commentId))
    setCommentCount(prev => prev - 1)
  }

  return (
    <>
      {/* Barra de acciones */}
      <div className="flex items-center gap-4 px-1 pt-1 pb-0.5">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-red-400 transition-colors group"
        >
          <Heart className={`w-4 h-4 transition-all group-active:scale-125 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
          {likeCount > 0 && (
            <span className={`text-xs font-medium ${liked ? 'text-red-400' : ''}`}>{likeCount}</span>
          )}
        </button>

        <button
          onClick={openComments}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 && (
            <span className="text-xs font-medium">{commentCount}</span>
          )}
        </button>
      </div>

      {/* Panel de comentarios */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowComments(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-zinc-900 rounded-t-2xl max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-semibold text-white text-sm">Comentarios</h3>
                <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{articleTitle}</p>
              </div>
              <button onClick={() => setShowComments(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {loadingComments && (
                <div className="space-y-3">
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

              {!loadingComments && comments.length === 0 && (
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
                      <span className="text-xs font-semibold text-zinc-300">
                        {comment.is_mine ? 'Tú' : 'Lector'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed">{comment.content}</p>
                  </div>
                  {comment.is_mine && (
                    <button
                      onClick={(e) => deleteComment(comment.id, e)}
                      className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={submitComment} className="px-4 py-3 border-t border-zinc-800 flex gap-2 items-end">
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
            </form>
          </div>
        </div>
      )}
    </>
  )
}
