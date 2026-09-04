'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Send, Building, Search, ArrowRight, Printer, ArrowLeft, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  crearCotizacion,
  recalcularTotalesCotizacion,
  formatearMonto
} from '@/lib/services/cotizaciones';
import { Cotizacion, CotizacionDetalle, CotizacionTipoOperacion, Producto } from '@/types/erp';
import { generarCotizacionPDF } from '@/lib/documents';
import { buscarProductos } from '@/lib/services/productos';

// =======================================================
// COMPONENTE MODAL INTERNO DE CONFIRMACIÓN
// =======================================================
function CotizacionResumenModal({
  cotizacionGenerada,
  setCotizacionGenerada,
  showToast,
}: {
  cotizacionGenerada: Cotizacion | null;
  setCotizacionGenerada: (val: Cotizacion | null) => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}) {
  if (!cotizacionGenerada) return null;

  const moneda = cotizacionGenerada.moneda || 'USD';
  const codigoCotizacion = cotizacionGenerada.codigo || 'S/N';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Cotización Generada #{codigoCotizacion}
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-2">Propuesta Comercial para Cliente</h3>
        </div>

        <div className="space-y-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2">Ítem / Descripción</th>
                <th className="p-2 text-center">Cant.</th>
                <th className="p-2 text-right">P. Unit ({moneda})</th>
                <th className="p-2 text-right">Total ({moneda})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cotizacionGenerada.detalles?.map((d, idx) => (
                <tr key={d.id || idx}>
                  <td className="p-2 font-medium text-slate-900">
                    {d.producto_nombre}
                    {d.producto_sku && (
                      <span className="block text-[10px] text-slate-400 font-mono">SKU: {d.producto_sku}</span>
                    )}
                  </td>
                  <td className="p-2 text-center font-bold">{d.cantidad}</td>
                  <td className="p-2 text-right">{formatearMonto(d.precio_unitario, moneda)}</td>
                  <td className="p-2 text-right font-bold text-slate-900">{formatearMonto(d.subtotal, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">{formatearMonto(cotizacionGenerada.subtotal, moneda)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IGV (18%):</span>
                <span className="font-bold text-slate-800">{formatearMonto(cotizacionGenerada.igv, moneda)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-sky-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatearMonto(cotizacionGenerada.total, moneda)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <Link href="/admin/servicios/cotizaciones">
              <Button variant="outline" className="text-xs border-sky-600 text-sky-700 hover:bg-sky-50">
                Ver en Panel <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  generarCotizacionPDF(cotizacionGenerada);
                  showToast('success', `PDF descargado.`);
                }}
                className="text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> PDF
              </Button>
              <Button
                type="button"
                onClick={() => setCotizacionGenerada(null)}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =======================================================
// PÁGINA PRINCIPAL COTIZADOR CLIENTE
// =======================================================
export default function CotizadorClientePage() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [buscandoDoc, setBuscandoDoc] = useState(false);

  // Formulario - Datos del Cliente (Editables manualmente)
  const [clienteRazonSocial, setClienteRazonSocial] = useState('');
  const [clienteNumDoc, setClienteNumDoc] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDepartamento, setClienteDepartamento] = useState('');

  // Parámetros de la Cotización
  const [moneda, setMoneda] = useState<'USD' | 'PEN'>('USD');
  const [tipoOperacion, setTipoOperacion] = useState<CotizacionTipoOperacion>('PRODUCTO');
  const [validezDias, setValidezDias] = useState<number>(15);
  const [detalles, setDetalles] = useState<CotizacionDetalle[]>([]);

  // Buscador y Selección de Productos
  const [productosDB, setProductosDB] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(1);
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(0);

  const [cotizacionCreada, setCotizacionCreada] = useState<Cotizacion | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar catálogo de productos
  useEffect(() => {
    let cancelado = false;
    buscarProductos()
      .then((data) => {
        if (!cancelado) setProductosDB(data);
      })
      .catch(() => {
        if (!cancelado) showToast('error', 'No se pudo cargar el catálogo de productos.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // =======================================================
  // BÚSQUEDA REAL API SUNAT/RENIEC
  // =======================================================
  const consultarDocumento = async () => {
    const doc = clienteNumDoc.trim();

    if (doc.length !== 8 && doc.length !== 11) {
      showToast('error', 'El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).');
      return;
    }

    try {
      setBuscandoDoc(true);

      const res = await fetch(`/api/consulta-doc?doc=${doc}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'No se encontraron datos para el documento.');

      // Rellenar campos recibidos y permitir edición posterior
      setClienteRazonSocial(data.razon_social || data.nombres || '');
      setClienteDireccion(data.direccion || clienteDireccion);
      if (data.departamento) setClienteDepartamento(data.departamento);

      showToast('success', 'Datos de SUNAT/RENIEC autocompletados.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'No se pudo consultar el documento.');
    } finally {
      setBuscandoDoc(false);
    }
  };

  const productosFiltrados = productosDB.filter((p) => {
    const q = busquedaProducto.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q)
    );
  });

  const seleccionarProducto = (p: Producto) => {
    setProductoSeleccionado(p);
    setBusquedaProducto(p.nombre);
    setNuevoPrecio(p.ultimo_precio_venta || 0);
    setMostrarResultados(false);
  };

  const agregarItem = () => {
    if (!productoSeleccionado && !busquedaProducto.trim()) {
      showToast('error', 'Selecciona o escribe un producto.');
      return;
    }

    const subtotalItem = nuevaCantidad * nuevoPrecio;

    const nuevoDetalle: CotizacionDetalle = {
      id: `temp-${Date.now()}`,
      producto_id: productoSeleccionado?.id || `custom-${Date.now()}`,
      producto_nombre: productoSeleccionado ? productoSeleccionado.nombre : busquedaProducto,
      producto_sku: productoSeleccionado?.sku,
      cantidad: nuevaCantidad,
      precio_unitario: nuevoPrecio,
      subtotal: subtotalItem,
    };

    setDetalles([...detalles, nuevoDetalle]);

    // Resetear selección
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setNuevaCantidad(1);
    setNuevoPrecio(0);
  };

  const eliminarItem = (index: number) => {
    setDetalles(detalles.filter((_, idx) => idx !== index));
  };

  const { subtotal, igv, total } = recalcularTotalesCotizacion(detalles);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteRazonSocial.trim()) return showToast('error', 'Ingresa la razón social o nombre del cliente.');
    if (!clienteNumDoc.trim()) return showToast('error', 'Ingresa el número de documento.');
    if (detalles.length === 0) return showToast('error', 'Agrega al menos un ítem.');

    try {
      setCargando(true);
      const res = await crearCotizacion({
        cliente_num_doc: clienteNumDoc,
        cliente_razon_social: clienteRazonSocial,
        cliente_direccion: clienteDireccion,
        cliente_email: clienteEmail,
        cliente_telefono: clienteTelefono,
        cliente_departamento: clienteDepartamento,
        tipo_operacion: tipoOperacion,
        estado: 'PENDIENTE',
        moneda,
        validez_dias: validezDias,
        subtotal,
        igv,
        total,
        detalles,
      });

      showToast('success', 'Cotización registrada exitosamente.');
      setCotizacionCreada(res);

      // Limpiar formulario
      setClienteRazonSocial('');
      setClienteNumDoc('');
      setClienteDireccion('');
      setClienteEmail('');
      setClienteTelefono('');
      setClienteDepartamento('');
      setDetalles([]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar la cotización.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-xs font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Regresar y Encabezado */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/cotizador" className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">Cotización para Cliente</h1>
            <p className="text-xs text-slate-500">Crea una propuesta comercial directa desde tu catálogo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as 'USD' | 'PEN')}
            className="text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white"
          >
            <option value="USD">USD ($)</option>
            <option value="PEN">PEN (S/)</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Cliente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" /> Datos del Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* RUC / DNI */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">RUC / DNI *</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={clienteNumDoc}
                  onChange={(e) => setClienteNumDoc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      consultarDocumento();
                    }
                  }}
                  placeholder="Ej. 20601234567"
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Button
                  type="button"
                  onClick={consultarDocumento}
                  disabled={buscandoDoc}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3 rounded-xl flex items-center justify-center shrink-0"
                  title="Consultar en SUNAT/RENIEC"
                >
                  {buscandoDoc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Razón Social */}
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-semibold mb-1">Razón Social / Cliente *</label>
              <input
                type="text"
                required
                value={clienteRazonSocial}
                onChange={(e) => setClienteRazonSocial(e.target.value)}
                placeholder="Ej. Empresa Cliente S.A.C."
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Dirección Fiscal */}
            <div className="sm:col-span-3">
              <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Dirección Fiscal
              </label>
              <input
                type="text"
                value={clienteDireccion}
                onChange={(e) => setClienteDireccion(e.target.value)}
                placeholder="Av. Principal 123, Oficina 401"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Email (Manual) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Correo Electrónico
              </label>
              <input
                type="email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="contacto@cliente.com"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Teléfono (Manual) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="987654321"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Departamento / Ciudad (Manual / Autocompletado) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Departamento / Región</label>
              <input
                type="text"
                value={clienteDepartamento}
                onChange={(e) => setClienteDepartamento(e.target.value)}
                placeholder="Ej. Lima, La Libertad"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Buscador Dinámico de Productos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-600" /> Selección de Productos del Catálogo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <div className="sm:col-span-6">Producto</div>
            <div className="sm:col-span-2 text-center">Cantidad</div>
            <div className="sm:col-span-3 text-right">Precio ({moneda})</div>
            <div className="sm:col-span-1 text-center">Acción</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative sm:col-span-6">
              <input
                type="text"
                placeholder="Buscar por Nombre, SKU o Descripción..."
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setMostrarResultados(true);
                }}
                onFocus={() => setMostrarResultados(true)}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-sky-500"
              />

              {mostrarResultados && busquedaProducto.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {productosFiltrados.length > 0 ? (
                    productosFiltrados.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => seleccionarProducto(p)}
                        className="p-3 hover:bg-sky-50 cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{p.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'}</p>
                        </div>
                        <span className="font-semibold text-sky-700">{formatearMonto(p.ultimo_precio_venta || 0, moneda)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 text-center italic">No hay coincidencias en el catálogo.</div>
                  )}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <input
                type="number"
                min={1}
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(Number(e.target.value))}
                className="w-full p-2.5 border rounded-lg bg-white text-center"
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                step="0.01"
                min={0}
                value={nuevoPrecio || ''}
                onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                placeholder={`Precio (${moneda})`}
                className="w-full p-2.5 border rounded-lg bg-white text-right"
              />
            </div>

            <div className="sm:col-span-1 flex items-center">
              <Button type="button" onClick={agregarItem} className="w-full bg-sky-600 hover:bg-sky-700 text-white p-2.5 rounded-lg">
                <Plus className="w-4 h-4 mx-auto" />
              </Button>
            </div>
          </div>

          {/* Tabla de Productos Agregados */}
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-2.5">Producto</th>
                <th className="p-2.5 text-center">Cant.</th>
                <th className="p-2.5 text-right">P. Unit ({moneda})</th>
                <th className="p-2.5 text-right">Subtotal ({moneda})</th>
                <th className="p-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalles.length > 0 ? (
                detalles.map((d, idx) => (
                  <tr key={d.id || idx}>
                    <td className="p-2.5 font-medium text-slate-800">
                      {d.producto_nombre}
                      {d.producto_sku && <span className="block text-[10px] text-slate-400 font-mono">SKU: {d.producto_sku}</span>}
                    </td>
                    <td className="p-2.5 text-center font-bold">{d.cantidad}</td>
                    <td className="p-2.5 text-right">{formatearMonto(d.precio_unitario, moneda)}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatearMonto(d.subtotal, moneda)}</td>
                    <td className="p-2.5 text-center">
                      <button type="button" onClick={() => eliminarItem(idx)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">No has agregado productos a la cotización.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl border text-xs">
              <div className="flex justify-between text-slate-600"><span>Subtotal:</span><b>{formatearMonto(subtotal, moneda)}</b></div>
              <div className="flex justify-between text-slate-600"><span>IGV (18%):</span><b>{formatearMonto(igv, moneda)}</b></div>
              <div className="flex justify-between text-sm font-black text-sky-900 pt-2 border-t"><span>TOTAL:</span><span>{formatearMonto(total, moneda)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={cargando || detalles.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-6 py-3 rounded-xl flex items-center gap-2">
            <Send className="w-4 h-4" /> {cargando ? 'Guardando...' : 'Generar Cotización a Cliente'}
          </Button>
        </div>
      </form>

      <CotizacionResumenModal cotizacionGenerada={cotizacionCreada} setCotizacionGenerada={setCotizacionCreada} showToast={showToast} />
    </div>
  );
}