import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Cliente } from '@/types/db';

export async function getClientes(supabase: SupabaseClient<Database>): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClientePorNumDoc(
  supabase: SupabaseClient<Database>,
  numDoc: string
): Promise<Cliente | null> {
  const { data, error } = await supabase.from('clientes').select('*').eq('num_doc', numDoc).maybeSingle();
  if (error) throw error;
  return data;
}
