import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { OrdenCompra, OrdenCompraDetalle, Proveedor, Producto, FacturaCompra } from '@/types/db';

export type OrdenCompraConProveedor = OrdenCompra & { proveedores: Proveedor | null };

export async function getOrdenesCompra(supabase: SupabaseClient<Database>): Promise<OrdenCompraConProveedor[]> {
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select('*, proveedores(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrdenCompraConProveedor[];
}

export type OrdenCompraCompleta = OrdenCompra & {
  proveedores: Proveedor | null;
  orden_compra_detalles: (OrdenCompraDetalle & { productos: Producto | null })[];
  facturas_compras: FacturaCompra[];
};

export async function getOrdenCompraCompleta(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<OrdenCompraCompleta | null> {
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select('*, proveedores(*), orden_compra_detalles(*, productos(*)), facturas_compras(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrdenCompraCompleta | null;
}
