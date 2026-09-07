'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShoppingCart, Wrench, Receipt, ChevronRight, Sprout } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function AdminDashboardPage() {
  const { cotizaciones, comprobantesSunat, metricas } = useAgroErp();

  const ultimasCotizaciones = cotizaciones.slice(0, 5);
  const ultimosComprobantes = comprobantesSunat.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-lg shadow-emerald-950/10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col justify-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-lime-300">
                Centro de Operaciones ERP
              </span>
              <span className="text-[10px] bg-lime-400 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                Producción Agrícola
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Panel de Control General • AgroFertil
            </h1>
            <p className="text-sm text-emerald-100 mt-1.5 max-w-xl leading-relaxed">
              Monitoreo en tiempo real de cotizaciones, abastecimiento a proveedores, facturación electrónica SUNAT e instalaciones en campo.
            </p>
          </div>

          <div>
            <Link href="/cotizador">
              <Button className="rounded-full bg-lime-400 hover:bg-lime-300 text-emerald-950 font-bold text-xs shadow-md border-0">
                <FileText className="w-4 h-4" />
                Nueva Cotización
              </Button>
            </Link>
          </div>
        </div>

        {/* Ilustración decorativa */}
        <div className="hidden lg:block relative min-h-[220px]">
          <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="dashCielo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f4a30" />
                <stop offset="100%" stopColor="#0a3322" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="400" height="260" fill="url(#dashCielo)" />
            <circle cx="330" cy="60" r="46" fill="#bef264" opacity="0.12" />
            <circle cx="330" cy="60" r="26" fill="#bef264" opacity="0.18" />
            <path d="M0,150 L60,110 L120,145 L190,100 L260,150 L320,120 L400,150 L400,260 L0,260 Z" fill="#134e33" />
            <path d="M0,190 C90,165 160,205 240,180 C300,162 350,190 400,175 L400,260 L0,260 Z" fill="#0d3b25" />
            {[
              [70, 210],
              [150, 225],
              [230, 205],
              [310, 222],
            ].map(([cx, cy], i) => (
              <g key={i} opacity="0.85">
                <circle cx={cx} cy={cy} r="3.5" fill="#d9f99d" />
                {[0, 60, 120, 180, 240, 300].map((ang) => {
                  const rad = (ang * Math.PI) / 180;
                  return (
                    <line
                      key={ang}
                      x1={cx}
                      y1={cy}
                      x2={(cx + Math.cos(rad) * 13).toFixed(2)}
                      y2={(cy + Math.sin(rad) * 13).toFixed(2)}
                      stroke="#d9f99d"
                      strokeWidth="1.4"
                      opacity="0.6"
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Facturado SUNAT"
          value={`S/ ${metricas.totalVentasFacturadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          accent="emerald"
          hint="Con CDR oficial SUNAT"
        />
        <StatCard
          label="Cotizaciones Pendientes"
          value={metricas.cotizacionesPendientesCount}
          icon={FileText}
          accent="amber"
          hint="Requieren validación o aprobación"
        />
        <StatCard
          label="Órdenes de Compra"
          value={metricas.ordenesCompraEnTransito}
          icon={ShoppingCart}
          accent="blue"
          hint="Enviadas a proveedores agrícolas"
        />
        <StatCard
          label="Instalaciones en Campo"
          value={metricas.ordenesTrabajoActivas}
          icon={Wrench}
          accent="lime"
          hint="Técnicos registrando bitácora"
        />
      </div>

      {/* Main Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Quotes (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-emerald-900/5 shadow-[0_2px_12px_-4px_rgba(6,78,59,0.08)] overflow-hidden">
          <div className="p-5 border-b border-emerald-900/5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-emerald-950">Cotizaciones Comerciales Recientes</h3>
              <p className="text-sm text-slate-500">Prospectos y pedidos generados desde la web o ventas</p>
            </div>
            <Link href="/admin/cotizaciones">
              <Button size="sm" variant="outline" className="text-xs rounded-full border-emerald-900/10 bg-white text-emerald-900">
                Ver Todas
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/60 text-emerald-900/60 uppercase font-bold text-[10px] border-b border-emerald-900/5">
                <tr>
                  <th className="p-4">Nº / Fecha</th>
                  <th className="p-4">Cliente / RUC</th>
                  <th className="p-4">Tipo Operación</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Total (S/)</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/5">
                {ultimasCotizaciones.map((cot) => (
                  <tr key={cot.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-emerald-950 block">{cot.numero}</span>
                      <span className="text-[10px] text-slate-500">{cot.fecha}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                        {cot.cliente_razon_social}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {cot.cliente_tipo_doc}: {cot.cliente_num_doc}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.tipo_operacion} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.estado} />
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-700">
                      S/ {cot.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <Link href="/admin/cotizaciones">
                        <button className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center justify-end gap-0.5 w-full">
                          Gestionar <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUNAT Invoices Feed (1 col) — tarjeta de acento oscuro */}
        <div className="bg-gradient-to-b from-emerald-900 to-emerald-950 rounded-2xl shadow-lg shadow-emerald-950/10 p-5 space-y-4 text-white relative overflow-hidden">
          <Sprout className="absolute -top-4 -right-4 w-24 h-24 text-lime-400/10" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
            <div>
              <h3 className="text-base font-bold text-white">Comprobantes SUNAT</h3>
              <p className="text-sm text-emerald-200/70">Facturación electrónica oficial</p>
            </div>
            <Link href="/admin/sunat">
              <span className="text-sm text-lime-300 hover:underline font-bold">Ver todos</span>
            </Link>
          </div>

          <div className="space-y-3 relative z-10">
            {ultimosComprobantes.map((cpe) => (
              <div
                key={cpe.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">
                    {cpe.serie}-{cpe.numero}
                  </span>
                  <StatusBadge status={cpe.estado_sunat} />
                </div>

                <div className="text-sm text-emerald-100/80 font-medium truncate">{cpe.cliente_razon_social}</div>

                <div className="flex items-center justify-between text-[11px] text-emerald-200/60 pt-1 border-t border-white/10">
                  <span>{cpe.fecha_emision}</span>
                  <span className="font-bold text-lime-300">
                    S/ {cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
