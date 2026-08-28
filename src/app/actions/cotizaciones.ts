'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calcularTotalesCotizacion } from '@/lib/erp/pricing';
import { CotizacionTipoOperacion } from '@/types/db';
import { upsertCliente, DatosCliente } from './clientes';
import { getCotizacionCompleta } from '@/lib/queries/cotizaciones';

export async function obtenerCotizacionCompleta(id: string) {
  const supabase = await createClient();
  return getCotizacionCompleta(supabase, id);
}

export interface LineaCotizacionInput {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct?: number;
}

export interface CrearCotizacionInput {
  cliente: DatosCliente;
  tipo_operacion: CotizacionTipoOperacion;
  detalles: LineaCotizacionInput[];
  validez_dias?: number;
  moneda?: string;
}

/** "Cliente pide productos": crea/actualiza el cliente y registra la cotización en BORRADOR. */
export async function crearCotizacion(input: CrearCotizacionInput) {
  if (input.detalles.length === 0) {
    throw new Error('La cotización necesita al menos un producto.');
  }

  const supabase = await createClient();
  const cliente = await upsertCliente(input.cliente);
  const totales = calcularTotalesCotizacion(input.detalles);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .insert({
      cliente_id: cliente.id,
      vendedor_id: user?.id ?? null,
      tipo_operacion: input.tipo_operacion,
      estado: 'BORRADOR',
      moneda: input.moneda ?? 'PEN',
      subtotal: totales.subtotal,
      igv: totales.igv,
      total: totales.total,
      validez_dias: input.validez_dias ?? 15,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo crear la cotización: ${error.message}`);

  const detallesInsert = input.detalles.map((d) => ({
    cotizacion_id: cotizacion.id,
    producto_id: d.producto_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
    descuento_pct: d.descuento_pct ?? 0,
    subtotal: round2(d.cantidad * d.precio_unitario * (1 - (d.descuento_pct ?? 0) / 100)),
  }));

  const { error: detError } = await supabase.from('cotizacion_detalles').insert(detallesInsert);
  if (detError) {
    // Revertir la cabecera para no dejar una cotización sin líneas.
    await supabase.from('cotizaciones').delete().eq('id', cotizacion.id);
    throw new Error(`No se pudieron guardar los productos de la cotización: ${detError.message}`);
  }

  revalidatePath('/admin/cotizaciones');
  return cotizacion;
}

async function transicionarEstado(id: string, desde: string[], hasta: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cotizaciones')
    .update({ estado: hasta })
    .eq('id', id)
    .in('estado', desde)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      `No se pudo pasar la cotización a "${hasta}": su estado actual no lo permite (se esperaba ${desde.join(' o ')}).`
    );
  }
  revalidatePath('/admin/cotizaciones');
  return data;
}

/** "Mandar cotización al cliente" (genera el PDF en el cliente y marca el envío). */
export async function enviarCotizacion(id: string) {
  return transicionarEstado(id, ['BORRADOR', 'AJUSTE_REQUERIDO'], 'ENVIADA');
}

/**
 * "Cliente aprueba la cotización" — registrado por ventas/admin (no hay portal
 * de autoservicio para el cliente en esta versión). El trigger de la base
 * (trg_reservar_stock) reserva automáticamente el stock al confirmar esto.
 */
export async function registrarAprobacionCliente(id: string) {
  return transicionarEstado(id, ['ENVIADA'], 'APROBADA');
}

export async function rechazarCotizacion(id: string) {
  return transicionarEstado(id, ['ENVIADA', 'BORRADOR'], 'RECHAZADA');
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
