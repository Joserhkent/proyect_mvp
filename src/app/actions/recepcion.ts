'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { clasificarEntrega } from '@/lib/erp/entrega';

export interface LineaRecepcionInput {
  producto_id: string;
  cantidad_recibida: number;
}

export interface RecepcionarOrdenCompraInput {
  orden_compra_id: string;
  lineas: LineaRecepcionInput[];
  factura?: { serie: string; numero: string };
}

/**
 * "Recojo materiales y le entregan la guía": registra lo físicamente
 * recibido, compara contra lo acumulado + lo ordenado (clasificarEntrega) y
 * decide si corresponde SOLO_GUIA o GUIA_Y_FACTURA, actualiza inventario y
 * dejar la OC en RECIBIDA (completa) o PARCIAL (incompleta).
 */
export async function recepcionarOrdenCompra(input: RecepcionarOrdenCompraInput) {
  const supabase = await createClient();

  const { data: oc, error: ocError } = await supabase.from('ordenes_compra').select('*').eq('id', input.orden_compra_id).single();
  if (ocError) throw new Error(ocError.message);
  if (!['ENVIADA', 'CONFIRMADA', 'PARCIAL'].includes(oc.estado)) {
    throw new Error(`No se puede recepcionar una OC en estado ${oc.estado}.`);
  }

  const { data: detalles, error: detError } = await supabase
    .from('orden_compra_detalles')
    .select('producto_id, cantidad, costo_unitario')
    .eq('orden_compra_id', input.orden_compra_id);
  if (detError) throw new Error(detError.message);

  const { data: movimientosPrevios, error: movError } = await supabase
    .from('movimientos_inventario')
    .select('producto_id, cantidad')
    .eq('referencia_tipo', 'ORDEN_COMPRA')
    .eq('referencia_id', input.orden_compra_id)
    .eq('tipo_movimiento', 'ENTRADA');
  if (movError) throw new Error(movError.message);

  const recibidoAcumuladoPorProducto = new Map<string, number>();
  for (const m of movimientosPrevios ?? []) {
    recibidoAcumuladoPorProducto.set(m.producto_id, (recibidoAcumuladoPorProducto.get(m.producto_id) ?? 0) + m.cantidad);
  }
  for (const l of input.lineas) {
    recibidoAcumuladoPorProducto.set(l.producto_id, (recibidoAcumuladoPorProducto.get(l.producto_id) ?? 0) + l.cantidad_recibida);
  }

  const clasificacion = clasificarEntrega(
    (detalles ?? []).map((d) => ({ producto_id: d.producto_id, cantidad: d.cantidad })),
    Array.from(recibidoAcumuladoPorProducto.entries()).map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
  );

  const costoPorProducto = new Map((detalles ?? []).map((d) => [d.producto_id, d.costo_unitario]));
  const montoRecibidoAhora = input.lineas.reduce((acc, l) => acc + l.cantidad_recibida * (costoPorProducto.get(l.producto_id) ?? 0), 0);
  const subtotal = clasificacion === 'GUIA_Y_FACTURA' ? montoRecibidoAhora : 0;
  const igv = clasificacion === 'GUIA_Y_FACTURA' ? Math.round(subtotal * 0.18 * 100) / 100 : 0;

  if (clasificacion === 'GUIA_Y_FACTURA' && !input.factura) {
    throw new Error('La entrega está completa: registra la serie y número de la factura del proveedor.');
  }

  const { error: fcError } = await supabase.from('facturas_compras').insert({
    orden_compra_id: input.orden_compra_id,
    proveedor_id: oc.proveedor_id,
    serie: clasificacion === 'GUIA_Y_FACTURA' ? input.factura!.serie : 'GUIA',
    numero: clasificacion === 'GUIA_Y_FACTURA' ? input.factura!.numero : `${input.orden_compra_id.slice(0, 8)}-${Date.now()}`,
    tipo_comprobante: clasificacion,
    fecha_emision: new Date().toISOString().slice(0, 10),
    moneda: oc.moneda,
    subtotal,
    igv,
    total: subtotal + igv,
    estado_conciliacion: 'PENDIENTE',
  });
  if (fcError) throw new Error(`No se pudo registrar el comprobante de recepción: ${fcError.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const l of input.lineas) {
    if (l.cantidad_recibida <= 0) continue;

    const { error: movInsError } = await supabase.from('movimientos_inventario').insert({
      producto_id: l.producto_id,
      tipo_movimiento: 'ENTRADA',
      cantidad: l.cantidad_recibida,
      costo_unitario: costoPorProducto.get(l.producto_id) ?? 0,
      referencia_tipo: 'ORDEN_COMPRA',
      referencia_id: input.orden_compra_id,
      usuario_id: user?.id ?? null,
    });
    if (movInsError) throw new Error(`No se pudo registrar el movimiento de inventario: ${movInsError.message}`);

    const { data: producto, error: prodError } = await supabase.from('productos').select('stock_actual').eq('id', l.producto_id).single();
    if (prodError) throw new Error(prodError.message);

    const { error: stockError } = await supabase
      .from('productos')
      .update({ stock_actual: (producto.stock_actual ?? 0) + l.cantidad_recibida })
      .eq('id', l.producto_id);
    if (stockError) throw new Error(`No se pudo actualizar el stock: ${stockError.message}`);
  }

  const nuevoEstadoOC = clasificacion === 'GUIA_Y_FACTURA' ? 'RECIBIDA' : 'PARCIAL';
  const { error: ocUpdError } = await supabase.from('ordenes_compra').update({ estado: nuevoEstadoOC }).eq('id', input.orden_compra_id);
  if (ocUpdError) throw new Error(ocUpdError.message);

  revalidatePath('/admin/compras');
  return { clasificacion, nuevoEstadoOC };
}
