'use client';

import React, { useState } from 'react';
import { Package, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Producto } from '@/types/db';

export function InventarioClient({ productos }: { productos: Producto[] }) {
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('TODAS');

  const filtered = productos.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoria === 'TODAS' || p.categoria === categoria;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catálogo de Productos & Control de Stock</h1>
          <p className="text-xs text-slate-500 mt-1">Fertilizantes, semillas, agroquímicos y herramientas.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
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
          <option value="FERTILIZANTE">Fertilizante</option>
          <option value="SEMILLA">Semilla</option>
          <option value="AGROQUIMICO">Agroquímico</option>
          <option value="HERRAMIENTA">Herramienta</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">SKU / Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4 text-right">Último Costo</th>
                <th className="p-4 text-right">Precio Venta</th>
                <th className="p-4 text-center">Stock (disp. / reservado)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Package} title="No se encontraron productos" description="Ajusta la búsqueda o el filtro de categoría." />
                  </td>
                </tr>
              )}
              {filtered.map((prod) => {
                const stockActual = prod.stock_actual ?? 0;
                const stockReservado = prod.stock_reservado ?? 0;
                const stockMinimo = prod.stock_minimo ?? 0;
                const disponible = stockActual - stockReservado;
                const bajoMinimo = disponible <= stockMinimo;
                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block mb-1">
                        {prod.sku}
                      </span>
                      <span className="font-bold text-slate-900 block max-w-sm leading-snug">{prod.nombre}</span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{prod.categoria}</td>
                    <td className="p-4 text-right text-slate-500">
                      S/ {(prod.ultimo_costo_compra ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-700">
                      S/ {(prod.precio_venta ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-lg border ${
                          bajoMinimo ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-900 bg-slate-100 border-slate-200'
                        }`}
                      >
                        {disponible} / {stockReservado} {prod.unidad_medida}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
