'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Search, Send, CheckCircle2, XCircle, Eye, Filter, PlusCircle, Trophy, ShoppingCart, Truck, Receipt, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { CotizacionConCliente, CotizacionCompleta, EstadoDerivadoCotizacion } from '@/lib/queries/cotizaciones';
import { Proveedor } from '@/types/db';
import { obtenerCotizacionCompleta, enviarCotizacion, registrarAprobacionCliente, rechazarCotizacion } from '@/app/actions/cotizaciones';
import { registrarCotizacionProveedor, elegirGanadorasAutomatico } from '@/app/actions/cotizacionesProveedor';
import { generarOrdenesCompraDesdeCotizacion } from '@/app/actions/ordenesCompra';
import { crearDespachoCliente } from '@/app/actions/despachos';
import { emitirComprobanteSunat } from '@/app/actions/facturacion';
import { asignarOrdenTrabajo } from '@/app/actions/ordenesTrabajo';
import { Usuario } from '@/types/db';

interface Props {
  cotizaciones: CotizacionConCliente[];
  proveedores: Proveedor[];
  tecnicos: Usuario[];
}

const ESTADOS = ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'AJUSTE_REQUERIDO'];

export function CotizacionesClient({ cotizaciones, proveedores, tecnicos }: Props) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<{ cotizacion: CotizacionCompleta; estadoDerivado: EstadoDerivadoCotizacion } | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  const [ofertaForm, setOfertaForm] = useState<{ detalleId: string; proveedorId: string; costo: string; dias: string } | null>(null);
  const [mostrarDespacho, setMostrarDespacho] = useState(false);
  const [direccionLlegada, setDireccionLlegada] = useState('');
  const [transportistaNombre, setTransportistaNombre] = useState('');
  const [transportistaRuc, setTransportistaRuc] = useState('');
  const [mostrarAsignarTecnico, setMostrarAsignarTecnico] = useState(false);
  const [tecnicoId, setTecnicoId] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState(() => new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);

  const filtradas = cotizaciones.filter((c) => {
    const cliente = c.clientes;
    const matchSearch =
      (c.codigo ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (cliente?.razon_social ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (cliente?.num_doc ?? '').includes(search);
    const matchEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  async function abrirDetalle(id: string) {
    setSelectedId(id);
    setIsLoadingDetalle(true);
    try {
      const res = await obtenerCotizacionCompleta(id);
      setDetalle(res);
    } catch {
      showToast('error', 'No se pudo cargar el detalle de la cotización.');
    } finally {
      setIsLoadingDetalle(false);
    }
  }

  function cerrarDetalle() {
    setSelectedId(null);
    setDetalle(null);
    setOfertaForm(null);
    setMostrarDespacho(false);
    setMostrarAsignarTecnico(false);
  }

  function refrescarDetalle() {
    if (selectedId) abrirDetalle(selectedId);
  }

  function handleEnviar(id: string) {
    startTransition(async () => {
      try {
        await enviarCotizacion(id);
        showToast('success', 'Cotización enviada al cliente.');
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo enviar la cotización.');
      }
    });
  }

  function handleAprobar(id: string) {
    startTransition(async () => {
      try {
        await registrarAprobacionCliente(id);
        showToast('success', 'Cliente aprobó la cotización. Stock reservado automáticamente.');
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo registrar la aprobación.');
      }
    });
  }

  function handleRechazar(id: string) {
    startTransition(async () => {
      try {
        await rechazarCotizacion(id);
        showToast('info', 'Cotización marcada como RECHAZADA.');
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo rechazar la cotización.');
      }
    });
  }

  function handleAgregarOferta(cotizacionId: string, productoId: string) {
    if (!ofertaForm) return;
    const costo = parseFloat(ofertaForm.costo);
    const dias = parseInt(ofertaForm.dias, 10);
    if (!ofertaForm.proveedorId || Number.isNaN(costo) || Number.isNaN(dias)) {
      showToast('error', 'Completa proveedor, costo y días de entrega.');
      return;
    }
    startTransition(async () => {
      try {
        await registrarCotizacionProveedor({
          cotizacion_id: cotizacionId,
          detalle_id: ofertaForm.detalleId,
          producto_id: productoId,
          proveedor_id: ofertaForm.proveedorId,
          cantidad_cotizada: 1,
          costo_unitario: costo,
          dias_entrega: dias,
        });
        showToast('success', 'Oferta de proveedor registrada.');
        setOfertaForm(null);
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo registrar la oferta.');
      }
    });
  }

  function handleGenerarOC(cotizacionId: string) {
    startTransition(async () => {
      try {
        const res = await generarOrdenesCompraDesdeCotizacion(cotizacionId);
        showToast('success', `Se generaron ${res.creadas} Orden(es) de Compra agrupada(s) por proveedor.`);
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo generar la orden de compra.');
      }
    });
  }

  function handleGenerarDespacho(cotizacionId: string) {
    if (!direccionLlegada) {
      showToast('error', 'Ingresa la dirección de llegada del cliente.');
      return;
    }
    startTransition(async () => {
      try {
        await crearDespachoCliente({
          cotizacion_id: cotizacionId,
          direccion_llegada: direccionLlegada,
          transportista_nombre: transportistaNombre || undefined,
          transportista_ruc: transportistaRuc || undefined,
        });
        showToast('success', 'Guía de remisión generada y stock despachado.');
        setMostrarDespacho(false);
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo generar la guía de remisión.');
      }
    });
  }

  function handleFacturar(cotizacionId: string) {
    startTransition(async () => {
      try {
        const cpe = await emitirComprobanteSunat(cotizacionId, 'FACTURA');
        showToast('success', `Factura ${cpe.serie}-${cpe.numero} emitida y ACEPTADA por SUNAT.`);
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo emitir la factura.');
      }
    });
  }

  function handleAsignarTecnico(cotizacionId: string) {
    if (!tecnicoId) {
      showToast('error', 'Selecciona un técnico.');
      return;
    }
    startTransition(async () => {
      try {
        await asignarOrdenTrabajo(cotizacionId, tecnicoId, fechaProgramada);
        showToast('success', 'Orden de trabajo asignada al técnico.');
        setMostrarAsignarTecnico(false);
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo asignar el técnico.');
      }
    });
  }

  function handleElegirGanadoras(cotizacionId: string) {
    startTransition(async () => {
      try {
        await elegirGanadorasAutomatico(cotizacionId);
        showToast('success', 'Se eligió al proveedor ganador de cada línea (menor costo).');
        refrescarDetalle();
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'No se pudo elegir ganadoras.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Cotizaciones Comerciales</h1>
          <p className="text-xs text-slate-500 mt-1">
            Compara ofertas de proveedores, envía la cotización y registra la aprobación del cliente.
          </p>
        </div>
        <Link href="/cotizador" target="_blank">
          <Button className="text-xs">
            <Plus className="w-4 h-4" />
            Nueva Cotización (Portal)
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o RUC/DNI..."
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
                <th className="p-4">Cotización / Fecha</th>
                <th className="p-4">Cliente / RUC</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No se encontraron cotizaciones con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filtradas.map((cot) => (
                  <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{cot.codigo ?? '(generando...)'}</span>
                      <span className="text-[10px] text-slate-500">
                        {cot.fecha_emision ? new Date(cot.fecha_emision).toLocaleDateString('es-PE') : ''}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[200px]">{cot.clientes?.razon_social}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {cot.clientes?.tipo_doc}: {cot.clientes?.num_doc}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.tipo_operacion} label={cot.tipo_operacion === 'PRODUCTO' ? 'Solo Producto' : 'Proyecto (Mesa)'} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={cot.estado} />
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-700 text-sm">
                      {cot.moneda === 'USD' ? '$' : 'S/'} {(cot.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => abrirDetalle(cot.id)}
                        title="Ver detalle y gestionar flujo"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
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
        <Modal isOpen={Boolean(selectedId)} onClose={cerrarDetalle} title="Detalle de la Cotización" maxWidth="xl">
          {isLoadingDetalle || !detalle ? (
            <div className="py-10 text-center text-xs text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-semibold block">Cliente:</span>
                  <span className="font-bold text-slate-800">{detalle.cotizacion.clientes?.razon_social}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Estado / Tipo:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <StatusBadge status={detalle.cotizacion.estado} />
                    <StatusBadge status={detalle.cotizacion.tipo_operacion} label={detalle.cotizacion.tipo_operacion === 'PRODUCTO' ? 'Solo Producto' : 'Proyecto (Mesa)'} />
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  Productos pedidos y comparación de proveedores
                </h4>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {detalle.cotizacion.cotizacion_detalles.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 block">{d.productos?.nombre}</span>
                          <span className="text-slate-500 text-[10px]">
                            Cant: {d.cantidad} • Precio cliente: S/ {d.precio_unitario.toLocaleString('es-PE')}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-700">S/ {d.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>

                      {d.cotizaciones_proveedor.length > 0 && (
                        <div className="space-y-1">
                          {d.cotizaciones_proveedor.map((of) => (
                            <div
                              key={of.id}
                              className={`flex items-center justify-between px-2 py-1 rounded-md text-[10px] border ${
                                of.es_ganadora ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {of.es_ganadora && <Trophy className="w-3 h-3" />}
                                {of.proveedores?.razon_social}
                              </span>
                              <span>
                                S/ {of.costo_unitario} • {of.dias_entrega} días
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {ofertaForm?.detalleId === d.id ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <select
                            value={ofertaForm.proveedorId}
                            onChange={(e) => setOfertaForm({ ...ofertaForm, proveedorId: e.target.value })}
                            className="text-[10px] p-1.5 rounded-md border border-slate-300"
                          >
                            <option value="">Proveedor...</option>
                            {proveedores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.razon_social}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Costo"
                            value={ofertaForm.costo}
                            onChange={(e) => setOfertaForm({ ...ofertaForm, costo: e.target.value })}
                            className="text-[10px] p-1.5 rounded-md border border-slate-300 w-20"
                          />
                          <input
                            type="number"
                            placeholder="Días"
                            value={ofertaForm.dias}
                            onChange={(e) => setOfertaForm({ ...ofertaForm, dias: e.target.value })}
                            className="text-[10px] p-1.5 rounded-md border border-slate-300 w-16"
                          />
                          <Button size="sm" className="h-6 text-[10px] px-2" disabled={isPending} onClick={() => handleAgregarOferta(detalle.cotizacion.id, d.producto_id)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setOfertaForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        detalle.cotizacion.estado === 'BORRADOR' && (
                          <button
                            onClick={() => setOfertaForm({ detalleId: d.id, proveedorId: '', costo: '', dias: '' })}
                            className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-3 h-3" /> Consultar proveedor
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Cotización:</span>
                <span className="text-emerald-700 text-sm">
                  {detalle.cotizacion.moneda === 'USD' ? '$' : 'S/'} {(detalle.cotizacion.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
                {detalle.cotizacion.estado === 'BORRADOR' && (
                  <Button variant="outline" disabled={isPending} onClick={() => handleElegirGanadoras(detalle.cotizacion.id)} className="text-xs">
                    <Trophy className="w-3.5 h-3.5" /> Elegir ganadoras
                  </Button>
                )}
                {detalle.cotizacion.estado === 'BORRADOR' && (
                  <Button disabled={isPending} onClick={() => handleEnviar(detalle.cotizacion.id)} className="text-xs">
                    <Send className="w-3.5 h-3.5" /> Enviar al cliente
                  </Button>
                )}
                {detalle.cotizacion.estado === 'ENVIADA' && (
                  <>
                    <Button variant="danger" disabled={isPending} onClick={() => handleRechazar(detalle.cotizacion.id)} className="text-xs">
                      <XCircle className="w-3.5 h-3.5" /> Cliente rechazó
                    </Button>
                    <Button disabled={isPending} onClick={() => handleAprobar(detalle.cotizacion.id)} className="text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cliente aprobó
                    </Button>
                  </>
                )}
                {detalle.cotizacion.estado === 'APROBADA' && !detalle.estadoDerivado.tieneOrdenesCompra && (
                  <Button disabled={isPending} onClick={() => handleGenerarOC(detalle.cotizacion.id)} className="text-xs">
                    <ShoppingCart className="w-3.5 h-3.5" /> Generar Órdenes de Compra
                  </Button>
                )}
                {detalle.estadoDerivado.tieneOrdenesCompra && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full self-center">
                    ✓ Órdenes de compra generadas
                  </span>
                )}
                {detalle.cotizacion.estado === 'APROBADA' && !detalle.estadoDerivado.tieneComprobante && (
                  <Button variant="outline" disabled={isPending} onClick={() => handleFacturar(detalle.cotizacion.id)} className="text-xs">
                    <Receipt className="w-3.5 h-3.5" /> Facturar SUNAT
                  </Button>
                )}
                {detalle.estadoDerivado.tieneComprobante && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full self-center">
                    ✓ Factura emitida
                  </span>
                )}
                {detalle.cotizacion.estado === 'APROBADA' &&
                  detalle.cotizacion.tipo_operacion === 'PRODUCTO' &&
                  !detalle.estadoDerivado.tieneDespacho &&
                  !mostrarDespacho && (
                    <Button variant="outline" disabled={isPending} onClick={() => setMostrarDespacho(true)} className="text-xs">
                      <Truck className="w-3.5 h-3.5" /> Generar Guía de Remisión
                    </Button>
                  )}
                {detalle.estadoDerivado.tieneDespacho && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full self-center">
                    ✓ Guía de remisión generada
                  </span>
                )}
                {detalle.cotizacion.estado === 'APROBADA' &&
                  detalle.cotizacion.tipo_operacion === 'PROYECTO_MESA' &&
                  !detalle.estadoDerivado.tieneOrdenTrabajo &&
                  !mostrarAsignarTecnico && (
                    <Button variant="outline" disabled={isPending} onClick={() => setMostrarAsignarTecnico(true)} className="text-xs">
                      <Wrench className="w-3.5 h-3.5" /> Asignar Técnico
                    </Button>
                  )}
                {detalle.estadoDerivado.tieneOrdenTrabajo && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full self-center">
                    ✓ Técnico asignado
                  </span>
                )}
              </div>

              {mostrarAsignarTecnico && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-emerald-900">Asignar técnico de campo</h4>
                  <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="w-full text-[10px] p-1.5 rounded-md border border-slate-300">
                    <option value="">Selecciona un técnico...</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                  <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} className="w-full text-[10px] p-1.5 rounded-md border border-slate-300" />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={isPending} onClick={() => handleAsignarTecnico(detalle.cotizacion.id)} className="text-xs">
                      Confirmar asignación
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMostrarAsignarTecnico(false)} className="text-xs">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {mostrarDespacho && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-emerald-900">Datos de la guía de remisión</h4>
                  <input
                    placeholder="Dirección de llegada del cliente"
                    value={direccionLlegada}
                    onChange={(e) => setDireccionLlegada(e.target.value)}
                    className="w-full text-[10px] p-1.5 rounded-md border border-slate-300"
                  />
                  <div className="flex gap-1.5">
                    <input
                      placeholder="Transportista (opcional)"
                      value={transportistaNombre}
                      onChange={(e) => setTransportistaNombre(e.target.value)}
                      className="flex-1 text-[10px] p-1.5 rounded-md border border-slate-300"
                    />
                    <input
                      placeholder="RUC transportista (opcional)"
                      value={transportistaRuc}
                      onChange={(e) => setTransportistaRuc(e.target.value)}
                      className="flex-1 text-[10px] p-1.5 rounded-md border border-slate-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={isPending} onClick={() => handleGenerarDespacho(detalle.cotizacion.id)} className="text-xs">
                      Confirmar y despachar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMostrarDespacho(false)} className="text-xs">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
