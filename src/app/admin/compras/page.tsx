'use client';

import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, Truck, FileCheck, Search, Eye, Package, CreditCard, Send, Download } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { OrdenCompra } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { exportarExcel } from '@/lib/exportExcel';

export default function AdminComprasPage() {
  const { ordenesCompra, facturasCompras, recepcionarOCYFacturaProveedor, actualizarEstadoOC, registrarPagoOC } = useAgroErp();

  const [search, setSearch] = useState('');
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);
  const [isRecepcionModalOpen, setIsRecepcionModalOpen] = useState(false);
  const [entregaCompleta, setEntregaCompleta] = useState(true);
  const [numeroFacturaProv, setNumeroFacturaProv] = useState('F001-0009842');
  const [montoFactura, setMontoFactura] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredOC = ordenesCompra.filter((oc) =>
    oc.numero.toLowerCase().includes(search.toLowerCase()) ||
    oc.proveedor_razon_social.toLowerCase().includes(search.toLowerCase()) ||
    (oc.cotizacion_numero && oc.cotizacion_numero.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExportarExcel = () => {
    exportarExcel(
      'ordenes-compra',
      'Órdenes de Compra',
      [
        { header: 'Número', key: 'numero', valor: (oc: OrdenCompra) => oc.numero },
        { header: 'Fecha', key: 'fecha', valor: (oc: OrdenCompra) => oc.fecha ?? '' },
        { header: 'Proveedor', key: 'proveedor', valor: (oc: OrdenCompra) => oc.proveedor_razon_social },
        { header: 'RUC Proveedor', key: 'ruc', valor: (oc: OrdenCompra) => oc.proveedor_ruc ?? '' },
        { header: 'Cotización Origen', key: 'cotizacion', valor: (oc: OrdenCompra) => oc.cotizacion_numero ?? '' },
        { header: 'Estado', key: 'estado', valor: (oc: OrdenCompra) => oc.estado },
        { header: 'Factura Proveedor', key: 'factura', valor: (oc: OrdenCompra) => oc.factura_proveedor_num ?? '' },
        { header: 'Moneda', key: 'moneda', valor: (oc: OrdenCompra) => oc.moneda },
        { header: 'Monto Total', key: 'monto', valor: (oc: OrdenCompra) => oc.monto_total, formatoNumero: '#,##0.00' },
      ],
      filteredOC
    );
  };

  const handleOpenRecepcion = (oc: OrdenCompra) => {
    setSelectedOC(oc);
    setMontoFactura(oc.monto_total);
    setEntregaCompleta(true);
    setIsRecepcionModalOpen(true);
  };

  const handleRegistrarPago = async () => {
    if (!selectedOC || !voucherFile) return;
    const success = await registrarPagoOC(selectedOC.id, voucherFile);
    if (success) {
      setIsPagoModalOpen(false);
      setSuccessMsg(`Pago registrado para ${selectedOC.numero}. La orden está lista para enviarse al proveedor.`);
      setVoucherFile(null);
      setSelectedOC(null);
    }
  };

  const handleConfirmarRecepcion = async () => {
    if (!selectedOC) return;
    if (entregaCompleta && !numeroFacturaProv) return;

    setIsProcessing(true);
    try {
      await recepcionarOCYFacturaProveedor(
        selectedOC.id,
        entregaCompleta,
        entregaCompleta ? numeroFacturaProv : undefined,
        entregaCompleta ? montoFactura : undefined
      );
      setIsRecepcionModalOpen(false);
      setSuccessMsg(
        entregaCompleta
          ? `Orden de Compra ${selectedOC.numero} marcada como RECIBIDA. Guía + Factura ${numeroFacturaProv} registrada y stock actualizado.`
          : `Orden de Compra ${selectedOC.numero} marcada como PARCIAL: solo llegó la guía, la factura está pendiente. El stock se actualizará cuando confirmes la entrega completa.`
      );
      setSelectedOC(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Módulo de Compras & Abastecimiento a Proveedores
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de Órdenes de Compra (OC) agrupadas automáticamente por proveedor y registro de facturas de compras.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
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
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número de OC, proveedor o cotización origen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleExportarExcel}
          className="text-xs border-slate-300 bg-white text-slate-700 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar Excel
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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

                      {oc.estado === 'PENDIENTE_PAGO' && (
                        <Button
                          size="sm"
                          onClick={() => { setSelectedOC(oc); setVoucherFile(null); setIsPagoModalOpen(true); }}
                          className="text-[11px] h-7 px-2"
                        >
                          <CreditCard className="w-3 h-3" />
                          Registrar pago
                        </Button>
                      )}

                      {oc.estado === 'PAGADO' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actualizarEstadoOC(oc.id, 'ENVIADO')}
                          className="text-[11px] h-7 px-2"
                        >
                          <Send className="w-3 h-3" />
                          Enviar al proveedor
                        </Button>
                      )}

                      {(oc.estado === 'ENVIADO' || oc.estado === 'PARCIAL') && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRecepcion(oc)}
                          className="text-[11px] h-7 px-2"
                        >
                          <FileCheck className="w-3 h-3" />
                          {oc.estado === 'PARCIAL' ? 'Completar recepción' : 'Recepcionar'}
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
      {isPagoModalOpen && selectedOC && (
        <Modal
          isOpen={isPagoModalOpen}
          onClose={() => setIsPagoModalOpen(false)}
          title={`Registrar pago: ${selectedOC.numero}`}
          description={`Proveedor: ${selectedOC.proveedor_razon_social}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-orange-900">
              La orden pasará a <strong>PAGADO</strong>. Después podrás enviarla al proveedor.
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Voucher de transferencia</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setVoucherFile(event.target.files?.[0] ?? null)}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1"
              />
              {voucherFile && <p className="mt-1 text-slate-500">Archivo seleccionado: {voucherFile.name}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsPagoModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleRegistrarPago} disabled={!voucherFile}>
                <CreditCard className="w-3.5 h-3.5" />
                Confirmar pago
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Recepcionar OC y Registrar Factura de Proveedor */}
      {isRecepcionModalOpen && selectedOC && (
        <Modal
          isOpen={isRecepcionModalOpen}
          onClose={() => setIsRecepcionModalOpen(false)}
          title={`Recepcionar Orden de Compra: ${selectedOC.numero}`}
          description={`Proveedor: ${selectedOC.proveedor_razon_social}`}
        >
          <div className="space-y-4 text-sm">
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
              <label className="block font-semibold text-slate-700 mb-2">
                ¿El proveedor entregó todos los productos de esta orden?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEntregaCompleta(true)}
                  className={`flex-1 p-2.5 rounded-xl border font-bold transition ${
                    entregaCompleta
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Sí, entrega completa
                </button>
                <button
                  type="button"
                  onClick={() => setEntregaCompleta(false)}
                  className={`flex-1 p-2.5 rounded-xl border font-bold transition ${
                    !entregaCompleta
                      ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  No, solo llegó parte
                </button>
              </div>
            </div>

            {entregaCompleta ? (
              <>
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
                  Al confirmar, la Orden de Compra cambiará a <strong>RECIBIDO</strong>, se registrará la Guía + Factura del
                  proveedor en Cuentas por Pagar y se incrementará automáticamente el stock de los productos.
                </div>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                El proveedor solo entregó la <strong>guía de remisión</strong>; la factura todavía no llega. La Orden de
                Compra quedará en estado <strong>PARCIAL</strong> y el stock no se actualizará hasta que confirmes la
                entrega completa (podrás volver a &quot;Completar recepción&quot; cuando llegue el resto).
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsRecepcionModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarRecepcion} isLoading={isProcessing}>
                {entregaCompleta ? 'Confirmar Recepción y Stock' : 'Registrar Recepción Parcial'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Ver Detalle OC */}
      {selectedOC && !isRecepcionModalOpen && !isPagoModalOpen && (
        <Modal
          isOpen={Boolean(selectedOC)}
          onClose={() => setSelectedOC(null)}
          title={`Orden de Compra: ${selectedOC.numero}`}
          description={`Proveedor: ${selectedOC.proveedor_razon_social} (RUC: ${selectedOC.proveedor_ruc})`}
        >
          <div className="space-y-4 text-sm">
            <table className="w-full text-left text-sm">
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
