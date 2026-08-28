import { createClient } from '@/lib/supabase/server';
import { getProductos } from '@/lib/queries/productos';
import { CotizadorClient } from './CotizadorClient';

export default async function CotizadorPage() {
  const supabase = await createClient();
  const productos = await getProductos(supabase);
  return <CotizadorClient productos={productos} />;
}
