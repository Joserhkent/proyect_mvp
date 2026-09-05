'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserCheck, Truck, ArrowLeft } from 'lucide-react';

// Importación de pantallas desde las subcarpetas locales
import CotizadorClientePage from './cliente/page'; 
import CotizadorProveedorPage from './proveedor/page';

export default function CotizadorSelectorPage() {
  const [tabActiva, setTabActiva] = useState<'cliente' | 'proveedor'>('cliente');

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Botón para regresar a la lista general de cotizaciones */}
      <div>
        <Link
          href="/admin/cotizaciones"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Cotizaciones
        </Link>
      </div>

      {/* Encabezado Principal */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Módulo de Cotizaciones</h1>
        <p className="text-xs text-slate-500 mt-1">
          Selecciona la modalidad de operación para alternar entre pantallas.
        </p>
      </div>

      {/* Contenedor Selector de Pantallas (Tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {/* Tab 1: Cotizar a Cliente */}
        <button
          type="button"
          onClick={() => setTabActiva('cliente')}
          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
            tabActiva === 'cliente'
              ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20'
              : 'bg-transparent border-transparent hover:bg-white/60 text-slate-600'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              tabActiva === 'cliente'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cotización a Cliente</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Propuestas comerciales con precios de venta y catálogo/armados.
            </p>
          </div>
        </button>

        {/* Tab 2: Cotizar / Requerir a Proveedores */}
        <button
          type="button"
          onClick={() => setTabActiva('proveedor')}
          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
            tabActiva === 'proveedor'
              ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-transparent border-transparent hover:bg-white/60 text-slate-600'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              tabActiva === 'proveedor'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Solicitud a Proveedores</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Requerimientos de insumos o materiales para costos de compra.
            </p>
          </div>
        </button>
      </div>

      {/* RENDERIZADO CONDICIONAL DE PANTALLAS */}
      <div className="pt-2">
        {tabActiva === 'cliente' && (
          <div className="animate-in fade-in-50 duration-200">
            <CotizadorClientePage />
          </div>
        )}

        {tabActiva === 'proveedor' && (
          <div className="animate-in fade-in-50 duration-200">
            <CotizadorProveedorPage />
          </div>
        )}
      </div>
    </div>
  );
}