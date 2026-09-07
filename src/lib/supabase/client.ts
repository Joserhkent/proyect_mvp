import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Devuelve una única instancia compartida del cliente de Supabase para el navegador.
 * Crear un cliente nuevo en cada llamada genera múltiples GoTrueClient compitiendo
 * por la misma sesión (mismo storage key), lo que causa que el estado de auth
 * tarde en sincronizarse o solo se corrija al cambiar de pestaña.
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
