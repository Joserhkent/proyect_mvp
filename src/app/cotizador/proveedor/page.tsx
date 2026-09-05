'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Send, 
  Mail, 
  MessageSquare, 
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { buscarProductos } from '@/lib/services/productos';
import { guardarCotizacionProveedor } from '@/lib/services/cotizaciones-proveedor';
import { Proveedor, Producto, ItemRequerimiento, CanalEnvioCotizacion } from '@/types/erp';

export default function CotizadorProveedorPage() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  // Catálogos
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productosDB, setProductosDB] = useState<Producto[]>([]);

  // Selección de Proveedor y Canal
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [canalEnvio, setCanalEnvio] = useState<CanalEnvioCotizacion>('WHATSAPP');
  const [notaAdicional, setNotaAdicional] = useState('');

  // Ítems a solicitar
  const [items, setItems] = useState<ItemRequerimiento[]>([]);

  // Buscador de productos
  const [busquedaProd, setBusquedaProd] = useState('');
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [observacion, setObservacion] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar Proveedores y Productos al montar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const supabase = createClient();
        const [{ data: provs }, prods] = await Promise.all([
          (supabase as any).from('proveedores').select('*').order('razon_social'),
          buscarProductos()
        ]);
        setProveedores(provs || []);
        setProductosDB(prods || []);
      } catch (err) {
        showToast('error', 'No se pudieron cargar los proveedores o productos.');
      }
    };
    cargarDatos();
  }, []);

  const agregarItem = () => {
    if (!productoSel && !busquedaProd.trim()) {
      showToast('error', 'Selecciona o escribe el nombre del producto.');
      return;
    }

    const nuevoItem: ItemRequerimiento = {
      id: `item-${Date.now()}`,
      producto_id: productoSel?.id || '',
      producto_nombre: productoSel ? productoSel.nombre : busquedaProd,
      cantidad,
      observacion
    };

    setItems([...items, nuevoItem]);
    setProductoSel(null);
    setBusquedaProd('');
    setCantidad(1);
    setObservacion('');
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const generarTextoMensaje = () => {
    const lista = items
      .map((it, idx) => `${idx + 1}. *${it.producto_nombre}* - Cant: ${it.cantidad}${it.observacion ? ` (${it.observacion})` : ''}`)
      .join('\n');

    return `Hola ${proveedorSeleccionado?.contacto || proveedorSeleccionado?.razon_social || ''},\n\nEstimados, nos gustaría solicitar una cotización para los siguientes ítems:\n\n${lista}\n\n${notaAdicional ? `Nota: ${notaAdicional}\n\n` : ''}Quedamos a la espera de su propuesta. Gracias.`;
  };

  const handleEnviar = async () => {
    if (!proveedorSeleccionado) return showToast('error', 'Selecciona un proveedor.');
    if (items.length === 0) return showToast('error', 'Agrega al menos un producto a la solicitud.');

    try {
      setCargando(true);

      // 1. Persistir solicitud en Supabase (cotizaciones_proveedor)
      await guardarCotizacionProveedor({
        proveedor_id: proveedorSeleccionado.id,
        canal_envio: canalEnvio,
        notas: notaAdicional,
        detalles: items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      showToast('success', 'Solicitud registrada en la base de datos.');

      // 2. Disparar comunicación externa
      const texto = generarTextoMensaje();

      if (canalEnvio === 'WHATSAPP') {
        const tel = proveedorSeleccionado.telefono?.replace(/\D/g, '');
        if (!tel) {
          showToast('error', 'El proveedor no tiene teléfono registrado.');
          return;
        }
        const url = `https://wa.me/${tel.startsWith('51') ? tel : `51${tel}`}?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
      } else {
        const email = proveedorSeleccionado.email;
        if (!email) {
          showToast('error', 'El proveedor no tiene correo registrado.');
          return;
        }
        const asunto = encodeURIComponent(`Solicitud de Cotización - ${proveedorSeleccionado.razon_social}`);
        const body = encodeURIComponent(texto);
        window.open(`mailto:${email}?subject=${asunto}&body=${body}`, '_blank');
      }

      // Limpiar el formulario
      setItems([]);
      setNotaAdicional('');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  const productosFiltrados = productosDB.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()) ||
    p.sku?.toLowerCase().includes(busquedaProd.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-xs font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.message}
        </div>
      )}

      {/* 1. Selección de Proveedor */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" /> Seleccionar Proveedor
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Proveedor *</label>
            <select
              value={proveedorSeleccionado?.id || ''}
              onChange={(e) => {
                const prov = proveedores.find((p) => p.id === e.target.value);
                setProveedorSeleccionado(prov || null);
              }}
              className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Selecciona un Proveedor --</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social} {p.num_doc || p.ruc ? `(${p.num_doc || p.ruc})` : ''}
                </option>
              ))}
            </select>
          </div>

          {proveedorSeleccionado && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">{proveedorSeleccionado.razon_social}</p>
              <p>Contacto: <span className="font-medium text-slate-700">{proveedorSeleccionado.contacto || 'N/A'}</span></p>
              <div className="flex gap-4 text-[11px] pt-1">
                <span>Tel/WA: <b>{proveedorSeleccionado.telefono || 'Sin teléfono'}</b></span>
                <span>Email: <b>{proveedorSeleccionado.email || 'Sin correo'}</b></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Agregar Productos a la Solicitud */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-600" /> Ítems a Requerir
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="relative sm:col-span-6">
            <input
              type="text"
              placeholder="Buscar insumo o escribir directamente..."
              value={busquedaProd}
              onChange={(e) => {
                setBusquedaProd(e.target.value);
                setMostrarResultados(true);
              }}
              onFocus={() => setMostrarResultados(true)}
              className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {mostrarResultados && busquedaProd.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y">
                {productosFiltrados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setProductoSel(p);
                      setBusquedaProd(p.nombre);
                      setMostrarResultados(false);
                    }}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer font-medium"
                  >
                    {p.nombre} {p.sku && <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              placeholder="Cant."
              className="w-full p-2.5 border rounded-lg bg-white text-center"
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Obs. (Ej: Marca específica)"
              className="w-full p-2.5 border rounded-lg bg-white"
            />
          </div>

          <div className="sm:col-span-1">
            <Button type="button" onClick={agregarItem} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg">
              <Plus className="w-4 h-4 mx-auto" />
            </Button>
          </div>
        </div>

        {/* Tabla de ítems agregados */}
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="p-2.5">Producto / Descripción</th>
              <th className="p-2.5 text-center">Cantidad</th>
              <th className="p-2.5">Observación</th>
              <th className="p-2.5 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length > 0 ? (
              items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="p-2.5 font-semibold text-slate-800">{it.producto_nombre}</td>
                  <td className="p-2.5 text-center font-bold">{it.cantidad}</td>
                  <td className="p-2.5 text-slate-500">{it.observacion || '-'}</td>
                  <td className="p-2.5 text-center">
                    <button type="button" onClick={() => eliminarItem(idx)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                  No has agregado ítems a la solicitud.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Canal de Envío y Notas */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Canal de Comunicación y Mensaje</h2>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCanalEnvio('WHATSAPP')}
            className={`flex-1 p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
              canalEnvio === 'WHATSAPP'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Enviar por WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setCanalEnvio('EMAIL')}
            className={`flex-1 p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
              canalEnvio === 'EMAIL'
                ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" /> Enviar por Correo (Gmail)
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nota Adicional / Condiciones</label>
          <input
            type="text"
            value={notaAdicional}
            onChange={(e) => setNotaAdicional(e.target.value)}
            placeholder="Ej. Tiempo estimado de entrega, lugar de despacho..."
            className="w-full p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleEnviar}
          disabled={cargando || !proveedorSeleccionado || items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-6 py-3 rounded-xl flex items-center gap-2"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar Solicitud ({canalEnvio})
        </Button>
      </div>
    </div>
  );
}