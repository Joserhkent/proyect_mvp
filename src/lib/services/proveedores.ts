'use server'

import { createClient } from '@/lib/supabase/server'
import type { Proveedor } from '@/types/erp'
import type { Database } from '@/types/supabase'

type ProveedorRow = Database['public']['Tables']['proveedores']['Row']
type ProveedorInsert = Database['public']['Tables']['proveedores']['Insert']

function normalizarProveedor(row: ProveedorRow): Proveedor {
  return {
    id: row.id,
    ruc: row.ruc,
    razon_social: row.razon_social,
    email: row.email,
    telefono: row.telefono ?? undefined,
    contacto: row.contacto ?? undefined,
    direccion: row.direccion ?? undefined,
    departamento: row.departamento ?? undefined,
    provincia: row.provincia ?? undefined,
    dias_entrega_estimados: Number(row.dias_entrega_estimados ?? 0),
    costo_flete_base: Number(row.costo_flete_base ?? 0),
    created_at: row.created_at ?? undefined,
  }
}

/**
 * Busca proveedores por RUC o Razón Social
 */
export async function buscarProveedores(query?: string): Promise<Proveedor[]> {
  const supabase = await createClient()
  let builder = supabase.from('proveedores').select('*').order('razon_social', { ascending: true })

  if (query && query.trim() !== '') {
    const term = `%${query.trim()}%`
    builder = builder.or(`ruc.ilike.${term},razon_social.ilike.${term}`)
  }

  const { data, error } = await builder.limit(30)

  if (error) {
    console.error('Error al buscar proveedores:', error)
    return []
  }

  return (data ?? []).map(normalizarProveedor)
}

/**
 * Obtiene un proveedor por su ID
 */
export async function obtenerProveedorPorId(id: string): Promise<Proveedor | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return normalizarProveedor(data)
}

/**
 * Crea o actualiza un proveedor
 */
export async function guardarProveedor(
  proveedor: ProveedorInsert
): Promise<{ success: boolean; data?: Proveedor; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proveedores')
    .upsert(proveedor)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: normalizarProveedor(data) }
}