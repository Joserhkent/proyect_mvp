'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Wrench, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAgroErp } from '@/context/AgroErpContext';

export function AdminHeader() {
  const router = useRouter();
  const { usuarioActual, cerrarSesion } = useAgroErp();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function handleCerrarSesion() {
    setCerrandoSesion(true);
    await cerrarSesion();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 h-20 bg-emerald-50/80 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-emerald-950">SOLUCIONES DE AUTOMATIZACIÓN AGRÍCOLA</span>
          <span className="text-emerald-900/20">•</span>
          <span className="text-slate-500 font-mono text-xs">RUC: 20601234567</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/cotizador">
          <Button size="sm" variant="outline" className="text-xs rounded-full bg-white border-emerald-900/10">
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Cotización</span>
          </Button>
        </Link>

        <Link href="/tecnico">
          <Button size="sm" className="text-xs font-bold rounded-full bg-lime-400 hover:bg-lime-300 text-emerald-950 shadow-lime-400/30">
            <Wrench className="w-3.5 h-3.5" />
            <span>Portal Técnico</span>
          </Button>
        </Link>

        <div className="w-px h-6 bg-emerald-900/10" />

        <span className="hidden sm:inline text-xs font-semibold text-emerald-900/60 truncate max-w-[140px]">
          {usuarioActual.nombre || 'Administrador'}
        </span>

        <button
          type="button"
          onClick={handleCerrarSesion}
          disabled={cerrandoSesion}
          title="Cerrar sesión"
          className="p-2 text-emerald-900/50 hover:text-rose-600 hover:bg-white rounded-full border border-emerald-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {cerrandoSesion ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
