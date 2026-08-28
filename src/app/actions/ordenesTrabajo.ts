'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BitacoraEtapa } from '@/types/db';
import { getOrdenTrabajoCompleta } from '@/lib/queries/ordenesTrabajo';

/** "Asignar Técnico" para cotizaciones tipo PROYECTO_MESA (instalación). */
export async function asignarOrdenTrabajo(cotizacionId: string, tecnicoId: string, fechaProgramada: string) {
  const supabase = await createClient();

  const { data: cotizacion, error: cotError } = await supabase
    .from('cotizaciones')
    .select('id, cliente_id, codigo, tipo_operacion, estado')
    .eq('id', cotizacionId)
    .single();
  if (cotError) throw new Error(cotError.message);
  if (cotizacion.tipo_operacion !== 'PROYECTO_MESA') {
    throw new Error('Solo las cotizaciones de tipo Proyecto (Mesa) requieren una orden de trabajo técnica.');
  }
  if (cotizacion.estado !== 'APROBADA') {
    throw new Error('Solo se puede asignar técnico a una cotización APROBADA por el cliente.');
  }

  const { data: ot, error } = await supabase
    .from('ordenes_trabajo')
    .insert({
      cliente_id: cotizacion.cliente_id,
      cotizacion_origen_id: cotizacionId,
      nombre_proyecto: `Instalación ${cotizacion.codigo ?? ''}`.trim(),
      tecnico_asignado: tecnicoId,
      estado: 'CREADA',
      fecha_inicio: new Date(fechaProgramada).toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`No se pudo asignar la orden de trabajo: ${error.message}`);

  revalidatePath('/admin/cotizaciones');
  revalidatePath('/admin/ordenes-trabajo');
  revalidatePath('/tecnico');
  return ot;
}

export async function actualizarEstadoOT(id: string, estado: 'EN_PROGRESO' | 'PAUSADA') {
  const supabase = await createClient();
  const { error } = await supabase.from('ordenes_trabajo').update({ estado }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/tecnico');
  revalidatePath('/admin/ordenes-trabajo');
}

export async function agregarHitoBitacora(
  otId: string,
  etapa: BitacoraEtapa,
  titulo: string,
  descripcion?: string,
  adjuntos?: { foto_url?: string; materiales_extra?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('bitacora_tecnica').insert({
    orden_trabajo_id: otId,
    usuario_id: user?.id ?? null,
    etapa,
    titulo,
    descripcion,
    adjuntos: adjuntos ?? null,
  });
  if (error) throw new Error(`No se pudo guardar el hito: ${error.message}`);

  await supabase.from('ordenes_trabajo').update({ estado: 'EN_PROGRESO' }).eq('id', otId).eq('estado', 'CREADA');

  revalidatePath('/tecnico');
  revalidatePath('/admin/ordenes-trabajo');
}

/**
 * Cierra la orden de trabajo con la firma digital de conformidad del cliente.
 * La firma (PNG del canvas, como data URL) se guarda en documentos_operacion
 * — no hay columnas dedicadas a firma en ordenes_trabajo en el schema real.
 */
export async function finalizarOTConFirma(otId: string, firmaDataUrl: string, nombreFirmante: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: docError } = await supabase.from('documentos_operacion').insert({
    entidad_tipo: 'ORDEN_TRABAJO',
    entidad_id: otId,
    nombre_archivo: 'firma_cliente.png',
    url_storage: firmaDataUrl,
    tipo_mime: 'image/png',
    subido_por: user?.id ?? null,
  });
  if (docError) throw new Error(`No se pudo guardar la firma: ${docError.message}`);

  const { error: bitError } = await supabase.from('bitacora_tecnica').insert({
    orden_trabajo_id: otId,
    usuario_id: user?.id ?? null,
    etapa: 'CIERRE',
    titulo: 'Cierre con firma de conformidad',
    descripcion: `Firmado por: ${nombreFirmante}`,
  });
  if (bitError) throw new Error(bitError.message);

  const { error: otError } = await supabase
    .from('ordenes_trabajo')
    .update({ estado: 'COMPLETADA', fecha_fin_real: new Date().toISOString() })
    .eq('id', otId);
  if (otError) throw new Error(otError.message);

  revalidatePath('/tecnico');
  revalidatePath('/admin/ordenes-trabajo');
}

export async function obtenerOrdenTrabajoCompleta(id: string) {
  const supabase = await createClient();
  return getOrdenTrabajoCompleta(supabase, id);
}
