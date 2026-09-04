'use server'

import { createClient } from '@/lib/supabase/server'
import type { Producto } from '@/types/erp'
import type { Database } from '@/types/supabase'

type ProductoRow = Database['public']['Tables']['productos']['Row']
type ProductoInsert = Database['public']['Tables']['productos']['Insert']

function normalizarProducto(row: ProductoRow): Producto {
  return {
    id: row.id,
    sku: row.sku,
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    categoria: row.categoria as Producto['categoria'],
    unidad_medida: row.unidad_medida ?? 'UNIDAD',
    ultimo_costo_compra: Number(row.ultimo_costo_compra ?? 0),
    costo_promedio: Number(row.costo_promedio ?? 0),
    ultimo_precio_venta: Number(row.ultimo_precio_venta ?? 0),
    stock_actual: Number(row.stock_actual ?? 0),
    stock_reservado: Number(row.stock_reservado ?? 0),
    stock_minimo: Number(row.stock_minimo ?? 0),
    created_at: row.created_at ?? undefined,
  }
}

/**
 * Obtiene lista paginada o buscada de productos
 */
export async function buscarProductos(query?: string): Promise<Producto[]> {
  const supabase = await createClient()
  let builder = supabase.from('productos').select('*').order('nombre', { ascending: true })

  if (query && query.trim() !== '') {
    const term = `%${query.trim()}%`
    builder = builder.or(`sku.ilike.${term},nombre.ilike.${term}`)
  }

  const { data, error } = await builder.limit(20)

  if (error) {
    console.error('Error al buscar productos:', error)
    return []
  }

  return (data ?? []).map(normalizarProducto)
}

/**
 * Obtiene un producto individual por su ID o SKU
 */
export async function obtenerProductoPorId(id: string): Promise<Producto | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return normalizarProducto(data)
}

/**
 * Crear o editar un producto en el catálogo
 */
export async function guardarProducto(producto: ProductoInsert): Promise<{ success: boolean; data?: Producto; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos')
    .upsert(producto)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: normalizarProducto(data) }
}