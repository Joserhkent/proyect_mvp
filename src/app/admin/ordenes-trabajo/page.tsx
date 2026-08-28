import { createClient } from '@/lib/supabase/server';
import { getOrdenesTrabajo } from '@/lib/queries/ordenesTrabajo';
import { OrdenesTrabajoClient } from './OrdenesTrabajoClient';

export default async function AdminOrdenesTrabajoPage() {
  const supabase = await createClient();
  const ordenesTrabajo = await getOrdenesTrabajo(supabase);
  return <OrdenesTrabajoClient ordenesTrabajo={ordenesTrabajo} />;
}
