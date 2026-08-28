import { createClient } from '@/lib/supabase/server';
import { getProveedores } from '@/lib/queries/proveedores';
import { ProveedoresClient } from './ProveedoresClient';

export default async function AdminProveedoresPage() {
  const supabase = await createClient();
  const proveedores = await getProveedores(supabase);
  return <ProveedoresClient proveedores={proveedores} />;
}
