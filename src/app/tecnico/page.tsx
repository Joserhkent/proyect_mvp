import { createClient } from '@/lib/supabase/server';
import { getOrdenesTrabajo } from '@/lib/queries/ordenesTrabajo';
import { TecnicoClient } from './TecnicoClient';

export default async function TecnicoCampoPage() {
  const supabase = await createClient();
  const ordenesTrabajo = await getOrdenesTrabajo(supabase);
  return <TecnicoClient ordenesTrabajo={ordenesTrabajo} />;
}
