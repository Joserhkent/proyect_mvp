import { createClient } from '@/lib/supabase/client';
import { Kit } from '@/types/erp';

/**
 * Obtiene la lista de Kits / Armados junto con sus componentes y datos del producto
 */
export async function obtenerKitsConDetalles(): Promise<Kit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kits')
    .select(`
      *,
      detalles:kit_detalles (
        id,
        kit_id,
        producto_id,
        cantidad,
        producto:productos (
          id,
          nombre,
          sku,
          ultimo_precio_venta
        )
      )
    `)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener kits:', error);
    throw new Error('No se pudieron obtener los armados/kits configurados.');
  }

  return (data as unknown as Kit[]) || [];
}

/**
 * Obtiene un Kit específico por su ID con todos sus detalles
 */
export async function obtenerKitPorId(id: string): Promise<Kit | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kits')
    .select(`
      *,
      detalles:kit_detalles (
        id,
        kit_id,
        producto_id,
        cantidad,
        producto:productos (
          id,
          nombre,
          sku,
          ultimo_precio_venta
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error al obtener el kit con id ${id}:`, error);
    return null;
  }

  return (data as unknown as Kit) || null;
}