'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Correo y contraseña requeridos' }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: 'Correo o contraseña incorrectos' }
  }

  const { data: usuarioBD, error: roleError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('email', email)
    .maybeSingle()

  if (roleError && !usuarioBD) {
    console.warn('Usuario no encontrado en public.usuarios para login:', email)
  }

  const normalizedRole = usuarioBD?.rol ?? 'TECNICO'
  const targetPath = normalizedRole === 'ADMIN' ? '/admin' : '/tecnico'

  revalidatePath('/', 'layout')
  redirect(targetPath)
}