import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Proveedor } from '@/types/db';

export async function getProveedores(supabase: SupabaseClient<Database>): Promise<Proveedor[]> {
  const { data, error } = await supabase.from('proveedores').select('*').order('razon_social');
  if (error) throw error;
  return data;
}
