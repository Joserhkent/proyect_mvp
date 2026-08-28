'use server';

import { createClient } from '@/lib/supabase/server';
import { getClientePorDocumento, getTipoDocPorNumDoc } from '@/lib/queries/clientes';
import { validarDocumento } from '@/lib/erp/documento';
import { Cliente, TipoDoc } from '@/types/db';

export interface ResultadoBusquedaCliente {
  cliente: Cliente | null;
  /** Si el número existe pero registrado con otro tipo de documento, se informa aquí. */
  tipoDocEncontrado?: TipoDoc;
}

/**
 * Busca un cliente ya registrado en Supabase por RUC/DNI (datos reales, no SUNAT
 * simulado). Exige coincidencia estricta de num_doc Y tipo_doc; si el número
 * existe pero con otro tipo de documento, lo informa en `tipoDocEncontrado` en
 * vez de devolver ese cliente (evita mezclar un DNI con un RUC del mismo número).
 */
export async function buscarClientePorDocumento(numDoc: string, tipoDoc: TipoDoc): Promise<ResultadoBusquedaCliente> {
  const errorFormato = validarDocumento(tipoDoc, numDoc);
  if (errorFormato) throw new Error(errorFormato);

  const supabase = await createClient();
  const cliente = await getClientePorDocumento(supabase, numDoc, tipoDoc);
  if (cliente) return { cliente };

  const tipoDocEncontrado = await getTipoDocPorNumDoc(supabase, numDoc);
  if (tipoDocEncontrado && tipoDocEncontrado !== tipoDoc) {
    return { cliente: null, tipoDocEncontrado };
  }
  return { cliente: null };
}

export interface DatosCliente {
  tipo_doc: TipoDoc;
  num_doc: string;
  razon_social: string;
  direccion: string;
  email: string;
  telefono?: string;
  estado_contribuyente?: string;
  condicion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

/** Crea el cliente si no existe (por num_doc); si ya existe, actualiza sus datos de contacto. */
export async function upsertCliente(input: DatosCliente): Promise<Cliente> {
  const errorFormato = validarDocumento(input.tipo_doc, input.num_doc);
  if (errorFormato) throw new Error(errorFormato);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clientes')
    .upsert(
      {
        tipo_doc: input.tipo_doc,
        num_doc: input.num_doc,
        razon_social: input.razon_social,
        direccion: input.direccion,
        email: input.email,
        telefono: input.telefono,
        estado_contribuyente: input.estado_contribuyente,
        condicion: input.condicion,
        departamento: input.departamento,
        provincia: input.provincia,
        distrito: input.distrito,
      },
      { onConflict: 'num_doc' }
    )
    .select()
    .single();

  if (error) throw new Error(`No se pudo registrar el cliente: ${error.message}`);
  return data;
}
