'use client';

import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, Truck, FileCheck, Search, Eye, Package } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { OrdenCompra } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function AdminComprasPage() {
  const { ordenesCompra, facturasCompras, recepcionarOCYFacturaProveedor, actualizarEstadoOC } = useAgroErp();

  const [search, setSearch] = useState('');
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);
  const [isRecepcionModalOpen, setIsRecepcionModalOpen] = useState(false);
  const [numeroFacturaProv, setNumeroFacturaProv] = useState('F001-0009842');
  const [montoFactura, setMontoFactura] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredOC = ordenesCompra.filter((oc) =>
    oc.numero.toLowerCase().includes(search.toLowerCase()) ||
    oc.proveedor_razon_social.toLowerCase().includes(search.toLowerCase()) ||
    (oc.cotizacion_numero && oc.cotizacion_numero.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenRecepcion = (oc: OrdenCompra) => {
    setSelectedOC(oc);
    setMontoFactura(oc.monto_total);
    setIsRecepcionModalOpen(true);
  };

  const handleConfirmarRecepcion = () => {
    if (!selectedOC || !numeroFacturaProv) return;

    recepcionarOCYFacturaProveedor(selectedOC.id, numeroFacturaProv, montoFactura);
    setIsRecepcionModalOpen(false);
    setSelectedOC(null);
    setSuccessMsg(`Orden de Compra ${selectedOC.numero} marcada como RECIBIDA. Factura ${numeroFacturaProv} registrada y stock actualizado.`);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Módulo de Compras & Abastecimiento a Proveedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de Órdenes de Compra (OC) agrupadas automáticamente por proveedor y registro de facturas de compras.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Órdenes de Compra" value={ordenesCompra.length} icon={ShoppingCart} accent="blue" />
        <StatCard
          label="Enviadas a Proveedores"
          value={ordenesCompra.filter((o) => o.estado === 'ENVIADO').length}
          icon={Truck}
          accent="amber"
        />
        <StatCard
          label="Recibidas en Almacén"
          value={ordenesCompra.filter((o) => o.estado === 'RECIBIDO').length}
          icon={Package}
          accent="emerald"
        />
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número de OC, proveedor o cotización origen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Nº OC / Fecha</th>
                <th className="p-4">Proveedor / RUC</th>
                <th className="p-4">Cotización Origen</th>
                <th className="p-4">Estado OC</th>
                <th className="p-4">Factura Proveedor</th>
                <th className="p-4 text-right">Costo Total</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOC.map((oc) => (
                <tr key={oc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{oc.numero}</span>
                    <span className="text-[10px] text-slate-500">{oc.fecha}</span>
                  </td>

                  <td className="p-4">
                    <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                      {oc.proveedor_razon_social}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">RUC: {oc.proveedor_ruc}</span>
                  </td>

                  <td className="p-4 font-mono text-blue-700 font-bold">
                    {oc.cotizacion_numero || 'Directa'}
                  </td>

                  <td className="p-4">
                    <StatusBadge status={oc.estado} />
                  </td>

                  <td className="p-4">
                    {oc.factura_proveedor_num ? (
                      <span className="font-mono text-slate-800 font-bold">
                        {oc.factura_proveedor_num}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Pendiente entrega</span>
                    )}
                  </td>

                  <td className="p-4 text-right font-bold text-slate-800">
                    S/ {oc.monto_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedOC(oc)}
                        title="Ver detalle de OC"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {oc.estado !== 'RECIBIDO' && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRecepcion(oc)}
                          className="text-[11px] h-7 px-2"
                        >
                          <FileCheck className="w-3 h-3" />
                          Recepcionar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Recepcionar OC y Registrar Factura de Proveedor */}
      {isRecepcionModalOpen && selectedOC && (
        <Modal
          isOpen={isRecepcionModalOpen}
          onClose={() => setIsRecepcionModalOpen(false)}
          title={`Recepcionar Orden de Compra: ${selectedOC.numero}`}
          description={`Proveedor: ${selectedOC.proveedor_razon_social}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Ítems que ingresarán al almacén:</span>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                {selectedOC.detalles.map((d, i) => (
                  <li key={i}>
                    {d.cantidad}x {d.producto_nombre} (Costo: S/ {d.costo_unitario.toLocaleString('es-PE')})
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Número de Factura emitida por el Proveedor:
              </label>
              <input
                type="text"
                required
                placeholder="Ej. F001-0004521"
                value={numeroFacturaProv}
                onChange={(e) => setNumeroFacturaProv(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto Total Facturado (S/):
              </label>
              <input
                type="number"
                value={montoFactura}
                onChange={(e) => setMontoFactura(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
              Al confirmar, la Orden de Compra cambiará a <strong>RECIBIDO</strong>, se creará el registro en Cuentas por Pagar y se incrementará automáticamente el stock de los productos.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsRecepcionModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarRecepcion}>
                Confirmar Recepción y Stock
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Ver Detalle OC */}
      {selectedOC && !isRecepcionModalOpen && (
        <Modal
          isOpen={Boolean(selectedOC)}
          onClose={() => setSelectedOC(null)}
          title={`Orden de Compra: ${selectedOC.numero}`}
          description={`Proveedor: ${selectedOC.proveedor_razon_social} (RUC: ${selectedOC.proveedor_ruc})`}
        >
          <div className="space-y-4 text-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2">Producto</th>
                  <th className="p-2 text-center">Cant.</th>
                  <th className="p-2 text-right">Costo Unit</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedOC.detalles.map((d, i) => (
                  <tr key={i}>
                    <td className="p-2 font-medium">{d.producto_nombre}</td>
                    <td className="p-2 text-center font-bold">{d.cantidad}</td>
                    <td className="p-2 text-right">S/ {d.costo_unitario.toLocaleString('es-PE')}</td>
                    <td className="p-2 text-right font-bold">S/ {d.subtotal.toLocaleString('es-PE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Orden de Compra:</span>
              <span className="text-emerald-700">S/ {selectedOC.monto_total.toLocaleString('es-PE')}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelectedOC(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
