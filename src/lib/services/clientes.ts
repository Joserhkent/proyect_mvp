'use server'

import { createClient } from '@/lib/supabase/server'
import type { Cliente, ConsultaSunatResult } from '@/types/erp'
import type { Database } from '@/types/supabase'

type ClienteRow = Database['public']['Tables']['clientes']['Row']
type ClienteInsert = Database['public']['Tables']['clientes']['Insert']

function normalizarCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    tipo_doc: row.tipo_doc as Cliente['tipo_doc'],
    num_doc: row.num_doc,
    razon_social: row.razon_social,
    direccion: row.direccion,
    email: row.email,
    telefono: row.telefono ?? undefined,
    estado_contribuyente: row.estado_contribuyente ?? undefined,
    condicion: row.condicion ?? undefined,
    departamento: row.departamento ?? undefined,
    provincia: row.provincia ?? undefined,
    distrito: row.distrito ?? undefined,
    created_at: row.created_at ?? undefined,
  }
}

/**
 * Busca clientes por RUC, DNI o Razón Social
 */
export async function buscarClientes(query: string): Promise<Cliente[]> {
  const supabase = await createClient()
  const term = `%${query.trim()}%`

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(`num_doc.ilike.${term},razon_social.ilike.${term}`)
    .limit(10)

  if (error) {
    console.error('Error al buscar clientes:', error)
    return []
  }

  return (data ?? []).map(normalizarCliente)
}

/**
 * Crea o actualiza un cliente registrado
 */
export async function guardarCliente(cliente: ClienteInsert): Promise<{ success: boolean; data?: Cliente; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .upsert(cliente)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: normalizarCliente(data) }
}

/**
 * Consulta RUC/DNI en API externa de SUNAT/RENIEC
 */
export async function consultarSunatRucDni(numDoc: string): Promise<ConsultaSunatResult> {
  try {
    const cleanDoc = numDoc.trim()
    const isRuc = cleanDoc.length === 11
    
    const response = await fetch(`https://api.apis.net.pe/v2/sunat/ruc?numero=${cleanDoc}`, {
      headers: { Authorization: `Bearer ${process.env.SUNAT_API_TOKEN}` },
    })

    if (!response.ok) {
      return { success: false, error: 'No se encontraron datos' }
    }

    const data = await response.json()
    return {
      success: true,
      tipo_doc: isRuc ? 'RUC' : 'DNI',
      num_doc: cleanDoc,
      razon_social: data.razonSocial || data.nombres,
      direccion: data.direccion || '',
      estado: data.estado || 'ACTIVO',
      condicion: data.condicion || 'HABIDO',
      departamento: data.departamento || '',
      provincia: data.provincia || '',
      distrito: data.distrito || '',
    }
  } catch {
    return { success: false, error: 'Error de conexión con el servicio SUNAT' }
  }
}