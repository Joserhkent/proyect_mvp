import { createClient } from '@/lib/supabase/server';
import { getProductos } from '@/lib/queries/productos';
import { InventarioClient } from './InventarioClient';

export default async function AdminInventarioPage() {
  const supabase = await createClient();
  const productos = await getProductos(supabase);
  return <InventarioClient productos={productos} />;
}
