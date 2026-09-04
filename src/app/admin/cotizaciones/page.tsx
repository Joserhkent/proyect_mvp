'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ShoppingCart, Wrench, Receipt, CheckCircle2, Eye, Filter, Pencil, Trash2, Download } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { Cotizacion, Producto } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { generarCotizacionPDF } from '@/lib/documents';

export default function AdminCotizacionesPage() {
  const {
    cotizaciones,
    productos,
    editarCotizacion,
    aprobarCotizacion,
    generarOrdenesCompraDesdeCotizacion,
    asignarOrdenTrabajo,
    emitirFacturaSunatDesdeCotizacion,
  } = useAgroErp();
  const { showToast } = useToast();

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
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('usr_tecnico_1');
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

  const openEditModal = (cotizacion: Cotizacion) => {
    setEditingCot(cotizacion);
    setEditDetails(cotizacion.detalles.map((detalle) => ({ ...detalle })));
    setEditTipoOperacion(cotizacion.tipo_operacion);
    setSelectedProductId('');
    setEditProductSearch('');
    setSelectedCot(null);
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

      const nuevoDetalle: Cotizacion['detalles'][number] = {
        id: `edit_${Date.now()}_${producto.id}`,
        producto_id: producto.id,
        producto_codigo: producto.codigo,
        producto_nombre: producto.nombre,
        proveedor_id: producto.proveedor_id,
        cantidad: 1,
        precio_unitario: producto.precio_venta,
        costo_unitario: producto.costo_compra,
        subtotal: producto.precio_venta,
      };
      return [...prev, nuevoDetalle];
    });
    setSelectedProductId('');
    setEditProductSearch('');
  };

  const productosEditables = productos.filter((producto) => {
    const searchValue = editProductSearch.toLowerCase().trim();
    if (!searchValue) return true;
    return [producto.codigo, producto.nombre, producto.descripcion]
      .some((value) => value.toLowerCase().includes(searchValue));
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

  const handleConfirmarAsignacionTecnico = () => {
    if (!selectedCot) return;
    const tecNombre =
      tecnicoSeleccionado === 'usr_tecnico_1'
        ? 'Juan Quispe Ramos (Técnico Senior)'
        : 'Marcos Benites (Técnico de Campo)';

    asignarOrdenTrabajo(selectedCot.id, tecnicoSeleccionado, tecNombre, fechaInstalacion);
    setIsAsignarModalOpen(false);
    setSelectedCot(null);
    setActionSuccessMsg(`Orden de Trabajo asignada a ${tecNombre} para el ${fechaInstalacion}.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleEmitirFactura = async (id: string) => {
    setIsProcessing(true);
    try {
      const cpe = await emitirFacturaSunatDesdeCotizacion(id, 'FACTURA');
      setIsProcessing(false);
      setActionSuccessMsg(`Factura electrónica ${cpe.serie}-${cpe.numero} emitida y ACEPTADA por SUNAT.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch {
      setIsProcessing(false);
      showToast('error', 'Ocurrió un error al emitir la factura. Intenta nuevamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestión de Cotizaciones Comerciales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revisa, aprueba, genera órdenes de compra a proveedores y emite facturación SUNAT.
          </p>
        </div>

        <Link href="/cotizador" target="_blank">
          <Button className="text-xs">
            <Plus className="w-4 h-4" />
            Nueva Cotización (Portal)
          </Button>
        </Link>
      </div>

      {/* Success banner notification */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
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
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Botón Ver Detalle */}
                        <button
                          onClick={() => setSelectedCot(cot)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(cot.estado === 'PENDIENTE' || cot.estado === 'RECHAZADA') && (
                          <button
                            onClick={() => openEditModal(cot)}
                            title="Editar cotización"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Paso Aprobación */}
                        {cot.estado === 'PENDIENTE' && (
                          <Button
                            size="sm"
                            onClick={() => handleAprobar(cot.id)}
                            isLoading={isProcessing}
                            className="text-[11px] h-7 px-2"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobar
                          </Button>
                        )}

                        {/* Paso Generar Órdenes de Compra */}
                        {(cot.estado === 'APROBADA' || cot.estado === 'PENDIENTE') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerarOC(cot.id)}
                            isLoading={isProcessing}
                            className="text-[11px] h-7 px-2"
                            title="Agrupa ítems por proveedor y genera OCs automáticas"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Generar OCs
                          </Button>
                        )}

                        {/* Paso Asignar a Técnico (si es VENTA_ARMADO) */}
                        {cot.tipo_operacion === 'VENTA_ARMADO' &&
                          cot.estado !== 'FACTURADA' &&
                          !cot.orden_trabajo_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCot(cot);
                                setIsAsignarModalOpen(true);
                              }}
                              className="text-[11px] h-7 px-2"
                            >
                              <Wrench className="w-3 h-3" />
                              Asignar Técnico
                            </Button>
                          )}

                        {/* Paso Facturación SUNAT */}
                        {cot.estado !== 'FACTURADA' && (
                          <Button
                            size="sm"
                            onClick={() => handleEmitirFactura(cot.id)}
                            isLoading={isProcessing}
                            className="text-[11px] h-7 px-2"
                          >
                            <Receipt className="w-3 h-3" />
                            Facturar SUNAT
                          </Button>
                        )}

                        {cot.estado === 'FACTURADA' && (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            ✓ Factura Emitida
                          </span>
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
          <div className="space-y-4 text-xs">
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
                      Código: {d.producto_codigo} • Cant: {d.cantidad} x S/ {d.precio_unitario.toLocaleString('es-PE')}
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
                  <span>S/ {selectedCot.costo_mano_obra.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
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
          <div className="space-y-4 text-xs">
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
                    <span className="text-[10px] text-slate-500">{detalle.producto_codigo}</span>
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
                      {producto.codigo} - {producto.nombre} - {producto.descripcion}
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
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Técnico Especialista Asignado:
              </label>
              <select
                value={tecnicoSeleccionado}
                onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
              >
                <option value="usr_tecnico_1">Juan Quispe Ramos (Técnico Senior Fertirriego)</option>
                <option value="usr_tecnico_2">Marcos Benites (Técnico de Campo Hidráulico)</option>
              </select>
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
              <Button onClick={handleConfirmarAsignacionTecnico}>
                Confirmar y Asignar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
