import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { ComprobanteSunat, Cliente } from '@/types/db';

export type ComprobanteConCliente = ComprobanteSunat & { clientes: Cliente | null };

export async function getComprobantesSunat(supabase: SupabaseClient<Database>): Promise<ComprobanteConCliente[]> {
  const { data, error } = await supabase
    .from('comprobantes_sunat')
    .select('*, clientes(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as ComprobanteConCliente[];
}
