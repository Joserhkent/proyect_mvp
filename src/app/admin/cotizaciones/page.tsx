'use client';

import React, { useState } from 'react';
import { Plus, Search, ShoppingCart, Wrench, Receipt, CheckCircle2, Eye, Filter, Pencil, Trash2, Download, Building2, Truck } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { Cotizacion, Producto } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionsMenu, ActionsMenuItem } from '@/components/ui/ActionsMenu';
import { useToast } from '@/components/ui/Toast';
import { generarCotizacionPDF } from '@/lib/documents';
import { obtenerOfertasGanadorasPorCotizacion } from '@/lib/services/cotizaciones-proveedor';
import { exportarExcel } from '@/lib/exportExcel';

type OfertaGanadora = { costo_unitario: number; proveedor_id: string; proveedor_nombre?: string };

function urlCotizarProveedores(cotizacion: Cotizacion): string {
  const items = (cotizacion.detalles || []).map((d) => ({
    producto_id: d.producto_id,
    producto_nombre: d.producto_nombre || '',
    cantidad: d.cantidad,
  }));
  const params = new URLSearchParams({
    cotizacion_id: cotizacion.id,
    numero: cotizacion.numero,
    items: JSON.stringify(items),
  });
  return `/cotizador/proveedor?${params.toString()}`;
}

export default function AdminCotizacionesPage() {
  const {
    cotizaciones,
    productos,
    usuarios,
    editarCotizacion,
    aprobarCotizacion,
    generarOrdenesCompraDesdeCotizacion,
    asignarOrdenTrabajo,
    emitirFacturaSunatDesdeCotizacion,
  } = useAgroErp();
  const { showToast } = useToast();

  const tecnicosDisponibles = usuarios.filter((u) => u.rol === 'TECNICO');

  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [selectedCot, setSelectedCot] = useState<Cotizacion | null>(null);
  const [editingCot, setEditingCot] = useState<Cotizacion | null>(null);
  const [editDetails, setEditDetails] = useState<Cotizacion['detalles']>([]);
  const [editTipoOperacion, setEditTipoOperacion] = useState<Cotizacion['tipo_operacion']>('SOLO_VENTA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editProductSearch, setEditProductSearch] = useState('');

  // Modal Asignar Técnico
  const [isAsignarModalOpen, setIsAsignarModalOpen] = useState(false);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('');
  const [fechaInstalacion, setFechaInstalacion] = useState(
    () => new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filtered quotes
  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const matchSearch =
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente_razon_social.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente_num_doc.includes(search);

    const matchEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const handleExportarExcel = () => {
    exportarExcel(
      'cotizaciones',
      'Cotizaciones',
      [
        { header: 'Número', key: 'numero', valor: (c: Cotizacion) => c.numero },
        { header: 'Fecha', key: 'fecha', valor: (c: Cotizacion) => c.fecha ?? '' },
        { header: 'Cliente', key: 'cliente', valor: (c: Cotizacion) => c.cliente_razon_social },
        { header: 'Tipo Doc.', key: 'tipo_doc', valor: (c: Cotizacion) => c.cliente_tipo_doc ?? '' },
        { header: 'RUC/DNI', key: 'num_doc', valor: (c: Cotizacion) => c.cliente_num_doc },
        { header: 'Tipo Operación', key: 'tipo_operacion', valor: (c: Cotizacion) => c.tipo_operacion },
        { header: 'Estado', key: 'estado', valor: (c: Cotizacion) => c.estado },
        { header: 'Moneda', key: 'moneda', valor: (c: Cotizacion) => c.moneda },
        { header: 'Total', key: 'total', valor: (c: Cotizacion) => c.total, formatoNumero: '#,##0.00' },
      ],
      cotizacionesFiltradas
    );
  };

  const handleAprobar = async (id: string) => {
    setIsProcessing(true);
    const success = await aprobarCotizacion(id);

    if (success) {
      setActionSuccessMsg('Cotización marcada como APROBADA exitosamente.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } else {
      showToast('error', 'No se pudo aprobar la cotización. Revisa las políticas RLS y el estado de la base de datos.');
    }
    setIsProcessing(false);
  };

  const handleGenerarOC = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await generarOrdenesCompraDesdeCotizacion(id);
      if (res.error) {
        showToast('error', res.error);
      } else {
        setActionSuccessMsg(`¡Se generaron automáticamente ${res.creadas} Órdenes de Compra agrupadas por Proveedor!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [ofertasGanadoras, setOfertasGanadoras] = useState<Record<string, OfertaGanadora>>({});

  const openEditModal = (cotizacion: Cotizacion) => {
    setEditingCot(cotizacion);
    setEditDetails(cotizacion.detalles.map((detalle) => ({ ...detalle })));
    setEditTipoOperacion(cotizacion.tipo_operacion);
    setSelectedProductId('');
    setEditProductSearch('');
    setSelectedCot(null);
    setOfertasGanadoras({});
    obtenerOfertasGanadorasPorCotizacion(cotizacion.id)
      .then(setOfertasGanadoras)
      .catch(() => setOfertasGanadoras({}));
  };

  const removeEditDetail = (detailId: string) => {
    setEditDetails((prev) => prev.filter((detalle) => detalle.id !== detailId));
  };

  const addEditDetail = () => {
    const producto = productos.find((item) => item.id === selectedProductId);
    if (!producto) return;

    setEditDetails((prev) => {
      const existing = prev.find((detalle) => detalle.producto_id === producto.id);
      if (existing) {
        return prev.map((detalle) => detalle.producto_id === producto.id
          ? {
            ...detalle,
            cantidad: detalle.cantidad + 1,
            subtotal: (detalle.cantidad + 1) * detalle.precio_unitario,
          }
          : detalle
        );
      }

      const ofertaGanadora = ofertasGanadoras[producto.id];
      const costoUnitario = ofertaGanadora?.costo_unitario ?? producto.ultimo_costo_compra ?? 0;

      const nuevoDetalle: Cotizacion['detalles'][number] = {
        id: `edit_${Date.now()}_${producto.id}`,
        producto_id: producto.id,
        producto_sku: producto.sku || '',
        producto_nombre: producto.nombre,
        proveedor_id: ofertaGanadora?.proveedor_id ?? producto.proveedor_id,
        cantidad: 1,
        precio_unitario: producto.ultimo_precio_venta ?? 0,
        costo_unitario: costoUnitario,
        subtotal: producto.ultimo_precio_venta ?? 0,
      };
      return [...prev, nuevoDetalle];
    });
    setSelectedProductId('');
    setEditProductSearch('');
  };

  const productosEditables = productos.filter((producto) => {
    const searchValue = editProductSearch.toLowerCase().trim();
    if (!searchValue) return true;
    return [producto.sku, producto.nombre, producto.descripcion]
      .some((value) => (value || '').toLowerCase().includes(searchValue));
  });

  const updateEditDetail = (detailId: string, field: 'cantidad' | 'precio_unitario', value: number) => {
    setEditDetails((prev) => prev.map((detalle) => {
      if (detalle.id !== detailId) return detalle;
      const cantidad = field === 'cantidad' ? Math.max(1, value) : detalle.cantidad;
      const precio = field === 'precio_unitario' ? Math.max(0, value) : detalle.precio_unitario;
      return { ...detalle, cantidad, precio_unitario: precio, subtotal: cantidad * precio };
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingCot || editDetails.length === 0) {
      showToast('error', 'La cotización debe tener al menos un producto.');
      return;
    }
    setIsProcessing(true);
    const subtotal = editDetails.reduce((sum, detalle) => sum + detalle.subtotal, 0);
    const igv = subtotal * 0.18;
    const success = await editarCotizacion(editingCot.id, {
      tipo_operacion: editTipoOperacion,
      subtotal,
      igv,
      total: subtotal + igv,
      detalles: editDetails,
    });
    setIsProcessing(false);
    if (success) {
      setEditingCot(null);
      setActionSuccessMsg('Cotización actualizada y enviada nuevamente como pendiente.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      showToast('error', 'No se pudo actualizar la cotización.');
    }
  };

  const handleConfirmarAsignacionTecnico = async () => {
    if (!selectedCot || !tecnicoSeleccionado) return;
    const tecnico = tecnicosDisponibles.find((t) => t.id === tecnicoSeleccionado);
    if (!tecnico) return;

    setIsProcessing(true);
    try {
      await asignarOrdenTrabajo(selectedCot.id, tecnico.id, tecnico.nombre, fechaInstalacion);
      setIsAsignarModalOpen(false);
      setSelectedCot(null);
      setActionSuccessMsg(`Orden de Trabajo asignada a ${tecnico.nombre} para el ${fechaInstalacion}.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'No se pudo asignar la orden de trabajo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmitirFactura = async (id: string, tipo: 'FACTURA' | 'GUIA_REMISION' = 'FACTURA') => {
    setIsProcessing(true);
    try {
      const cpe = await emitirFacturaSunatDesdeCotizacion(id, tipo);
      setIsProcessing(false);
      setActionSuccessMsg(
        tipo === 'GUIA_REMISION'
          ? `Guía de Remisión ${cpe.serie}-${cpe.numero} generada. Entrégala al cliente junto con los productos.`
          : `Factura electrónica ${cpe.serie}-${cpe.numero} emitida y ACEPTADA por SUNAT.`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch {
      setIsProcessing(false);
      showToast('error', 'Ocurrió un error al emitir el comprobante. Intenta nuevamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Gestión de Cotizaciones Comerciales
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Revisa, aprueba, genera órdenes de compra a proveedores y emite facturación SUNAT.
        </p>
      </div>

      {/* Success banner notification */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número de cotización, cliente o RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="RECHAZADA">Rechazadas</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="EN_COMPRAS">En Compras</option>
            <option value="EN_INSTALACION">En Instalación</option>
            <option value="FACTURADA">Facturadas SUNAT</option>
          </select>
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

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Cotización / Fecha</th>
                <th className="p-4">Cliente / RUC</th>
                <th className="p-4">Tipo Operación</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-center">Acciones del Flujo ERP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cotizacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No se encontraron cotizaciones con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                cotizacionesFiltradas.map((cot) => (
                  <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{cot.numero}</span>
                      <span className="text-[10px] text-slate-500">{cot.fecha}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[200px]">
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

                    <td className="p-4 text-right font-extrabold text-emerald-700 text-sm">
                      S/ {cot.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Ver Detalle: la acción más frecuente, siempre visible */}
                        <button
                          onClick={() => setSelectedCot(cot)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {cot.estado === 'FACTURADA' ? (
                          <span className="text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            ✓ Factura Emitida
                          </span>
                        ) : (
                          <ActionsMenu>
                            {(cot.estado === 'PENDIENTE' || cot.estado === 'RECHAZADA') && (
                              <ActionsMenuItem icon={Pencil} onClick={() => openEditModal(cot)}>
                                Editar cotización
                              </ActionsMenuItem>
                            )}

                            {cot.estado === 'PENDIENTE' && (
                              <ActionsMenuItem
                                icon={Building2}
                                href={urlCotizarProveedores(cot)}
                                title="Solicitar cotización de estos ítems a un proveedor"
                              >
                                Cotizar con Proveedores
                              </ActionsMenuItem>
                            )}

                            {cot.estado === 'PENDIENTE' && (
                              <ActionsMenuItem
                                icon={CheckCircle2}
                                variant="primary"
                                disabled={isProcessing}
                                onClick={() => handleAprobar(cot.id)}
                              >
                                Aprobar
                              </ActionsMenuItem>
                            )}

                            {(cot.estado === 'APROBADA' || cot.estado === 'PENDIENTE') && (
                              <ActionsMenuItem
                                icon={ShoppingCart}
                                disabled={isProcessing}
                                onClick={() => handleGenerarOC(cot.id)}
                                title="Agrupa ítems por proveedor y genera OCs automáticas"
                              >
                                Generar OCs
                              </ActionsMenuItem>
                            )}

                            {cot.tipo_operacion === 'VENTA_ARMADO' && !cot.orden_trabajo_id && (
                              <ActionsMenuItem
                                icon={Wrench}
                                onClick={() => {
                                  setSelectedCot(cot);
                                  setTecnicoSeleccionado(tecnicosDisponibles[0]?.id ?? '');
                                  setIsAsignarModalOpen(true);
                                }}
                              >
                                Asignar Técnico
                              </ActionsMenuItem>
                            )}

                            {cot.tipo_operacion === 'SOLO_VENTA' && (
                              <ActionsMenuItem
                                icon={Truck}
                                disabled={isProcessing}
                                onClick={() => handleEmitirFactura(cot.id, 'GUIA_REMISION')}
                                title="Genera la guía de remisión para entregar los productos al cliente"
                              >
                                Guía de Remisión
                              </ActionsMenuItem>
                            )}

                            <ActionsMenuItem
                              icon={Receipt}
                              variant="primary"
                              disabled={isProcessing}
                              onClick={() => handleEmitirFactura(cot.id, 'FACTURA')}
                            >
                              Facturar SUNAT
                            </ActionsMenuItem>
                          </ActionsMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Detail Modal */}
      {selectedCot && !isAsignarModalOpen && (
        <Modal
          isOpen={Boolean(selectedCot)}
          onClose={() => setSelectedCot(null)}
          title={`Detalle de Cotización: ${selectedCot.numero}`}
          description={`Cliente: ${selectedCot.cliente_razon_social} (${selectedCot.cliente_num_doc})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 font-semibold block">Dirección / Fundo:</span>
                <span className="font-bold text-slate-800">{selectedCot.cliente_direccion}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Tipo de Operación:</span>
                <span className="font-bold text-slate-800">
                  {selectedCot.tipo_operacion === 'VENTA_ARMADO' ? 'Venta + Armado de Mesa' : 'Solo Venta'}
                </span>
              </div>
            </div>

            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">Ítems Cotizados:</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {selectedCot.detalles.map((d, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">{d.producto_nombre}</span>
                    <span className="text-slate-500 block text-[10px]">
                      SKU: {d.producto_sku} • Cant: {d.cantidad} x S/ {d.precio_unitario.toLocaleString('es-PE')}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    S/ {d.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {selectedCot.incluye_mano_obra && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-emerald-800 font-semibold">
                  <span>Mano de Obra e Instalación Técnica</span>
                  <span>S/ {(selectedCot.costo_mano_obra || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total Cotización:</span>
              <span className="text-emerald-700 text-sm">
                S/ {selectedCot.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelectedCot(null)}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                onClick={() => generarCotizacionPDF(selectedCot)}
                title="Descargar PDF de la cotización"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Editar Cotización */}
      {editingCot && (
        <Modal
          isOpen={Boolean(editingCot)}
          onClose={() => setEditingCot(null)}
          title={`Editar Cotización: ${editingCot.numero}`}
          description="Corrige los productos o precios y vuelve a enviarla al cliente para su aprobación."
          maxWidth="lg"
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de operación</label>
              <select
                value={editTipoOperacion}
                onChange={(event) => setEditTipoOperacion(event.target.value as Cotizacion['tipo_operacion'])}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              >
                <option value="SOLO_VENTA">Solo venta</option>
                <option value="VENTA_ARMADO">Venta + armado</option>
              </select>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {editDetails.map((detalle) => (
                <div key={detalle.id} className="grid grid-cols-[1fr_80px_100px_auto_auto] gap-2 items-end p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 block">{detalle.producto_nombre}</span>
                    <span className="text-[10px] text-slate-500">{detalle.producto_sku}</span>
                    {ofertasGanadoras[detalle.producto_id] && (
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Costo negociado: S/ {ofertasGanadoras[detalle.producto_id].costo_unitario.toFixed(2)}
                        {ofertasGanadoras[detalle.producto_id].proveedor_nombre
                          ? ` (${ofertasGanadoras[detalle.producto_id].proveedor_nombre})`
                          : ''}
                      </span>
                    )}
                  </div>
                  <label className="text-slate-500">Cantidad
                    <input
                      type="number"
                      min="1"
                      value={detalle.cantidad}
                      onChange={(event) => updateEditDetail(detalle.id, 'cantidad', Number(event.target.value))}
                      className="w-full mt-1 p-1.5 rounded border border-slate-300 text-slate-900"
                    />
                  </label>
                  <label className="text-slate-500">Precio unitario
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={detalle.precio_unitario}
                      onChange={(event) => updateEditDetail(detalle.id, 'precio_unitario', Number(event.target.value))}
                      className="w-full mt-1 p-1.5 rounded border border-slate-300 text-slate-900"
                    />
                  </label>
                  <span className="font-bold text-emerald-700 pb-2">S/ {detalle.subtotal.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeEditDetail(detalle.id)}
                    title="Eliminar producto de la cotización"
                    className="p-1.5 mb-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-end border-t border-slate-200 pt-3">
              <label className="flex-1 text-slate-500">Agregar producto
                <div className="relative mt-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={editProductSearch}
                    onChange={(event) => setEditProductSearch(event.target.value)}
                    placeholder="Buscar por código, nombre o descripción"
                    className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full mt-2 p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  <option value="">Selecciona un producto</option>
                  {productosEditables.map((producto: Producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.sku} - {producto.nombre} - {producto.descripcion}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={addEditDetail}
                disabled={!selectedProductId}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </Button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <Button variant="outline" onClick={() => setEditingCot(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} isLoading={isProcessing}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardar y reenviar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Asignar Técnico de Campo */}
      {isAsignarModalOpen && selectedCot && (
        <Modal
          isOpen={isAsignarModalOpen}
          onClose={() => setIsAsignarModalOpen(false)}
          title="Asignar Orden de Trabajo (Módulo Técnico)"
          description={`Cotización: ${selectedCot.numero} • Cliente: ${selectedCot.cliente_razon_social}`}
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Técnico Especialista Asignado:
              </label>
              {tecnicosDisponibles.length === 0 ? (
                <p className="text-rose-600 font-medium p-2 bg-rose-50 border border-rose-200 rounded-lg">
                  No hay técnicos registrados (usuarios con rol TECNICO) en el sistema.
                </p>
              ) : (
                <select
                  value={tecnicoSeleccionado}
                  onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                >
                  {tecnicosDisponibles.map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha Programada de Inicio en Fundo:
              </label>
              <input
                type="date"
                value={fechaInstalacion}
                onChange={(e) => setFechaInstalacion(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 font-medium"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
              Al asignar, el técnico podrá abrir su app móvil en campo, registrar hitos de armado con fotografías en tiempo real y recopilar la firma digital del cliente para el informe final en PDF.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsAsignarModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarAsignacionTecnico}
                isLoading={isProcessing}
                disabled={!tecnicoSeleccionado}
              >
                Confirmar y Asignar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
