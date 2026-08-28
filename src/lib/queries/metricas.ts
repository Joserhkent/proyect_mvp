import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export interface Metricas {
  totalVentasFacturadas: number;
  cotizacionesPendientesCount: number;
  ordenesCompraEnTransito: number;
  ordenesTrabajoActivas: number;
}

export async function getMetricas(supabase: SupabaseClient<Database>): Promise<Metricas> {
  const [{ data: comprobantes }, { count: cotPendientes }, { count: ocTransito }, { count: otActivas }] = await Promise.all([
    supabase.from('comprobantes_sunat').select('total').eq('estado_sunat', 'ACEPTADO'),
    supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).eq('estado', 'ENVIADA'),
    supabase.from('ordenes_compra').select('id', { count: 'exact', head: true }).in('estado', ['ENVIADA', 'CONFIRMADA']),
    supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'EN_PROGRESO'),
  ]);

  return {
    totalVentasFacturadas: (comprobantes ?? []).reduce((acc, c) => acc + c.total, 0),
    cotizacionesPendientesCount: cotPendientes ?? 0,
    ordenesCompraEnTransito: ocTransito ?? 0,
    ordenesTrabajoActivas: otActivas ?? 0,
  };
}
