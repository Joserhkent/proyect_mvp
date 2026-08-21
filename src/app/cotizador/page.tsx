'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sprout,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Trash2,
  Building,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  Printer,
  Sparkles,
  Wrench,
  Package,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { Producto, Cotizacion, CotizacionTipoOperacion, TipoDocumento } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { generarCotizacionPDF } from '@/lib/documents';

export default function CotizadorPage() {
  const { productos, crearCotizacion, consultarRucDniSunat } = useAgroErp();
  const { showToast } = useToast();

  // Tipo de operación
  const [tipoOperacion, setTipoOperacion] = useState<CotizacionTipoOperacion>('VENTA_ARMADO');
  const [incluyeManoObra, setIncluyeManoObra] = useState(true);
  const costoManoObraSugerido = 2500;

  // Carrito de cotización
  const [carrito, setCarrito] = useState<{ producto: Producto; cantidad: number }[]>([
    { producto: productos[0], cantidad: 1 }, // Mesa automatizada
    { producto: productos[7], cantidad: 1 }, // Controlador de fertirriego
  ]);

  // Datos del Cliente y Consulta SUNAT
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('RUC');
  const [numDoc, setNumDoc] = useState('20608912345');
  const [razonSocial, setRazonSocial] = useState('AGRÍCOLA DEL SUR S.A.C.');
  const [direccion, setDireccion] = useState('Fundo San José Lote 14, Valle de Chincha, Ica');
  const [email, setEmail] = useState('compras@agricoladelsur.com.pe');
  const [telefono, setTelefono] = useState('+51 956 123 456');
  const [observaciones, setObservaciones] = useState('Requerimos instalación y puesta en marcha en cabezal de fertirriego.');

  // Estado de consulta SUNAT
  const [isConsultandoSunat, setIsConsultandoSunat] = useState(false);
  const [sunatStatusMsg, setSunatStatusMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>({
    tipo: 'ok',
    texto: 'RUC 20608912345: Contribuyente ACTIVO y HABIDO en SUNAT',
  });

  // Categoría de filtro catálogo
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [searchProd, setSearchProd] = useState('');

  // Cotización Generada
  const [cotizacionGenerada, setCotizacionGenerada] = useState<Cotizacion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consulta SUNAT Handler
  const handleConsultarSunat = async () => {
    if (!numDoc) return;
    setIsConsultandoSunat(true);
    setSunatStatusMsg(null);

    const res = await consultarRucDniSunat(numDoc, tipoDoc);
    setIsConsultandoSunat(false);

    if (res.success) {
      if (res.razon_social) setRazonSocial(res.razon_social);
      if (res.direccion) setDireccion(res.direccion);
      setSunatStatusMsg({
        tipo: 'ok',
        texto: `${tipoDoc} ${numDoc}: ${res.estado || 'ACTIVO'} - ${res.condicion || 'HABIDO'} (SUNAT)`,
      });
    } else {
      setSunatStatusMsg({
        tipo: 'error',
        texto: res.error || 'No se pudo consultar el documento en SUNAT.',
      });
    }
  };

  // Carrito helpers
  const agregarAlCarrito = (prod: Producto) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((item) => item.producto.id === prod.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].cantidad += 1;
        return next;
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  };

  const modificarCantidad = (prodId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === prodId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { producto: Producto; cantidad: number }[]
    );
  };

  const eliminarDelCarrito = (prodId: string) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== prodId));
  };

  // Cálculos totales
  const subtotalProductos = carrito.reduce(
    (acc, item) => acc + item.producto.precio_venta * item.cantidad,
    0
  );
  const costoManoObraTotal = tipoOperacion === 'VENTA_ARMADO' && incluyeManoObra ? costoManoObraSugerido : 0;
  const subtotalNeto = subtotalProductos + costoManoObraTotal;
  const igv = subtotalNeto * 0.18;
  const total = subtotalNeto + igv;

  // Filtered catalog
  const productosFiltrados = productos.filter((p) => {
    const matchCat = categoriaFiltro === 'TODAS' || p.categoria === categoriaFiltro;
    const matchSearch =
      p.nombre.toLowerCase().includes(searchProd.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchProd.toLowerCase());
    return matchCat && matchSearch;
  });

  // Generar Cotización Oficial
  const handleGenerarCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) {
      showToast('error', 'Debes agregar al menos un producto a la cotización.');
      return;
    }
    if (!numDoc || !razonSocial || !email) {
      showToast('error', 'Por favor completa los datos del cliente.');
      return;
    }

    setIsSubmitting(true);

    const detalles = carrito.map((item) => ({
      id: `det_${Date.now()}_${item.producto.id}`,
      producto_id: item.producto.id,
      producto_codigo: item.producto.codigo,
      producto_nombre: item.producto.nombre,
      proveedor_id: item.producto.proveedor_id,
      cantidad: item.cantidad,
      precio_unitario: item.producto.precio_venta,
      costo_unitario: item.producto.costo_compra,
      subtotal: item.producto.precio_venta * item.cantidad,
    }));

    const nuevaCot = await crearCotizacion({
      cliente_id: `cli_${Date.now()}`,
      cliente_tipo_doc: tipoDoc,
      cliente_num_doc: numDoc,
      cliente_razon_social: razonSocial,
      cliente_direccion: direccion,
      cliente_email: email,
      cliente_telefono: telefono,
      tipo_operacion: tipoOperacion,
      estado: 'PENDIENTE',
      subtotal: subtotalNeto,
      igv: igv,
      total: total,
      moneda: 'PEN',
      incluye_mano_obra: tipoOperacion === 'VENTA_ARMADO' && incluyeManoObra,
      costo_mano_obra: costoManoObraTotal,
      observaciones: observaciones,
      detalles: detalles,
    });

    setIsSubmitting(false);
    setCotizacionGenerada(nuevaCot);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Sprout className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">AgroFertil</span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Cotizador Oficial SUNAT</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs">
                Panel Administrativo
              </Button>
            </Link>
            <Link href="/tecnico">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs">
                Portal Técnico Móvil
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 p-6 sm:p-8 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cotizador en Vivo con Validación SUNAT/RENIEC</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Cotizador de Equipos de Fertirriego & Insumos Agrícolas
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-2">
              Configura tu sistema de fertilización, selecciona productos y obtén una cotización oficial con cálculo de IGV y autocompletado tributario.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Configurator & Catalog (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Operation Type Selector */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-3">
                1. Selecciona el Tipo de Operación
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoOperacion('VENTA_ARMADO')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    tipoOperacion === 'VENTA_ARMADO'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">Venta + Armado en Fundo</span>
                    </div>
                    {tipoOperacion === 'VENTA_ARMADO' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600">
                    Suministro de componentes + servicio de ensamblaje e instalación técnica de mesa de fertilización en campo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoOperacion('SOLO_VENTA')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    tipoOperacion === 'SOLO_VENTA'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-sm text-slate-900">Solo Venta de Productos</span>
                    </div>
                    {tipoOperacion === 'SOLO_VENTA' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600">
                    Venta bajo pedido de productos, fertilizantes, válvulas y tuberías sin mano de obra de instalación.
                  </p>
                </button>
              </div>

              {tipoOperacion === 'VENTA_ARMADO' && (
                <div className="mt-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="manoObraCheck"
                      checked={incluyeManoObra}
                      onChange={(e) => setIncluyeManoObra(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="manoObraCheck" className="text-xs text-slate-800 cursor-pointer font-medium">
                      Incluir <strong>Servicio Técnico Especializado de Armado y Calibración</strong>
                    </label>
                  </div>
                  <span className="text-xs font-bold text-emerald-800">
                    + S/ {costoManoObraSugerido.toLocaleString('es-PE')}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Catalog Selection */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  2. Catálogo de Equipos e Insumos
                </span>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto o código..."
                    value={searchProd}
                    onChange={(e) => setSearchProd(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-48"
                  />
                </div>
              </div>

              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'TODAS', label: 'Todos' },
                  { id: 'EQUIPO_FERTILIZACION', label: 'Mesas Fertirriego' },
                  { id: 'BOMBAS_INYECTORES', label: 'Bombas & Venturis' },
                  { id: 'TUBERIAS_VALVULAS', label: 'Válvulas & Tuberías' },
                  { id: 'INSUMOS_QUIMICOS', label: 'Fertilizantes' },
                  { id: 'SENSORES_CONTROLADORES', label: 'Controladores EC/pH' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat.id)}
                    className={`px-3 py-1 rounded-lg shrink-0 font-semibold transition-colors cursor-pointer ${
                      categoriaFiltro === cat.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Product cards grid */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.producto.id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 hover:border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {prod.codigo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Stock: {prod.stock} {prod.unidad_medida}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{prod.nombre}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.descripcion}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">
                            S/ {prod.precio_venta.toLocaleString('es-PE')}
                          </span>
                          <span className="text-[10px] text-slate-500 block">+ IGV</span>
                        </div>

                        {enCarrito ? (
                          <div className="flex items-center gap-2 bg-white border border-emerald-500 rounded-lg p-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => modificarCantidad(prod.id, -1)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-emerald-700 px-1">{enCarrito.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => modificarCantidad(prod.id, 1)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => agregarAlCarrito(prod)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Customer Info, Order Breakdown & Quote Generation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 3: Customer RUC / DNI SUNAT Validation */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                3. Identificación del Cliente (SUNAT)
              </span>

              {/* RUC / DNI Input + Button */}
              <div className="flex gap-2">
                <select
                  value={tipoDoc}
                  onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)}
                  className="text-xs bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="RUC">RUC (11)</option>
                  <option value="DNI">DNI (8)</option>
                </select>

                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder={tipoDoc === 'RUC' ? 'Ej. 20608912345' : 'Ej. 45892104'}
                    value={numDoc}
                    onChange={(e) => setNumDoc(e.target.value.trim())}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleConsultarSunat}
                  isLoading={isConsultandoSunat}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0 font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Consultar
                </Button>
              </div>

              {/* SUNAT feedback message */}
              {sunatStatusMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    sunatStatusMsg.tipo === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {sunatStatusMsg.tipo === 'ok' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium">{sunatStatusMsg.texto}</span>
                </div>
              )}

              {/* Autocompleted fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Razón Social / Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Dirección Fiscal / Fundo
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@fundo.pe"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+51 999 000 000"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Summary Breakdown & Action Button */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  4. Resumen de Cotización
                </span>
                <span className="text-xs text-slate-500 font-bold">{carrito.length} ítems</span>
              </div>

              {/* Items list preview */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {carrito.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No hay productos seleccionados.</p>
                ) : (
                  carrito.map((item) => (
                    <div key={item.producto.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-slate-900 font-semibold truncate">{item.producto.nombre}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.cantidad} x S/ {item.producto.precio_venta.toLocaleString('es-PE')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          S/ {(item.producto.precio_venta * item.cantidad).toLocaleString('es-PE')}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(item.producto.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {tipoOperacion === 'VENTA_ARMADO' && incluyeManoObra && (
                  <div className="flex items-center justify-between text-xs py-1 text-emerald-800 font-bold bg-emerald-50 px-2 rounded">
                    <span>Mano de Obra e Instalación Técnica</span>
                    <span>S/ {costoManoObraSugerido.toLocaleString('es-PE')}</span>
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Op. Gravada):</span>
                  <span className="font-bold text-slate-800">S/ {subtotalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>I.G.V. (18% SUNAT):</span>
                  <span className="font-bold text-slate-800">S/ {igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span className="text-emerald-800">Total Cotizado:</span>
                  <span className="text-emerald-800 text-lg">S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[10px] text-right text-slate-500">
                  Aprox. USD $ {(total / 3.75).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleGenerarCotizacion}
                isLoading={isSubmitting}
                disabled={carrito.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-sm mt-4 cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-1" />
                Generar Cotización Oficial en Vivo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Quote Success Modal / Print View */}
      {cotizacionGenerada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200">
            
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 font-black text-emerald-800 text-xl tracking-tight">
                  <Sprout className="w-6 h-6" /> AGROFERTIL PERÚ S.A.C.
                </div>
                <p className="text-xs text-slate-500 mt-0.5">RUC: 20601234567 • Panamericana Sur Km 140, Cañete, Lima</p>
                <p className="text-xs text-slate-500">Especialistas en Fertirriego & Automatización Agrícola</p>
              </div>

              <div className="text-right p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 block">COTIZACIÓN OFICIAL</span>
                <span className="text-base font-black text-emerald-950">{cotizacionGenerada.numero}</span>
                <span className="text-[10px] text-slate-500 block">Fecha: {cotizacionGenerada.fecha}</span>
              </div>
            </div>

            {/* Client Info Block */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
              <div>
                <span className="text-slate-500 block font-semibold">Cliente:</span>
                <span className="font-bold text-slate-900">{cotizacionGenerada.cliente_razon_social}</span>
                <span className="text-slate-600 block">{cotizacionGenerada.cliente_tipo_doc}: {cotizacionGenerada.cliente_num_doc}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Ubicación / Fundo:</span>
                <span className="text-slate-800">{cotizacionGenerada.cliente_direccion}</span>
                <span className="text-slate-600 block">Email: {cotizacionGenerada.cliente_email}</span>
              </div>
            </div>

            {/* Details Table */}
            <table className="w-full text-left text-xs mb-4">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2">Ítem / Descripción</th>
                  <th className="p-2 text-center">Cant.</th>
                  <th className="p-2 text-right">P. Unit</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizacionGenerada.detalles.map((d, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium text-slate-900">
                      {d.producto_nombre}
                      <span className="block text-[10px] text-slate-400 font-mono">{d.producto_codigo}</span>
                    </td>
                    <td className="p-2 text-center font-bold">{d.cantidad}</td>
                    <td className="p-2 text-right">S/ {d.precio_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right font-bold text-slate-900">S/ {d.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {cotizacionGenerada.incluye_mano_obra && (
                  <tr className="bg-emerald-50/70">
                    <td className="p-2 font-semibold text-emerald-800" colSpan={3}>
                      Servicio Técnico Especializado de Armado, Pruebas y Calibración en Campo
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-800">
                      S/ {cotizacionGenerada.costo_mano_obra.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6 text-xs">
              <div className="w-64 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Gravado:</span>
                  <span className="font-bold text-slate-800">S/ {cotizacionGenerada.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>I.G.V. (18%):</span>
                  <span className="font-bold text-slate-800">S/ {cotizacionGenerada.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-800 pt-1 border-t border-slate-200">
                  <span>TOTAL A PAGAR:</span>
                  <span>S/ {cotizacionGenerada.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <Link href="/admin/cotizaciones" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                  Ver en Panel Administrativo <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    generarCotizacionPDF(cotizacionGenerada);
                    showToast('success', `Cotización ${cotizacionGenerada.numero} descargada en PDF.`);
                  }}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Descargar PDF
                </Button>
                <Button
                  type="button"
                  onClick={() => setCotizacionGenerada(null)}
                  className="flex-1 sm:flex-none bg-slate-900 text-white hover:bg-slate-800 text-xs"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
