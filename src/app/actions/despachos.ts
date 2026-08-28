'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CrearDespachoInput {
  cotizacion_id: string;
  direccion_llegada: string;
  transportista_nombre?: string;
  transportista_ruc?: string;
}

/**
 * "Si es solo productos, se genera la guía de remisión y se entrega al
 * cliente": solo aplica a cotizaciones tipo_operacion=PRODUCTO (las
 * PROYECTO_MESA van por el flujo de órdenes de trabajo/técnico). Libera el
 * stock reservado y descuenta stock físico.
 */
export async function crearDespachoCliente(input: CrearDespachoInput) {
  const supabase = await createClient();

  const { data: cotizacion, error: cotError } = await supabase
    .from('cotizaciones')
    .select('id, tipo_operacion, estado')
    .eq('id', input.cotizacion_id)
    .single();
  if (cotError) throw new Error(cotError.message);

  if (cotizacion.tipo_operacion !== 'PRODUCTO') {
    throw new Error('La guía de remisión solo aplica a cotizaciones de solo productos (no proyectos de instalación).');
  }
  if (cotizacion.estado !== 'APROBADA') {
    throw new Error('Solo se puede despachar una cotización APROBADA por el cliente.');
  }

  const { count: despachoExistente } = await supabase
    .from('despachos_cliente')
    .select('id', { count: 'exact', head: true })
    .eq('cotizacion_id', input.cotizacion_id);
  if ((despachoExistente ?? 0) > 0) {
    throw new Error('Esta cotización ya tiene una guía de remisión generada.');
  }

  const numeroGuia = `T001-${Date.now().toString().slice(-8)}`;

  const { data: despacho, error } = await supabase
    .from('despachos_cliente')
    .insert({
      cotizacion_id: input.cotizacion_id,
      numero_guia_remision: numeroGuia,
      direccion_llegada: input.direccion_llegada,
      transportista_nombre: input.transportista_nombre,
      transportista_ruc: input.transportista_ruc,
    })
    .select()
    .single();
  if (error) throw new Error(`No se pudo generar la guía de remisión: ${error.message}`);

  const { data: detalles, error: detError } = await supabase
    .from('cotizacion_detalles')
    .select('producto_id, cantidad')
    .eq('cotizacion_id', input.cotizacion_id);
  if (detError) throw new Error(detError.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const d of detalles ?? []) {
    await supabase.from('movimientos_inventario').insert([
      {
        producto_id: d.producto_id,
        tipo_movimiento: 'SALIDA',
        cantidad: d.cantidad,
        referencia_tipo: 'DESPACHO',
        referencia_id: despacho.id,
        usuario_id: user?.id ?? null,
      },
      {
        producto_id: d.producto_id,
        tipo_movimiento: 'LIBERACION',
        cantidad: d.cantidad,
        referencia_tipo: 'DESPACHO',
        referencia_id: despacho.id,
        usuario_id: user?.id ?? null,
      },
    ]);

    const { data: producto } = await supabase.from('productos').select('stock_actual, stock_reservado').eq('id', d.producto_id).single();
    if (producto) {
      await supabase
        .from('productos')
        .update({
          stock_actual: Math.max(0, (producto.stock_actual ?? 0) - d.cantidad),
          stock_reservado: Math.max(0, (producto.stock_reservado ?? 0) - d.cantidad),
        })
        .eq('id', d.producto_id);
    }
  }

  revalidatePath('/admin/cotizaciones');
  return despacho;
}
