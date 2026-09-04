'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buscarProductos } from '@/lib/services/productos';
import type { Producto } from '@/types/erp';

export default function AdminInventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('TODAS');

  // Carga inicial y búsqueda remota
  useEffect(() => {
    let active = true;

    async function cargarDatos() {
      setLoading(true);
      const data = await buscarProductos(search);
      if (active) {
        setProductos(data);
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      cargarDatos();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  // Filtro por categoría en cliente
  const filtered = productos.filter((p) => {
    return categoria === 'TODAS' || p.categoria === categoria;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Catálogo de Productos & Control de Stock
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Componentes de mesas de fertilización, tuberías, bombas, sensores e insumos agrícolas.
          </p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por SKU o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        >
          <option value="TODAS">Todas las categorías</option>
          <option value="EQUIPO_FERTILIZACION">Mesas de Fertilización</option>
          <option value="BOMBAS_INYECTORES">Bombas & Inyectores</option>
          <option value="TUBERIAS_VALVULAS">Tuberías & Válvulas</option>
          <option value="INSUMOS_QUIMICOS">Insumos Químicos</option>
          <option value="SENSORES_CONTROLADORES">Sensores & Controladores</option>
          <option value="FERTILIZANTE">Fertilizantes</option>
          <option value="SEMILLA">Semillas</option>
          <option value="AGROQUIMICO">Agroquímicos</option>
          <option value="HERRAMIENTA">Herramientas</option>
          <option value="OTRO">Otros</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">SKU / Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4 text-right">Último Costo</th>
                <th className="p-4 text-right">Precio Ref. Venta</th>
                <th className="p-4 text-center">Stock Actual</th>
                <th className="p-4 text-center">Stock Reservado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Cargando productos...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Package}
                      title="No se encontraron productos"
                      description="Ajusta la búsqueda o el filtro de categoría."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block mb-1">
                        {prod.sku}
                      </span>
                      <span className="font-bold text-slate-900 block max-w-sm leading-snug">
                        {prod.nombre}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600 font-medium">
                      {prod.categoria.replace(/_/g, ' ')}
                    </td>

                    <td className="p-4 text-right text-slate-500">
                      S/ {prod.ultimo_costo_compra.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-right font-bold text-emerald-700">
                      S/ {prod.ultimo_precio_venta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {prod.stock_actual} {prod.unidad_medida}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {prod.stock_reservado} {prod.unidad_medida}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}