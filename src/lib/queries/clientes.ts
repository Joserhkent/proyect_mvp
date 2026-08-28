import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Cliente, TipoDoc } from '@/types/db';

export async function getClientes(supabase: SupabaseClient<Database>): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Búsqueda estricta: exige coincidencia de num_doc Y tipo_doc. */
export async function getClientePorDocumento(
  supabase: SupabaseClient<Database>,
  numDoc: string,
  tipoDoc: TipoDoc
): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('num_doc', numDoc)
    .eq('tipo_doc', tipoDoc)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** num_doc es UNIQUE en el schema: sirve para detectar si el documento existe pero con OTRO tipo_doc. */
export async function getTipoDocPorNumDoc(supabase: SupabaseClient<Database>, numDoc: string): Promise<TipoDoc | null> {
  const { data, error } = await supabase.from('clientes').select('tipo_doc').eq('num_doc', numDoc).maybeSingle();
  if (error) throw error;
  return (data?.tipo_doc as TipoDoc | undefined) ?? null;
}
