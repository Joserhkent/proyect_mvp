'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import type { Usuario, UserRole } from '@/types/erp'
import type { Database } from '@/types/supabase'

type UsuarioRow = Database['public']['Tables']['usuarios']['Row']

function normalizarUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    username: row.username ?? undefined,
    nombre: row.nombre,
    email: row.email,
    rol: (row.rol as UserRole) ?? 'TECNICO',
    telefono: row.telefono ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    created_at: row.created_at ?? undefined,
  }
}

/**
 * Lista todos los usuarios (admins y técnicos) registrados en el sistema.
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al listar usuarios:', error)
    return []
  }

  return (data ?? []).map(normalizarUsuario)
}

async function verificarAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol !== 'ADMIN') {
    return { ok: false, error: 'No autorizado: se requiere rol ADMIN' }
  }

  return { ok: true }
}

export interface CrearTecnicoInput {
  nombre: string
  email: string
  password: string
  username?: string
  telefono?: string
}

/**
 * Crea un nuevo usuario técnico: registra el usuario en Supabase Auth
 * (el trigger `handle_new_user` genera la fila en `public.usuarios` con rol TECNICO)
 * y luego completa el teléfono si fue provisto. Requiere que quien llama sea ADMIN.
 */
export async function crearTecnico(
  input: CrearTecnicoInput
): Promise<{ success: boolean; error?: string }> {
  const permiso = await verificarAdmin()
  if (!permiso.ok) return { success: false, error: permiso.error }

  const nombre = input.nombre.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const username = input.username?.trim() || undefined
  const telefono = input.telefono?.trim() || undefined

  if (!nombre || !email || !password) {
    return { success: false, error: 'Nombre, correo y contraseña son obligatorios' }
  }
  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor' }
  }

  const adminClient = createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { rol: 'TECNICO', nombre, username },
  })

  if (createError || !created.user) {
    const msg = createError?.message ?? ''
    if (/already.*registered/i.test(msg)) {
      return { success: false, error: 'Ya existe un usuario con ese correo' }
    }
    return { success: false, error: msg || 'No se pudo crear el técnico' }
  }

  if (telefono) {
    await adminClient.from('usuarios').update({ telefono }).eq('id', created.user.id)
  }

  return { success: true }
}
