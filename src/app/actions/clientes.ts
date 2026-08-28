'use server';

import { createClient } from '@/lib/supabase/server';
import { Cliente, TipoDoc } from '@/types/db';

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
