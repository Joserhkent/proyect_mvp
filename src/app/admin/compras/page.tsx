import { createClient } from '@/lib/supabase/server';
import { getOrdenesCompra } from '@/lib/queries/ordenesCompra';
import { ComprasClient } from './ComprasClient';

export default async function AdminComprasPage() {
  const supabase = await createClient();
  const ordenes = await getOrdenesCompra(supabase);
  return <ComprasClient ordenes={ordenes} />;
}
