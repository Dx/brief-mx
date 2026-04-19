import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
}

// GET — comentarios de un artículo
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const articleUrl = searchParams.get('url')
  if (!articleUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const supabase = await getSupabase()

  const { data: comments, error } = await supabase
    .from('article_comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      users:user_id (
        id
      )
    `)
    .eq('article_url', articleUrl)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()

  const result = (comments || []).map((c: {
    id: string
    content: string
    created_at: string
    user_id: string
  }) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    is_mine: user?.id === c.user_id,
  }))

  return NextResponse.json({ comments: result, currentUserId: user?.id ?? null })
}

// POST — nuevo comentario
export async function POST(request: Request) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { articleUrl, articleTitle, content } = await request.json()
  if (!articleUrl || !content?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('article_comments')
    .insert({
      user_id: user.id,
      article_url: articleUrl,
      article_title: articleTitle,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}

// DELETE — borrar comentario propio
export async function DELETE(request: Request) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { commentId } = await request.json()
  await supabase.from('article_comments').delete().eq('id', commentId).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
