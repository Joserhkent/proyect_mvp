import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Producto } from '@/types/db';

export async function getProductos(supabase: SupabaseClient<Database>): Promise<Producto[]> {
  const { data, error } = await supabase.from('productos').select('*').order('nombre');
  if (error) throw error;
  return data;
}
