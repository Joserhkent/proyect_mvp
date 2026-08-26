'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-900">SOLUCIONES DE AUTOMATIZACIÓN AGRÍCOLA</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-mono">RUC: 20601234567</span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            SUNAT: Modo Pruebas
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/cotizador">
          <Button size="sm" variant="outline" className="text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Cotización</span>
          </Button>
        </Link>

        <Link href="/tecnico">
          <Button size="sm" className="text-xs font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>Portal Técnico</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
