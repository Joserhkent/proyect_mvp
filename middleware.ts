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

  // 1. Obtener el usuario autenticado
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Si no está autenticado e intenta entrar a una ruta protegida -> Redirigir al Login ('/')
  if (!user && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Si está autenticado e intenta ir a la pantalla de login -> Redirigir a su panel
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/admin', request.url)) // O su dashboard principal
  }

  // 2. Control de acceso por Rutas (Ejemplo para /admin)
  if (user && pathname.startsWith('/admin')) {
    const { data: usuarioBD } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    // Si intenta entrar a /admin y no es ADMIN -> Denegar acceso y mandar a /cotizador
    if (usuarioBD?.rol !== 'ADMIN') {
      return NextResponse.redirect(new URL('/cotizador', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}