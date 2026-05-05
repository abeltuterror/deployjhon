import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cs.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: usar getUser(), nunca getSession() en middleware
  // getSession() lee solo la cookie sin validar contra el servidor
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  // Only run auth check on routes that actually need a valid session.
  // Skipping public pages (/, /convocatorias/*, etc.) eliminates the
  // getUser() round-trip to Supabase Auth (~500ms) on every page load.
  matcher: [
    '/admin/:path*',
    '/panel/:path*',
    '/perfil/:path*',
    '/guardados/:path*',
    '/auth/callback',
  ],
}
