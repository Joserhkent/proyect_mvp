import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase/server';
import { getMetricas } from '@/lib/queries/metricas';
import { getUsuarioActual } from '@/lib/queries/usuarios';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [metricas, usuario] = await Promise.all([getMetricas(supabase), getUsuarioActual(supabase)]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <AdminSidebar metricas={metricas} usuarioNombre={usuario?.nombre ?? 'Usuario'} usuarioRol={usuario?.rol ?? ''} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
