import { createClient } from '@/lib/supabase/server';
import { getClientes } from '@/lib/queries/clientes';
import { ClientesClient } from './ClientesClient';

export default async function AdminClientesPage() {
  const supabase = await createClient();
  const [clientes, { data: cotizaciones }] = await Promise.all([
    getClientes(supabase),
    supabase.from('cotizaciones').select('cliente_id'),
  ]);

  const cotizacionesPorCliente: Record<string, number> = {};
  for (const cot of cotizaciones ?? []) {
    cotizacionesPorCliente[cot.cliente_id] = (cotizacionesPorCliente[cot.cliente_id] ?? 0) + 1;
  }

  return <ClientesClient clientes={clientes} cotizacionesPorCliente={cotizacionesPorCliente} />;
}
