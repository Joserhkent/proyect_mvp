import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Cliente, Cotizacion, CotizacionDetalle, CotizacionProveedor, Producto, Proveedor } from '@/types/db';

export type CotizacionConCliente = Cotizacion & { clientes: Cliente | null };

export async function getCotizaciones(supabase: SupabaseClient<Database>): Promise<CotizacionConCliente[]> {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, clientes(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as CotizacionConCliente[];
}

export type DetalleConOfertas = CotizacionDetalle & {
  productos: Producto | null;
  cotizaciones_proveedor: (CotizacionProveedor & { proveedores: Proveedor | null })[];
};

export type CotizacionCompleta = Cotizacion & {
  clientes: Cliente | null;
  cotizacion_detalles: DetalleConOfertas[];
};

export interface EstadoDerivadoCotizacion {
  tieneOrdenesCompra: boolean;
  tieneComprobante: boolean;
  tieneDespacho: boolean;
  tieneOrdenTrabajo: boolean;
}

export async function getCotizacionCompleta(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<{ cotizacion: CotizacionCompleta; estadoDerivado: EstadoDerivadoCotizacion } | null> {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, clientes(*), cotizacion_detalles(*, productos(*), cotizaciones_proveedor(*, proveedores(*)))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ count: ocCount }, { count: cpeCount }, { count: despachoCount }, { count: otCount }] = await Promise.all([
    supabase.from('ordenes_compra').select('id', { count: 'exact', head: true }).eq('cotizacion_origen_id', id),
    supabase.from('comprobantes_sunat').select('id', { count: 'exact', head: true }).eq('cotizacion_id', id),
    supabase.from('despachos_cliente').select('id', { count: 'exact', head: true }).eq('cotizacion_id', id),
    supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('cotizacion_origen_id', id),
  ]);

  return {
    cotizacion: data as unknown as CotizacionCompleta,
    estadoDerivado: {
      tieneOrdenesCompra: (ocCount ?? 0) > 0,
      tieneComprobante: (cpeCount ?? 0) > 0,
      tieneDespacho: (despachoCount ?? 0) > 0,
      tieneOrdenTrabajo: (otCount ?? 0) > 0,
    },
  };
}
