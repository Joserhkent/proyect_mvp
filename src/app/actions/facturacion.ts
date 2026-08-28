'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generarCorrelativo, calcularHashQr } from '@/lib/sunat/simulador';
import { ComprobanteSunatPDFInput } from '@/lib/documents';

/** "Con la cotización aprobada, emite el comprobante SUNAT (factura/boleta) al cliente." */
export async function emitirComprobanteSunat(cotizacionId: string, tipo: 'FACTURA' | 'BOLETA') {
  const supabase = await createClient();

  const { data: cotizacion, error: cotError } = await supabase
    .from('cotizaciones')
    .select('id, cliente_id, estado, subtotal, igv, total, moneda')
    .eq('id', cotizacionId)
    .single();
  if (cotError) throw new Error(cotError.message);
  if (cotizacion.estado !== 'APROBADA') {
    throw new Error('Solo se puede facturar una cotización APROBADA por el cliente.');
  }

  const serie = tipo === 'FACTURA' ? 'F001' : 'B001';
  const numero = generarCorrelativo();

  const { data: comprobante, error } = await supabase
    .from('comprobantes_sunat')
    .insert({
      tipo_comprobante: tipo,
      serie,
      numero,
      cliente_id: cotizacion.cliente_id,
      cotizacion_id: cotizacion.id,
      moneda: cotizacion.moneda ?? 'PEN',
      subtotal: cotizacion.subtotal ?? 0,
      igv: cotizacion.igv ?? 0,
      total: cotizacion.total ?? 0,
      estado_sunat: 'ACEPTADO',
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo emitir el comprobante: ${error.message}`);

  revalidatePath('/admin/sunat');
  revalidatePath('/admin/cotizaciones');
  return comprobante;
}

/** Reconstruye el hash/QR (deterministas) y arma el input listo para PDF/XML/CDR en el cliente. */
export async function prepararDescargaComprobante(comprobanteId: string): Promise<ComprobanteSunatPDFInput> {
  const supabase = await createClient();
  const { data: cpe, error } = await supabase.from('comprobantes_sunat').select('*, clientes(*)').eq('id', comprobanteId).single();
  if (error) throw new Error(error.message);

  const fechaEmision = (cpe.created_at ?? new Date().toISOString()).slice(0, 10);
  const { hash, qrData } = calcularHashQr({
    tipo_comprobante: cpe.tipo_comprobante as 'FACTURA' | 'BOLETA',
    serie: cpe.serie,
    numero: cpe.numero,
    cliente_num_doc: cpe.clientes?.num_doc ?? '',
    total: cpe.total,
    igv: cpe.igv,
    fecha_emision: fechaEmision,
  });

  return {
    tipo_comprobante: cpe.tipo_comprobante,
    serie: cpe.serie,
    numero: cpe.numero,
    cliente: {
      razon_social: cpe.clientes?.razon_social ?? '',
      tipo_doc: cpe.clientes?.tipo_doc ?? '',
      num_doc: cpe.clientes?.num_doc ?? '',
      direccion: cpe.clientes?.direccion ?? '',
      email: cpe.clientes?.email,
    },
    fecha_emision: fechaEmision,
    moneda: cpe.moneda ?? 'PEN',
    subtotal: cpe.subtotal,
    igv: cpe.igv,
    total: cpe.total,
    estado_sunat: cpe.estado_sunat ?? 'ACEPTADO',
    hash_cpe: hash,
    qr_data: qrData,
  };
}
