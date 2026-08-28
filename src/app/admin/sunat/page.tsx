import { createClient } from '@/lib/supabase/server';
import { getComprobantesSunat } from '@/lib/queries/comprobantes';
import { SunatClient } from './SunatClient';

export default async function AdminSunatPage() {
  const supabase = await createClient();
  const [comprobantes, { data: despachos }] = await Promise.all([
    getComprobantesSunat(supabase),
    supabase.from('despachos_cliente').select('*').order('fecha_despacho', { ascending: false }),
  ]);
  return <SunatClient comprobantes={comprobantes} despachos={despachos ?? []} />;
}
