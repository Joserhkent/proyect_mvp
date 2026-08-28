'use client';

import React, { useState } from 'react';
import { Truck, Search, Phone, Mail, MapPin, Building, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Proveedor } from '@/types/db';

export function ProveedoresClient({ proveedores }: { proveedores: Proveedor[] }) {
  const [search, setSearch] = useState('');

  const filtered = proveedores.filter(
    (p) =>
      p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      p.ruc.includes(search) ||
      (p.contacto ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Proveedores</h1>
          <p className="text-xs text-slate-500 mt-1">
            Empresas proveedoras consultadas para cotizar cada pedido de cliente.
          </p>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, RUC o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <EmptyState icon={Truck} title="No se encontraron proveedores" description="Ajusta la búsqueda para encontrar el proveedor que buscas." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prov) => (
            <div key={prov.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    RUC: {prov.ruc}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{prov.razon_social}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-200">
                  <Truck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {prov.contacto && (
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contacto: <strong className="text-slate-800">{prov.contacto}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prov.email}</span>
                </div>
                {prov.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prov.telefono}</span>
                  </div>
                )}
                {prov.direccion && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-500">{prov.direccion}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Entrega estimada: <strong className="text-slate-800">{prov.dias_entrega_estimados ?? '—'} días</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
