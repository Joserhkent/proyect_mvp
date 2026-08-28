'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { elegirGanadoraPorDetalle } from '@/lib/erp/proveedores';

export interface RegistrarOfertaProveedorInput {
  cotizacion_id: string;
  detalle_id: string;
  producto_id: string;
  proveedor_id: string;
  cantidad_cotizada: number;
  costo_unitario: number;
  dias_entrega: number;
  fecha_entrega_proveedor?: string;
}

/** "Consultar a los proveedores / recibe la cotización": registra una oferta de un proveedor para una línea. */
export async function registrarCotizacionProveedor(input: RegistrarOfertaProveedorInput) {
  const supabase = await createClient();
  const { error } = await supabase.from('cotizaciones_proveedor').insert({
    cotizacion_id: input.cotizacion_id,
    detalle_id: input.detalle_id,
    producto_id: input.producto_id,
    proveedor_id: input.proveedor_id,
    cantidad_cotizada: input.cantidad_cotizada,
    costo_unitario: input.costo_unitario,
    dias_entrega: input.dias_entrega,
    fecha_entrega_proveedor: input.fecha_entrega_proveedor,
    estado: 'RECIBIDA',
    fecha_respuesta: new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo registrar la oferta del proveedor: ${error.message}`);
  revalidatePath('/admin/cotizaciones');
}

export async function eliminarCotizacionProveedor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('cotizaciones_proveedor').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cotizaciones');
}

/**
 * De todas las ofertas recibidas para la cotización, marca como ganadora (es_ganadora=true)
 * la más barata por línea (con lógica pura de src/lib/erp/proveedores.ts) y desmarca el resto.
 * El trigger trg_actualizar_entrega_cotizacion recalcula la fecha de entrega automáticamente.
 */
export async function elegirGanadorasAutomatico(cotizacionId: string) {
  const supabase = await createClient();

  const { data: ofertas, error } = await supabase
    .from('cotizaciones_proveedor')
    .select('id, detalle_id, costo_unitario, dias_entrega')
    .eq('cotizacion_id', cotizacionId);

  if (error) throw new Error(error.message);
  if (!ofertas || ofertas.length === 0) {
    throw new Error('No hay ofertas de proveedores registradas para esta cotización.');
  }

  const ganadoras = elegirGanadoraPorDetalle(
    ofertas.map((o) => ({
      id: o.id,
      detalle_id: o.detalle_id ?? '',
      costo_unitario: o.costo_unitario,
      dias_entrega: o.dias_entrega ?? 0,
    }))
  );
  const idsGanadores = new Set(Object.values(ganadoras));

  await Promise.all(
    ofertas.map((o) =>
      supabase
        .from('cotizaciones_proveedor')
        .update({ es_ganadora: idsGanadores.has(o.id) })
        .eq('id', o.id)
    )
  );

  revalidatePath('/admin/cotizaciones');
  return ganadoras;
}
