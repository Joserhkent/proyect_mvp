'use client';

import React, { useState, useTransition } from 'react';
import { Search, Eye, Filter, Send, CreditCard, PackageCheck, Ban, Download, FileImage, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { OrdenCompraConProveedor, OrdenCompraCompleta } from '@/lib/queries/ordenesCompra';
import {
  obtenerOrdenCompraCompleta,
  registrarPago,
  confirmarEnvioAlProveedor,
  cancelarOrdenCompra,
  getVoucherSignedUrl,
} from '@/app/actions/ordenesCompra';
import { recepcionarOrdenCompra } from '@/app/actions/recepcion';
import { generarOrdenCompraPDF } from '@/lib/documents';

const ESTADOS = ['BORRADOR', 'PENDIENTE_PAGO', 'PAGADA', 'ENVIADA', 'CONFIRMADA', 'PARCIAL', 'RECIBIDA', 'CANCELADA'];

export function ComprasClient({ ordenes }: { ordenes: OrdenCompraConProveedor[] }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<OrdenCompraCompleta | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [recepcionCantidades, setRecepcionCantidades] = useState<Record<string, string>>({});
  const [facturaSerie, setFacturaSerie] = useState('');
  const [facturaNumero, setFacturaNumero] = useState('');
  const [mostrarRecepcion, setMostrarRecepcion] = useState(false);

  const filtradas = ordenes.filter((o) => {
    const matchSearch =
      (o.codigo ?? '').toLowerCase().includes(search.toLowerCase()) || (o.proveedores?.razon_social ?? '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || o.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  async function abrirDetalle(id: string) {
    setSelectedId(id);
    setIsLoadingDetalle(true);
    setMostrarRecepcion(false);
    setRecepcionCantidades({});
    setFacturaSerie('');
    setFacturaNumero('');
    setVoucherFile(null);
    try {
      const res = await obtenerOrdenCompraCompleta(id);
      setDetalle(res);
    } catch {
      showToast('error', 'No se pudo cargar el detalle de la orden.');
    } finally {
      setIsLoadingDetalle(false);
    }
  }

  function cerrarDetalle() {
    setSelectedId(null);
    setDetalle(null);
  }

  function refrescar() {
    if (selectedId) abrirDetalle(selectedId);
  }

  function handleDescargarPDF() {
    if (!detalle) return;
    generarOrdenCompraPDF({
      codigo: detalle.codigo ?? 'BORRADOR',
      fecha: new Date(detalle.created_at ?? Date.now()).toLocaleDateString('es-PE'),
      moneda: detalle.moneda ?? 'PEN',
      proveedor: { razon_social: detalle.proveedores?.razon_social ?? '', ruc: detalle.proveedores?.ruc ?? '', email: detalle.proveedores?.email },
      detalles: detalle.orden_compra_detalles.map((d) => ({
        nombre: d.productos?.nombre ?? '',
        cantidad: d.cantidad,
        precio_unitario: d.costo_unitario,
        subtotal: d.subtotal,
      })),
      subtotal: detalle.subtotal ?? 0,
      igv: detalle.igv ?? 0,
      total: detalle.total ?? 0,
    });
  }

  function handleRegistrarPago() {
    if (!detalle || !voucherFile) {
      showToast('error', 'Adjunta el archivo del voucher de pago.');
      return;
    }
    const formData = new FormData();
    formData.set('voucher', voucherFile);
    startTransition(async () => {
      try {
        await registrarPago(detalle.id, formData);
        showToast('success', 'Pago registrado y voucher subido.');
        refrescar();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo registrar el pago.');
      }
    });
  }

  function handleConfirmarEnvio() {
    if (!detalle) return;
    startTransition(async () => {
      try {
        await confirmarEnvioAlProveedor(detalle.id);
        showToast('success', 'Orden y voucher de transferencia enviados al proveedor.');
        refrescar();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo confirmar el envío.');
      }
    });
  }

  async function handleVerVoucher() {
    if (!detalle?.voucher_url) return;
    const url = await getVoucherSignedUrl(detalle.voucher_url);
    if (!url) {
      showToast('error', 'No se pudo generar el enlace del voucher.');
      return;
    }
    window.open(url, '_blank');
  }

  function handleCancelar() {
    if (!detalle) return;
    startTransition(async () => {
      try {
        await cancelarOrdenCompra(detalle.id);
        showToast('info', 'Orden de compra cancelada.');
        refrescar();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo cancelar.');
      }
    });
  }

  function handleRecepcionar() {
    if (!detalle) return;
    const lineas = detalle.orden_compra_detalles
      .map((d) => ({ producto_id: d.producto_id, cantidad_recibida: parseInt(recepcionCantidades[d.id] ?? '0', 10) }))
      .filter((l) => l.cantidad_recibida > 0);

    if (lineas.length === 0) {
      showToast('error', 'Ingresa la cantidad recibida de al menos un producto.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await recepcionarOrdenCompra({
          orden_compra_id: detalle.id,
          lineas,
          factura: facturaSerie && facturaNumero ? { serie: facturaSerie, numero: facturaNumero } : undefined,
        });
        showToast(
          'success',
          res.clasificacion === 'GUIA_Y_FACTURA'
            ? 'Entrega completa: se generó GUÍA + FACTURA. Stock actualizado.'
            : 'Entrega parcial: se generó SOLO GUÍA. Stock actualizado.'
        );
        setMostrarRecepcion(false);
        refrescar();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo registrar la recepción.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Órdenes de Compra a Proveedores</h1>
        <p className="text-xs text-slate-500 mt-1">Envío, pago con voucher y recepción de mercadería.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o proveedor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 font-medium">
            <option value="TODOS">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">OC / Fecha</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No se encontraron órdenes de compra.
                  </td>
                </tr>
              ) : (
                filtradas.map((oc) => (
                  <tr key={oc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{oc.codigo ?? '(generando...)'}</span>
                      <span className="text-[10px] text-slate-500">{oc.created_at ? new Date(oc.created_at).toLocaleDateString('es-PE') : ''}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{oc.proveedores?.razon_social}</span>
                      <span className="text-[10px] text-slate-500 font-mono">RUC: {oc.proveedores?.ruc}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={oc.estado} />
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-700 text-sm">
                      {oc.moneda === 'USD' ? '$' : 'S/'} {(oc.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => abrirDetalle(oc.id)} className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <Modal isOpen={Boolean(selectedId)} onClose={cerrarDetalle} title="Detalle de Orden de Compra" maxWidth="xl">
          {isLoadingDetalle || !detalle ? (
            <div className="py-10 text-center text-xs text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-semibold block">Proveedor:</span>
                  <span className="font-bold text-slate-800">{detalle.proveedores?.razon_social}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Estado:</span>
                  <StatusBadge status={detalle.estado} />
                </div>
              </div>

              <div className="space-y-2">
                {detalle.orden_compra_detalles.map((d) => (
                  <div key={d.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{d.productos?.nombre}</span>
                      <span className="text-slate-500 block text-[10px]">
                        Cant: {d.cantidad} x S/ {d.costo_unitario.toLocaleString('es-PE')} • Destino: {d.destino}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700">S/ {d.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>

              {detalle.facturas_compras.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">Comprobantes de recepción</h4>
                  <div className="space-y-1">
                    {detalle.facturas_compras.map((fc) => (
                      <div key={fc.id} className="flex justify-between items-center px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px]">
                        <span>
                          {fc.tipo_comprobante} — {fc.serie}-{fc.numero}
                        </span>
                        <span className="font-bold">S/ {fc.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total OC:</span>
                <span className="text-emerald-700 text-sm">
                  {detalle.moneda === 'USD' ? '$' : 'S/'} {(detalle.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {mostrarRecepcion && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-emerald-900">Registrar recepción de mercadería</h4>
                  {detalle.orden_compra_detalles.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2">
                      <span className="text-slate-700 flex-1 truncate">{d.productos?.nombre} (ordenado: {d.cantidad})</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Cant. recibida"
                        value={recepcionCantidades[d.id] ?? ''}
                        onChange={(e) => setRecepcionCantidades({ ...recepcionCantidades, [d.id]: e.target.value })}
                        className="w-24 text-[10px] p-1.5 rounded-md border border-slate-300"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-emerald-800">
                    Si completas todo lo ordenado se generará GUÍA + FACTURA (indica serie/número abajo); si falta algo, se genera SOLO GUÍA.
                  </p>
                  <div className="flex gap-1.5">
                    <input placeholder="Serie factura" value={facturaSerie} onChange={(e) => setFacturaSerie(e.target.value)} className="flex-1 text-[10px] p-1.5 rounded-md border border-slate-300" />
                    <input placeholder="Número factura" value={facturaNumero} onChange={(e) => setFacturaNumero(e.target.value)} className="flex-1 text-[10px] p-1.5 rounded-md border border-slate-300" />
                  </div>
                  <Button size="sm" disabled={isPending} onClick={handleRecepcionar} className="text-xs w-full">
                    Confirmar recepción
                  </Button>
                </div>
              )}

              {detalle.estado === 'PENDIENTE_PAGO' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
                  <h4 className="font-bold text-slate-900">Registrar pago</h4>

                  <label
                    htmlFor="voucher-file-input"
                    className="flex items-center gap-2.5 p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-500 flex-1">
                      {voucherFile ? (
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 truncate">{voucherFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setVoucherFile(null);
                            }}
                            title="Quitar archivo"
                            className="text-slate-400 hover:text-rose-600 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : (
                        'Haz clic para seleccionar el voucher (imagen o PDF)'
                      )}
                    </span>
                    <input
                      id="voucher-file-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setVoucherFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                  </label>

                  <Button size="sm" disabled={isPending || !voucherFile} onClick={handleRegistrarPago} className="text-xs w-full">
                    <CreditCard className="w-3.5 h-3.5" /> Subir voucher y marcar PAGADA
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={handleDescargarPDF} className="text-xs">
                  <Download className="w-3.5 h-3.5" /> Descargar OC (PDF)
                </Button>
                {detalle.voucher_url && (
                  <Button variant="outline" onClick={handleVerVoucher} className="text-xs">
                    <FileImage className="w-3.5 h-3.5" /> Ver voucher
                  </Button>
                )}
                {detalle.estado === 'PAGADA' && (
                  <Button disabled={isPending} onClick={handleConfirmarEnvio} className="text-xs">
                    <Send className="w-3.5 h-3.5" /> Enviar orden + voucher al proveedor
                  </Button>
                )}
                {['ENVIADA', 'CONFIRMADA', 'PARCIAL'].includes(detalle.estado) && !mostrarRecepcion && (
                  <Button disabled={isPending} onClick={() => setMostrarRecepcion(true)} className="text-xs">
                    <PackageCheck className="w-3.5 h-3.5" /> Recepcionar mercadería
                  </Button>
                )}
                {!['RECIBIDA', 'CANCELADA'].includes(detalle.estado) && (
                  <Button variant="danger" disabled={isPending} onClick={handleCancelar} className="text-xs">
                    <Ban className="w-3.5 h-3.5" /> Cancelar OC
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
