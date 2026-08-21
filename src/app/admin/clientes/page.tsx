'use client';

import React, { useState } from 'react';
import { Users, Search, Phone, Mail, MapPin } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AdminClientesPage() {
  const { clientes, cotizaciones } = useAgroErp();
  const [search, setSearch] = useState('');

  const filtered = clientes.filter(
    (c) =>
      c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      c.num_doc.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Directorio de Clientes & Fundos Agrícolas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Empresas agroexportadoras, fundos y productores registrados con validación RUC/DNI SUNAT.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, RUC/DNI o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <EmptyState
            icon={Users}
            title="No se encontraron clientes"
            description="Ajusta la búsqueda para encontrar el cliente o fundo que buscas."
          />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cli) => {
          const cotizacionesCliente = cotizaciones.filter((c) => c.cliente_num_doc === cli.num_doc);

          return (
            <div key={cli.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {cli.tipo_doc}: {cli.num_doc}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {cli.estado_contribuyente || 'ACTIVO'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2 leading-snug">{cli.razon_social}</h3>

                <div className="space-y-1 text-xs text-slate-600 pt-2 mt-2 border-t border-slate-100">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-slate-700">{cli.direccion}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700">{cli.email}</span>
                  </div>
                  {cli.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700">{cli.telefono}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Cotizaciones registradas:</span>
                <span className="font-bold text-emerald-700">{cotizacionesCliente.length}</span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
