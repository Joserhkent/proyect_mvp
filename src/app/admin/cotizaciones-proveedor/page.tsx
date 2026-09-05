'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Save, 
  X, 
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { obtenerCotizacionesProveedores } from '@/lib/services/cotizaciones-proveedor';
import { CotizacionProveedor, CotizacionProveedorEstado } from '@/types/erp';

interface FormEdicionState {
  id: string;
  costo_unitario: string | number;
  dias_entrega: string | number;
  descuento_aplicado: string | number;
  es_ganadora: boolean;
  estado: CotizacionProveedorEstado;
}

export default function CotizacionesProveedoresListaPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [itemEdicion, setItemEdicion] = useState<FormEdicionState | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refrenscarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const data = await obtenerCotizacionesProveedores();
      setCotizaciones((data as CotizacionProveedor[]) || []);
    } catch (err) {
      showToast('error', 'No se pudieron cargar las cotizaciones.');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelado = false;

    async function fetchInicial() {
      try {
        const data = await obtenerCotizacionesProveedores();
        if (!cancelado) {
          setCotizaciones((data as CotizacionProveedor[]) || []);
        }
      } catch (err) {
        if (!cancelado) {
          showToast('error', 'No se pudieron cargar las cotizaciones.');
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    fetchInicial();

    return () => {
      cancelado = true;
    };
  }, [showToast]);

  const abrirEdicion = (cot: CotizacionProveedor) => {
    setItemEdicion({
      id: cot.id,
      costo_unitario: cot.costo_unitario ?? '',
      dias_entrega: cot.dias_entrega ?? '',
      descuento_aplicado: cot.descuento_aplicado ?? 0,
      es_ganadora: cot.es_ganadora ?? false,
      estado: cot.estado === 'ENVIADO' ? 'RESPONDIDO' : cot.estado,
    });
  };

  const guardarRespuesta = async () => {
    if (!itemEdicion) return;

    try {
      setGuardandoId(itemEdicion.id);
      const supabase = createClient();

      const { error } = await (supabase as any)
        .from('cotizaciones_proveedor')
        .update({
          costo_unitario: itemEdicion.costo_unitario !== '' ? Number(itemEdicion.costo_unitario) : null,
          dias_entrega: itemEdicion.dias_entrega !== '' ? Number(itemEdicion.dias_entrega) : null,
          descuento_aplicado: Number(itemEdicion.descuento_aplicado) || 0,
          es_ganadora: itemEdicion.es_ganadora,
          estado: itemEdicion.estado,
          fecha_respuesta: new Date().toISOString(),
        })
        .eq('id', itemEdicion.id);

      if (error) throw error;

      showToast('success', 'Cotización del proveedor actualizada correctamente.');
      setItemEdicion(null);
      await refrenscarDatos();
    } catch (err) {
      showToast('error', 'Ocurrió un error al guardar la respuesta.');
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-xs font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" /> Monitoreo y Respuestas de Proveedores
          </h1>
          <p className="text-xs text-slate-500">
            Registra los precios ofrecidos y selecciona la opción ganadora por ítem.
          </p>
        </div>
        <Button type="button" onClick={refrenscarDatos} variant="outline" className="text-xs">
          Refrescar
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs">Cargando cotizaciones...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Producto / Insumo</th>
                  <th className="p-3 text-center">Cant.</th>
                  <th className="p-3 text-right">Costo Unit.</th>
                  <th className="p-3 text-center">Días Entrega</th>
                  <th className="p-3 text-center">Canal</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Ganadora</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizaciones.length > 0 ? (
                  cotizaciones.map((cot) => (
                    <tr key={cot.id} className={cot.es_ganadora ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}>
                      <td className="p-3 font-semibold text-slate-800">
                        {cot.proveedor?.razon_social || 'Proveedor Desconocido'}
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {cot.producto_nombre || 'Producto no especificado'}
                      </td>
                      <td className="p-3 text-center font-bold">{cot.cantidad_cotizada}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {cot.costo_unitario != null ? `S/ ${Number(cot.costo_unitario).toFixed(2)}` : <span className="text-slate-400 font-normal italic">Pendiente</span>}
                      </td>
                      <td className="p-3 text-center font-medium">
                        {cot.dias_entrega != null ? `${cot.dias_entrega} días` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {cot.canal_envio || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          cot.estado === 'RESPONDIDO' || cot.estado === 'RECIBIDA'
                            ? 'bg-sky-100 text-sky-700'
                            : cot.estado === 'APROBADO' || cot.estado === 'ACEPTADA'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {cot.estado}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {cot.es_ganadora ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          onClick={() => abrirEdicion(cot)}
                          variant="outline"
                          className="p-1.5 text-xs text-slate-600 hover:text-emerald-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No hay solicitudes de cotización registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Registrar la Respuesta del Proveedor */}
      {itemEdicion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">Registrar Respuesta del Proveedor</h3>
              <button onClick={() => setItemEdicion(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Costo Unitario (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemEdicion.costo_unitario}
                  onChange={(e) => setItemEdicion({ ...itemEdicion, costo_unitario: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Días de Entrega</label>
                <input
                  type="number"
                  value={itemEdicion.dias_entrega}
                  onChange={(e) => setItemEdicion({ ...itemEdicion, dias_entrega: e.target.value })}
                  placeholder="Ej. 3"
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Estado de la Oferta</label>
                <select
                  value={itemEdicion.estado}
                  onChange={(e) => setItemEdicion({ ...itemEdicion, estado: e.target.value as CotizacionProveedorEstado })}
                  className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="RESPONDIDO">RESPONDIDO</option>
                  <option value="APROBADO">APROBADO</option>
                  <option value="RECHAZADO">RECHAZADO</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="es_ganadora"
                  checked={itemEdicion.es_ganadora}
                  onChange={(e) => setItemEdicion({ ...itemEdicion, es_ganadora: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="es_ganadora" className="font-bold text-slate-700 cursor-pointer">
                  Marcar como opción ganadora para este insumo
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" onClick={() => setItemEdicion(null)} variant="outline" className="text-xs">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={guardarRespuesta}
                disabled={guardandoId === itemEdicion.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-2"
              >
                {guardandoId === itemEdicion.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Respuesta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}