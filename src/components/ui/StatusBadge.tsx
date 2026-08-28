import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  // CotizacionEstado (real, supabase/erp_schema.sql)
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  BORRADOR: 'bg-slate-100 text-slate-600 border-slate-200',
  ENVIADA: 'bg-amber-50 text-amber-700 border-amber-200',
  APROBADA: 'bg-blue-50 text-blue-700 border-blue-200',
  RECHAZADA: 'bg-rose-50 text-rose-700 border-rose-200',
  VENCIDA: 'bg-slate-100 text-slate-500 border-slate-200',
  AJUSTE_REQUERIDO: 'bg-amber-50 text-amber-700 border-amber-200',
  // legado (mock, en desuso)
  EN_COMPRAS: 'bg-violet-50 text-violet-700 border-violet-200',
  EN_INSTALACION: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  FACTURADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // OrdenCompraEstado (real)
  PENDIENTE_PAGO: 'bg-amber-50 text-amber-700 border-amber-200',
  PAGADA: 'bg-blue-50 text-blue-700 border-blue-200',
  ENVIADO: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMADA: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  PARCIAL: 'bg-orange-50 text-orange-700 border-orange-200',
  RECIBIDA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECIBIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELADA: 'bg-slate-100 text-slate-500 border-slate-200',
  // OrdenTrabajoEstado (real)
  CREADA: 'bg-slate-100 text-slate-600 border-slate-200',
  EN_PROGRESO: 'bg-amber-50 text-amber-700 border-amber-200',
  EN_PROCESO: 'bg-amber-50 text-amber-700 border-amber-200',
  PAUSADA: 'bg-slate-100 text-slate-500 border-slate-200',
  COMPLETADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FINALIZADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // ComprobanteSunatEstado
  ACEPTADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADO: 'bg-rose-50 text-rose-700 border-rose-200',
  OBSERVADO: 'bg-amber-50 text-amber-700 border-amber-200',
  ANULADO: 'bg-slate-100 text-slate-600 border-slate-200',
  // CotizacionTipoOperacion (real)
  PRODUCTO: 'bg-blue-50 text-blue-700 border-blue-200',
  PROYECTO_MESA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // legado
  VENTA_ARMADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SOLO_VENTA: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  VENTA_ARMADO: 'Venta + Armado',
  SOLO_VENTA: 'Solo Venta',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap',
        style,
        className
      )}
    >
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}
