'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calcularTotalesCotizacion } from '@/lib/erp/pricing';
import { agruparDetallesPorProveedor } from '@/lib/erp/ordenesCompra';
import { getOrdenCompraCompleta } from '@/lib/queries/ordenesCompra';

/**
 * "Genera la orden de compra": agrupa las líneas de la cotización por el
 * proveedor ganador (cotizaciones_proveedor.es_ganadora) y crea una Orden de
 * Compra por proveedor, en PENDIENTE_PAGO.
 */
export async function generarOrdenesCompraDesdeCotizacion(cotizacionId: string) {
  const supabase = await createClient();

  const { data: cotizacion, error: cotError } = await supabase
    .from('cotizaciones')
    .select('id, estado, tipo_operacion, moneda')
    .eq('id', cotizacionId)
    .single();
  if (cotError) throw new Error(cotError.message);
  if (cotizacion.estado !== 'APROBADA') {
    throw new Error('Solo se pueden generar órdenes de compra de una cotización APROBADA.');
  }

  const { count: ocExistentes } = await supabase
    .from('ordenes_compra')
    .select('id', { count: 'exact', head: true })
    .eq('cotizacion_origen_id', cotizacionId);
  if ((ocExistentes ?? 0) > 0) {
    throw new Error('Ya se generaron órdenes de compra para esta cotización.');
  }

  const [{ data: detalles, error: detError }, { data: ofertas, error: ofError }] = await Promise.all([
    supabase.from('cotizacion_detalles').select('id, producto_id, cantidad').eq('cotizacion_id', cotizacionId),
    supabase
      .from('cotizaciones_proveedor')
      .select('id, detalle_id, proveedor_id, costo_unitario')
      .eq('cotizacion_id', cotizacionId)
      .eq('es_ganadora', true),
  ]);
  if (detError) throw new Error(detError.message);
  if (ofError) throw new Error(ofError.message);

  const grupos = agruparDetallesPorProveedor(
    (detalles ?? []).map((d) => ({ id: d.id, producto_id: d.producto_id, cantidad: d.cantidad })),
    (ofertas ?? []).map((o) => ({ id: o.id, detalle_id: o.detalle_id ?? '', proveedor_id: o.proveedor_id, costo_unitario: o.costo_unitario }))
  );

  if (grupos.length === 0) {
    throw new Error('No hay proveedores ganadores elegidos todavía para esta cotización.');
  }

  const destino = cotizacion.tipo_operacion === 'PRODUCTO' ? 'CLIENTE' : 'STOCK_PROPIO';
  const ordenesCreadas = [];

  for (const grupo of grupos) {
    const totales = calcularTotalesCotizacion(grupo.lineas.map((l) => ({ cantidad: l.cantidad, precio_unitario: l.costo_unitario })));

    const { data: oc, error: ocError } = await supabase
      .from('ordenes_compra')
      .insert({
        proveedor_id: grupo.proveedor_id,
        cotizacion_origen_id: cotizacionId,
        estado: 'PENDIENTE_PAGO',
        moneda: cotizacion.moneda ?? 'PEN',
        subtotal: totales.subtotal,
        igv: totales.igv,
        total: totales.total,
      })
      .select()
      .single();
    if (ocError) throw new Error(`No se pudo crear la orden de compra: ${ocError.message}`);

    const detallesInsert = grupo.lineas.map((l) => ({
      orden_compra_id: oc.id,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      costo_unitario: l.costo_unitario,
      destino,
      subtotal: l.cantidad * l.costo_unitario,
    }));
    const { error: detInsError } = await supabase.from('orden_compra_detalles').insert(detallesInsert);
    if (detInsError) throw new Error(`No se pudieron guardar los ítems de la orden de compra: ${detInsError.message}`);

    ordenesCreadas.push(oc);
  }

  revalidatePath('/admin/compras');
  revalidatePath('/admin/cotizaciones');
  return { creadas: ordenesCreadas.length, ordenes: ordenesCreadas };
}

async function transicionarEstadoOC(id: string, desde: string[], hasta: string, extra?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ordenes_compra')
    .update({ estado: hasta, ...extra })
    .eq('id', id)
    .in('estado', desde)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(`No se pudo pasar la OC a "${hasta}": su estado actual no lo permite (se esperaba ${desde.join(' o ')}).`);
  }
  revalidatePath('/admin/compras');
  return data;
}

/**
 * "Con la OC se realiza el pago... recibe voucher": sube el comprobante de
 * pago/transferencia al bucket privado `vouchers` y marca la OC como PAGADA.
 */
export async function registrarPago(ocId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('voucher');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Adjunta el voucher de pago (imagen o PDF).');
  }

  const path = `${ocId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('vouchers').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (uploadError) throw new Error(`No se pudo subir el voucher: ${uploadError.message}`);

  return transicionarEstadoOC(ocId, ['PENDIENTE_PAGO'], 'PAGADA', { voucher_url: path, fecha_pago: new Date().toISOString() });
}

export async function getVoucherSignedUrl(voucherPath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('vouchers').createSignedUrl(voucherPath, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

/** "Lanza orden y voucher de transferencia (al proveedor)". */
export async function confirmarEnvioAlProveedor(id: string) {
  return transicionarEstadoOC(id, ['PAGADA'], 'ENVIADA', { fecha_envio: new Date().toISOString() });
}

export async function cancelarOrdenCompra(id: string) {
  return transicionarEstadoOC(id, ['BORRADOR', 'PENDIENTE_PAGO', 'PAGADA', 'ENVIADA', 'CONFIRMADA', 'PARCIAL'], 'CANCELADA');
}

export async function obtenerOrdenCompraCompleta(id: string) {
  const supabase = await createClient();
  return getOrdenCompraCompleta(supabase, id);
}
