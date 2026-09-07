import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const RUTAS_PUBLICAS = ['/']
const PREFIJOS_SOLO_ADMIN = ['/admin', '/cotizador', '/api/cotizaciones', '/api/sunat']

function denegar(request: NextRequest, redirectTo: string, status: 401 | 403) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'No autorizado' }, { status })
  }
  return NextResponse.redirect(new URL(redirectTo, request.url))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname)

  if (!user) {
    if (!esRutaPublica) {
      return denegar(request, '/', 401)
    }
    return response
  }

  // Usuario autenticado: consultamos su rol para decidir qué puede ver.
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  const rol = perfil?.rol ?? 'TECNICO'

  // Un técnico solo debe usar su portal de campo: no accede al back-office (admin),
  // al módulo de cotizador, ni a las APIs internas de ventas/facturación.
  if (rol !== 'ADMIN' && PREFIJOS_SOLO_ADMIN.some((p) => pathname.startsWith(p))) {
    return denegar(request, '/tecnico', 403)
  }

  // Si ya inició sesión, no tiene sentido que vea el login de nuevo.
  if (esRutaPublica) {
    return NextResponse.redirect(new URL(rol === 'ADMIN' ? '/admin' : '/tecnico', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
