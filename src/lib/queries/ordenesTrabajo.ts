import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { OrdenTrabajo, Cliente, Usuario, BitacoraTecnica } from '@/types/db';

export type OrdenTrabajoConRelaciones = OrdenTrabajo & { clientes: Cliente | null; usuarios: Usuario | null };

export async function getOrdenesTrabajo(supabase: SupabaseClient<Database>): Promise<OrdenTrabajoConRelaciones[]> {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select('*, clientes(*), usuarios(*)')
    .order('fecha_inicio', { ascending: false });
  if (error) throw error;
  return data as unknown as OrdenTrabajoConRelaciones[];
}

export interface FirmaOrdenTrabajo {
  url_storage: string;
  nombre_archivo: string;
  created_at: string | null;
}

export async function getOrdenTrabajoCompleta(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from('ordenes_trabajo').select('*, clientes(*), usuarios(*)').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: bitacora, error: bitError }, { data: documentos, error: docError }] = await Promise.all([
    supabase.from('bitacora_tecnica').select('*').eq('orden_trabajo_id', id).order('created_at', { ascending: true }),
    supabase.from('documentos_operacion').select('url_storage, nombre_archivo, created_at').eq('entidad_tipo', 'ORDEN_TRABAJO').eq('entidad_id', id),
  ]);
  if (bitError) throw bitError;
  if (docError) throw docError;

  const firma = (documentos ?? []).find((d) => d.nombre_archivo === 'firma_cliente.png') ?? null;

  return {
    ordenTrabajo: data as unknown as OrdenTrabajoConRelaciones,
    bitacora: (bitacora ?? []) as BitacoraTecnica[],
    firma: firma as FirmaOrdenTrabajo | null,
  };
}
