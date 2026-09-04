'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CotizadorProveedorPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <Link
        href="/cotizador"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Módulo de Cotizaciones
      </Link>
      <h1 className="text-xl font-black text-slate-900">Cotización a Proveedores</h1>
      <p className="text-xs text-slate-500">
        Módulo en construcción.
      </p>
    </div>
  );
}
