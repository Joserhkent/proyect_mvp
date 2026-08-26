'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Iniciar sesión en Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: 'Correo o contraseña incorrectos' }
  }

  // 2. Consultar el ROL en la tabla public.usuarios usando el UUID del usuario
  const { data: usuarioBD, error: roleError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', authData.user.id)
    .single()

  // 3. Determinar la ruta según el rol (Si no tiene registro aún, por defecto a cotizador)
  let targetPath = '/cotizador'

  if (usuarioBD?.rol === 'ADMIN') {
    targetPath = '/admin'
  } else if (usuarioBD?.rol === 'TECNICO') {
    targetPath = '/tecnico'
  } else if (usuarioBD?.rol === 'VENDEDOR') {
    targetPath = '/cotizador'
  }

  revalidatePath('/', 'layout')
  redirect(targetPath)
}