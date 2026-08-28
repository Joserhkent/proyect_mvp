'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2, Loader2, CheckCircle2, Download, LayoutDashboard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Producto, TipoDoc, CotizacionTipoOperacion, Cotizacion } from '@/types/db';
import { calcularTotalesCotizacion } from '@/lib/erp/pricing';
import { crearCotizacion } from '@/app/actions/cotizaciones';
import { buscarClientePorDocumento } from '@/app/actions/clientes';
import { validarDocumento } from '@/lib/erp/documento';
import { generarCotizacionPDF } from '@/lib/documents';

interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

interface ConsultaSunatResult {
  success?: boolean;
  razon_social?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  error?: string;
}

const CATEGORIAS = [
  { value: 'TODAS', label: 'Todas las categorías' },
  { value: 'FERTILIZANTE', label: 'Fertilizante' },
  { value: 'SEMILLA', label: 'Semilla' },
  { value: 'AGROQUIMICO', label: 'Agroquímico' },
  { value: 'HERRAMIENTA', label: 'Herramienta' },
  { value: 'OTRO', label: 'Otro' },
];

export function CotizadorClient({ productos }: { productos: Producto[] }) {
  const { showToast } = useToast();
  const router = useRouter();

  const [tipoOperacion, setTipoOperacion] = useState<CotizacionTipoOperacion>('PRODUCTO');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [searchProd, setSearchProd] = useState('');

  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('RUC');
  const [numDoc, setNumDoc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  const [isConsultandoSunat, setIsConsultandoSunat] = useState(false);
  const [sunatStatusMsg, setSunatStatusMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cotizacionGenerada, setCotizacionGenerada] = useState<Cotizacion | null>(null);

  const productosFiltrados = productos.filter((p) => {
    const matchCat = categoriaFiltro === 'TODAS' || p.categoria === categoriaFiltro;
    const matchSearch =
      p.nombre.toLowerCase().includes(searchProd.toLowerCase()) || p.sku.toLowerCase().includes(searchProd.toLowerCase());
    return matchCat && matchSearch;
  });

  const totales = useMemo(
    () => calcularTotalesCotizacion(carrito.map((c) => ({ cantidad: c.cantidad, precio_unitario: c.producto.precio_venta ?? 0 }))),
    [carrito]
  );

  const errorFormatoDoc = numDoc ? validarDocumento(tipoDoc, numDoc) : null;

  function agregarAlCarrito(prod: Producto) {
    setCarrito((prev) => {
      const existe = prev.find((c) => c.producto.id === prod.id);
      if (existe) {
        return prev.map((c) => (c.producto.id === prod.id ? { ...c, cantidad: c.cantidad + 1 } : c));
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  }

  function modificarCantidad(prodId: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((c) => (c.producto.id === prodId ? { ...c, cantidad: c.cantidad + delta } : c))
        .filter((c) => c.cantidad > 0)
    );
  }

  function eliminarDelCarrito(prodId: string) {
    setCarrito((prev) => prev.filter((c) => c.producto.id !== prodId));
  }

  async function handleConsultarSunat() {
    const errorFormato = validarDocumento(tipoDoc, numDoc);
    if (errorFormato) {
      setSunatStatusMsg({ tipo: 'error', texto: errorFormato });
      return;
    }

    setIsConsultandoSunat(true);
    setSunatStatusMsg(null);
    try {
      // 1. Primero, ¿ya es un cliente nuestro? (dato real en Supabase, no simulado).
      //    Coincidencia estricta de num_doc + tipo_doc — no mezcla un DNI con un RUC del mismo número.
      const resultado = await buscarClientePorDocumento(numDoc, tipoDoc);
      if (resultado.cliente) {
        setRazonSocial(resultado.cliente.razon_social);
        setDireccion(resultado.cliente.direccion);
        setEmail(resultado.cliente.email);
        if (resultado.cliente.telefono) setTelefono(resultado.cliente.telefono);
        const estado = resultado.cliente.estado_contribuyente ?? 'ACTIVO';
        const condicion = resultado.cliente.condicion ?? 'HABIDO';
        setSunatStatusMsg({ tipo: 'ok', texto: `✓ Registrado — ${estado} / ${condicion}` });
        return;
      }

      if (resultado.tipoDocEncontrado) {
        setSunatStatusMsg({
          tipo: 'error',
          texto: `No existe un ${tipoDoc} con ese número. Está registrado como ${resultado.tipoDocEncontrado} — cambia el tipo de documento.`,
        });
        return;
      }

      // 2. Cliente nuevo: autocompletar razón social/dirección vía el simulador SUNAT
      //    (entorno de homologación con datos de prueba, no es una consulta real a SUNAT).
      const res = await fetch(`/api/sunat/consulta-ruc?numero=${numDoc}&tipo=${tipoDoc}`);
      const data: ConsultaSunatResult = await res.json();
      if (data.error) {
        setSunatStatusMsg({ tipo: 'error', texto: data.error });
      } else {
        if (data.razon_social) setRazonSocial(data.razon_social);
        if (data.direccion) setDireccion(data.direccion);
        setSunatStatusMsg({
          tipo: 'ok',
          texto: `Cliente nuevo (SUNAT simulado — verifica los datos): ${data.estado ?? 'ACTIVO'} / ${data.condicion ?? 'HABIDO'}`,
        });
      }
    } catch (err) {
      setSunatStatusMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al consultar el documento.' });
    } finally {
      setIsConsultandoSunat(false);
    }
  }

  async function handleGenerarCotizacion(e: React.FormEvent) {
    e.preventDefault();
    if (carrito.length === 0) {
      showToast('error', 'Agrega al menos un producto al pedido.');
      return;
    }
    if (!numDoc || !razonSocial || !email || !direccion) {
      showToast('error', 'Completa los datos del cliente (documento, razón social, dirección y correo).');
      return;
    }
    const errorFormato = validarDocumento(tipoDoc, numDoc);
    if (errorFormato) {
      showToast('error', errorFormato);
      return;
    }

    setIsSubmitting(true);
    try {
      const cot = await crearCotizacion({
        cliente: { tipo_doc: tipoDoc, num_doc: numDoc, razon_social: razonSocial, direccion, email, telefono },
        tipo_operacion: tipoOperacion,
        detalles: carrito.map((c) => ({ producto_id: c.producto.id, cantidad: c.cantidad, precio_unitario: c.producto.precio_venta ?? 0 })),
      });
      setCotizacionGenerada(cot);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'No se pudo registrar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDescargarPDF() {
    if (!cotizacionGenerada) return;
    generarCotizacionPDF({
      codigo: cotizacionGenerada.codigo ?? 'BORRADOR',
      fecha: new Date(cotizacionGenerada.fecha_emision ?? Date.now()).toLocaleDateString('es-PE'),
      moneda: cotizacionGenerada.moneda ?? 'PEN',
      cliente: { razon_social: razonSocial, tipo_doc: tipoDoc, num_doc: numDoc, direccion, email },
      detalles: carrito.map((c) => ({
        nombre: c.producto.nombre,
        cantidad: c.cantidad,
        precio_unitario: c.producto.precio_venta ?? 0,
        subtotal: c.cantidad * (c.producto.precio_venta ?? 0),
      })),
      subtotal: cotizacionGenerada.subtotal ?? 0,
      igv: cotizacionGenerada.igv ?? 0,
      total: cotizacionGenerada.total ?? 0,
    });
    showToast('success', 'PDF de la cotización descargado.');
  }

  function handleNuevaCotizacion() {
    setTipoOperacion('PRODUCTO');
    setCarrito([]);
    setCategoriaFiltro('TODAS');
    setSearchProd('');
    setTipoDoc('RUC');
    setNumDoc('');
    setRazonSocial('');
    setDireccion('');
    setEmail('');
    setTelefono('');
    setSunatStatusMsg(null);
    setCotizacionGenerada(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Solicitar Cotización</h1>
          <p className="text-xs text-slate-500 mt-1">
            Arma tu pedido de productos. Nuestro equipo consultará precios con proveedores y te enviará la cotización oficial.
          </p>
        </div>

        <form onSubmit={handleGenerarCotizacion} className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">1. Tipo de pedido</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoOperacion('PRODUCTO')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold ${
                  tipoOperacion === 'PRODUCTO' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                Solo Productos
                <span className="block text-[10px] font-normal mt-0.5">Se entrega con guía de remisión.</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoOperacion('PROYECTO_MESA')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold ${
                  tipoOperacion === 'PROYECTO_MESA' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                Proyecto / Instalación
                <span className="block text-[10px] font-normal mt-0.5">Incluye visita de técnico de campo.</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">2. Productos</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-slate-300"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {productosFiltrados.map((p) => {
                const enCarrito = carrito.find((c) => c.producto.id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{p.nombre}</span>
                      <span className="text-slate-500">
                        S/ {(p.precio_venta ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })} / {p.unidad_medida}
                      </span>
                    </div>
                    {enCarrito ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => modificarCantidad(p.id, -1)} className="p-1 rounded bg-slate-100">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold">{enCarrito.cantidad}</span>
                        <button type="button" onClick={() => modificarCantidad(p.id, 1)} className="p-1 rounded bg-slate-100">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" onClick={() => agregarAlCarrito(p)} className="text-[10px] h-7 shrink-0">
                        Agregar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">3. Datos del cliente</h2>
            <div className="flex gap-2">
              <select
                value={tipoDoc}
                onChange={(e) => {
                  setTipoDoc(e.target.value as TipoDoc);
                  setSunatStatusMsg(null);
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300"
              >
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
              </select>
              <input
                value={numDoc}
                onChange={(e) => {
                  setNumDoc(e.target.value.replace(/\D/g, ''));
                  setSunatStatusMsg(null);
                }}
                inputMode="numeric"
                maxLength={tipoDoc === 'DNI' ? 8 : 11}
                placeholder={tipoDoc === 'DNI' ? 'DNI (8 dígitos)' : 'RUC (11 dígitos)'}
                className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-300"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isConsultandoSunat}
                disabled={Boolean(errorFormatoDoc)}
                onClick={handleConsultarSunat}
                className="text-xs"
              >
                Consultar
              </Button>
            </div>
            {errorFormatoDoc ? (
              <p className="text-[11px] font-semibold text-rose-600">{errorFormatoDoc}</p>
            ) : (
              sunatStatusMsg && (
                <p className={`text-[11px] font-semibold ${sunatStatusMsg.tipo === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{sunatStatusMsg.texto}</p>
              )
            )}
            <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Razón social / Nombre completo" className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-300" />
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección / Fundo" className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-300" />
            <div className="flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-300" />
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-300" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">4. Resumen del pedido</h2>
            {carrito.length === 0 ? (
              <p className="text-xs text-slate-400">Aún no agregas productos.</p>
            ) : (
              <div className="space-y-1.5">
                {carrito.map((c) => (
                  <div key={c.producto.id} className="flex justify-between items-center text-xs">
                    <span className="text-slate-700">
                      {c.cantidad} x {c.producto.nombre}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        S/ {(c.cantidad * (c.producto.precio_venta ?? 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <button type="button" onClick={() => eliminarDelCarrito(c.producto.id)} className="text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>S/ {totales.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IGV (18%)</span>
                    <span>S/ {totales.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-sm">
                    <span>Total referencial</span>
                    <span>S/ {totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enviar Solicitud de Cotización
            </Button>
          </div>
        </form>
      </div>

      {cotizacionGenerada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-black text-slate-900">¡Solicitud enviada!</h3>
            <p className="text-xs text-slate-500">
              Registramos tu pedido con el código <strong>{cotizacionGenerada.codigo}</strong>. Nuestro equipo consultará con proveedores y te enviará la
              cotización final.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/admin/cotizaciones')} className="text-xs">
                <LayoutDashboard className="w-3.5 h-3.5" /> Ir al Panel de Cotizaciones
              </Button>
              <Button variant="outline" onClick={handleNuevaCotizacion} className="text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Crear otra cotización
              </Button>
              <Button variant="outline" onClick={handleDescargarPDF} className="text-xs">
                <Download className="w-3.5 h-3.5" /> Descargar referencia PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
