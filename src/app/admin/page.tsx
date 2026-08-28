import Link from 'next/link';
import { FileText, ShoppingCart, Wrench, Receipt, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { createClient } from '@/lib/supabase/server';
import { getCotizaciones } from '@/lib/queries/cotizaciones';
import { getComprobantesSunat } from '@/lib/queries/comprobantes';
import { getMetricas } from '@/lib/queries/metricas';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [cotizaciones, comprobantes, metricas] = await Promise.all([
    getCotizaciones(supabase),
    getComprobantesSunat(supabase),
    getMetricas(supabase),
  ]);

  const ultimasCotizaciones = cotizaciones.slice(0, 5);
  const ultimosComprobantes = comprobantes.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Centro de Operaciones ERP</span>
            <span className="text-[10px] bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full font-bold">Producción Agrícola</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Panel de Control General • AgroFertil</h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
            Monitoreo en tiempo real de cotizaciones, abastecimiento a proveedores, facturación electrónica SUNAT e instalaciones en campo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/cotizador">
            <Button className="bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs shadow-md border-0">
              <FileText className="w-4 h-4 text-emerald-700" />
              Nueva Cotización
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Facturado SUNAT" value={`S/ ${metricas.totalVentasFacturadas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} icon={Receipt} accent="emerald" hint="Comprobantes ACEPTADOS" />
        <StatCard label="Cotizaciones Enviadas" value={metricas.cotizacionesPendientesCount} icon={FileText} accent="amber" hint="Esperando decisión del cliente" />
        <StatCard label="Órdenes de Compra" value={metricas.ordenesCompraEnTransito} icon={ShoppingCart} accent="blue" hint="Enviadas a proveedores" />
        <StatCard label="Instalaciones en Campo" value={metricas.ordenesTrabajoActivas} icon={Wrench} accent="emerald" hint="Técnicos registrando bitácora" />
      </div>

      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">Flujo Operativo del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Flujo A: Solo Productos</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Cliente pide productos → se consulta a proveedores → cotización al cliente → aprobación → Órdenes de Compra → pago con voucher → recepción (guía o guía+factura) → guía de remisión al cliente.
            </p>
            <Link href="/admin/cotizaciones" className="inline-flex items-center gap-1 text-blue-700 font-bold text-[11px] hover:underline">
              Gestionar Cotizaciones <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Flujo B: Proyecto de Instalación (Mesa)</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Cotización aprobada → Órdenes de Compra → asignación de técnico → bitácora y firma en campo → factura final SUNAT.
            </p>
            <Link href="/admin/ordenes-trabajo" className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] hover:underline">
              Ver Módulo Técnico en Campo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cotizaciones Comerciales Recientes</h3>
              <p className="text-xs text-slate-500">Pedidos generados desde el portal o ventas</p>
            </div>
            <Link href="/admin/cotizaciones">
              <Button size="sm" variant="outline" className="text-xs border-slate-300 bg-white text-slate-700">
                Ver Todas
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Código / Fecha</th>
                  <th className="p-4">Cliente / RUC</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Total (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimasCotizaciones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Sin cotizaciones todavía.
                    </td>
                  </tr>
                )}
                {ultimasCotizaciones.map((cot) => (
                  <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{cot.codigo ?? '(generando...)'}</span>
                      <span className="text-[10px] text-slate-500">{cot.fecha_emision ? new Date(cot.fecha_emision).toLocaleDateString('es-PE') : ''}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block truncate max-w-[180px]">{cot.clientes?.razon_social}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {cot.clientes?.tipo_doc}: {cot.clientes?.num_doc}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.tipo_operacion} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.estado} />
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-700">
                      S/ {(cot.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Comprobantes SUNAT</h3>
              <p className="text-xs text-slate-500">Facturación electrónica oficial</p>
            </div>
            <Link href="/admin/sunat">
              <span className="text-xs text-emerald-700 hover:underline font-bold">Ver todos</span>
            </Link>
          </div>
          <div className="space-y-3">
            {ultimosComprobantes.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sin comprobantes aún.</p>}
            {ultimosComprobantes.map((cpe) => (
              <div key={cpe.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {cpe.serie}-{cpe.numero}
                  </span>
                  <StatusBadge status={cpe.estado_sunat ?? 'ACEPTADO'} />
                </div>
                <div className="text-xs text-slate-700 font-medium truncate">{cpe.clientes?.razon_social}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>{cpe.created_at ? new Date(cpe.created_at).toLocaleDateString('es-PE') : ''}</span>
                  <span className="font-bold text-emerald-700">S/ {cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
