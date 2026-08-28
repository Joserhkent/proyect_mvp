import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Usuario, UsuarioRol } from '@/types/db';

export async function getUsuariosPorRol(
  supabase: SupabaseClient<Database>,
  rol: UsuarioRol
): Promise<Usuario[]> {
  const { data, error } = await supabase.from('usuarios').select('*').eq('rol', rol).order('nombre');
  if (error) throw error;
  return data;
}

export async function getUsuarioActual(supabase: SupabaseClient<Database>): Promise<Usuario | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('usuarios').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}
