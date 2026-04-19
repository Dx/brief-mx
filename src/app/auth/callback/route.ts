import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('city')
          .eq('id', user.id)
          .single()

        // If profile exists with city set, go to feed; else onboarding
        if (profile?.city && profile.city !== 'cdmx') {
          return NextResponse.redirect(`${origin}/feed`)
        }
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
