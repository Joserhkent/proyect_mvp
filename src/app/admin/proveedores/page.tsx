'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Search, Phone, Mail, MapPin, Building, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buscarProveedores } from '@/lib/services/proveedores';
import type { Proveedor } from '@/types/erp';

export default function AdminProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Búsqueda remota con debounce
  useEffect(() => {
    let active = true;

    async function cargarProveedores() {
      setLoading(true);
      const data = await buscarProveedores(search);
      if (active) {
        setProveedores(data);
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      cargarProveedores();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Directorio de Proveedores Agrícolas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Empresas proveedoras de bombas, tuberías, controladores de fertirriego y fertilizantes.
          </p>
        </div>
      </div>

      {/* Search Bar */}
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

      {/* Grid o Estado de Carga */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Buscando proveedores...</span>
          </div>
        </div>
      ) : proveedores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <EmptyState
            icon={Truck}
            title="No se encontraron proveedores"
            description="Ajusta la búsqueda para encontrar el proveedor que buscas."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proveedores.map((prov) => (
            <div
              key={prov.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    RUC: {prov.ruc}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                    {prov.razon_social}
                  </h3>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-200 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {prov.contacto && (
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Contacto: <strong className="text-slate-800">{prov.contacto}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{prov.email}</span>
                </div>
                {prov.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prov.telefono}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-500">
                    {prov.direccion || 'Sin dirección registrada'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}