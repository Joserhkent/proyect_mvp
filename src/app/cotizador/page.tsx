'use client';

import React from 'react';
import Link from 'next/link';
import { UserCheck, Truck, ArrowRight } from 'lucide-react';

export default function CotizadorSelectorPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Módulo de Cotizaciones</h1>
        <p className="text-xs text-slate-500 mt-1">
          Selecciona el tipo de operación que deseas realizar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción 1: Cotizar a Cliente */}
        <Link href="/cotizador/cliente" className="group">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-500 transition-all cursor-pointer h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Cotización a Cliente</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Genera una propuesta comercial seleccionando productos de tu catálogo con precios de venta.
                </p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-sky-600 mt-6 group-hover:translate-x-1 transition-transform">
              Ir a Cotizador Cliente <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        {/* Opción 2: Cotizar / Requerir a Proveedores */}
        <Link href="/cotizador/proveedor" className="group">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Solicitud a Proveedores</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Crea un requerimiento de insumos o materiales para solicitar cotizaciones de costo a proveedores.
                </p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-emerald-600 mt-6 group-hover:translate-x-1 transition-transform">
              Ir a Solicitud Proveedores <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}