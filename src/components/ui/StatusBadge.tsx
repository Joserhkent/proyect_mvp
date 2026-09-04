import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  // CotizacionEstado
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  APROBADA: 'bg-blue-50 text-blue-700 border-blue-200',
  EN_COMPRAS: 'bg-violet-50 text-violet-700 border-violet-200',
  EN_INSTALACION: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  FACTURADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADA: 'bg-rose-50 text-rose-700 border-rose-200',
  // OrdenCompraEstado
  BORRADOR: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDIENTE_PAGO: 'bg-orange-50 text-orange-700 border-orange-200',
  PAGADO: 'bg-blue-50 text-blue-700 border-blue-200',
  ENVIADO: 'bg-amber-50 text-amber-700 border-amber-200',
  RECIBIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // OrdenTrabajoEstado
  EN_PROCESO: 'bg-amber-50 text-amber-700 border-amber-200',
  FINALIZADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // ComprobanteSunatEstado
  ACEPTADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADO: 'bg-rose-50 text-rose-700 border-rose-200',
  ANULADO: 'bg-slate-100 text-slate-600 border-slate-200',
  // CotizacionTipoOperacion
  VENTA_ARMADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SOLO_VENTA: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
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
