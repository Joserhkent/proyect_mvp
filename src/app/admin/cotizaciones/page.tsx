import { createClient } from '@/lib/supabase/server';
import { getCotizaciones } from '@/lib/queries/cotizaciones';
import { getProveedores } from '@/lib/queries/proveedores';
import { getUsuariosPorRol } from '@/lib/queries/usuarios';
import { CotizacionesClient } from './CotizacionesClient';

export default async function AdminCotizacionesPage() {
  const supabase = await createClient();
  const [cotizaciones, proveedores, tecnicos] = await Promise.all([
    getCotizaciones(supabase),
    getProveedores(supabase),
    getUsuariosPorRol(supabase, 'TECNICO'),
  ]);
  return <CotizacionesClient cotizaciones={cotizaciones} proveedores={proveedores} tecnicos={tecnicos} />;
}
