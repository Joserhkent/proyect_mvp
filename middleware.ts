import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Unauthenticated redirect to login
  if (!user && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Authenticated user at login screen redirect to home route based on Role
  if (user && pathname === '/') {
    const { data: usuarioBD } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('email', user.email)
      .maybeSingle()

    const rol = usuarioBD?.rol ?? 'TECNICO'
    const targetPath = rol === 'ADMIN' ? '/admin' : '/tecnico'

    return NextResponse.redirect(new URL(targetPath, request.url))
  }

  // Protect paths by Role
  if (user && pathname !== '/') {
    const { data: usuarioBD } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('email', user.email)
      .maybeSingle()

    const rol = usuarioBD?.rol ?? 'TECNICO'

    // Only ADMINs can access /admin routes
    if (pathname.startsWith('/admin') && rol !== 'ADMIN') {
      return NextResponse.redirect(new URL('/tecnico', request.url))
    }

    // Redirect obsolete routes (/cotizador) to default user dashboard
    if (pathname.startsWith('/cotizador')) {
      const targetPath = rol === 'ADMIN' ? '/admin' : '/tecnico'
      return NextResponse.redirect(new URL(targetPath, request.url))
    }
  }

  if (error) {
    console.warn('Middleware auth error:', error.message)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}