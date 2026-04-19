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

// GET — likes count + si el usuario ya dio like
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const articleUrl = searchParams.get('url')
  if (!articleUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { count } = await supabase
    .from('article_likes')
    .select('*', { count: 'exact', head: true })
    .eq('article_url', articleUrl)

  let liked = false
  if (user) {
    const { data } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_url', articleUrl)
      .eq('user_id', user.id)
      .single()
    liked = !!data
  }

  return NextResponse.json({ count: count ?? 0, liked })
}

// POST — toggle like
export async function POST(request: Request) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { articleUrl } = await request.json()
  if (!articleUrl) return NextResponse.json({ error: 'articleUrl required' }, { status: 400 })

  // Check si ya existe
  const { data: existing } = await supabase
    .from('article_likes')
    .select('id')
    .eq('article_url', articleUrl)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('article_likes').delete().eq('id', existing.id)
    return NextResponse.json({ liked: false })
  } else {
    await supabase.from('article_likes').insert({ user_id: user.id, article_url: articleUrl })
    return NextResponse.json({ liked: true })
  }
}
