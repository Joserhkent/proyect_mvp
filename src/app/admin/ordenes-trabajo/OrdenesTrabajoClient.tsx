'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wrench, MapPin, User, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { generarInformeTecnicoPDF } from '@/lib/documents';
import { OrdenTrabajoConRelaciones, FirmaOrdenTrabajo } from '@/lib/queries/ordenesTrabajo';
import { BitacoraTecnica } from '@/types/db';
import { obtenerOrdenTrabajoCompleta } from '@/app/actions/ordenesTrabajo';

export function OrdenesTrabajoClient({ ordenesTrabajo }: { ordenesTrabajo: OrdenTrabajoConRelaciones[] }) {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<{ ordenTrabajo: OrdenTrabajoConRelaciones; bitacora: BitacoraTecnica[]; firma: FirmaOrdenTrabajo | null } | null>(null);

  async function abrir(id: string) {
    setSelectedId(id);
    try {
      const res = await obtenerOrdenTrabajoCompleta(id);
      setDetalle(res);
    } catch {
      showToast('error', 'No se pudo cargar la orden de trabajo.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Módulo Técnico • Órdenes de Trabajo en Campo</h1>
          <p className="text-xs text-slate-500 mt-1">Supervisión de instalación, bitácoras y firmas de conformidad.</p>
        </div>
        <Link href="/tecnico">
          <Button className="text-xs font-bold">
            <Wrench className="w-4 h-4" /> Abrir App del Técnico
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordenesTrabajo.length === 0 && <p className="text-xs text-slate-400 col-span-full text-center py-10">No hay órdenes de trabajo aún.</p>}
        {ordenesTrabajo.map((ot) => (
          <div key={ot.id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">{ot.codigo}</span>
                <StatusBadge status={ot.estado} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{ot.clientes?.razon_social}</h3>
              <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{ot.clientes?.direccion}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                <User className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="font-semibold text-slate-800">{ot.usuarios?.nombre}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-500 font-mono">{ot.fecha_inicio ? new Date(ot.fecha_inicio).toLocaleDateString('es-PE') : ''}</span>
              <Button size="sm" variant="outline" onClick={() => abrir(ot.id)} className="text-xs">
                <Eye className="w-3.5 h-3.5" /> Ver Bitácora
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedId && (
        <Modal isOpen={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Informe Técnico de Campo" maxWidth="lg">
          {!detalle ? (
            <div className="py-10 text-center text-xs text-slate-400">Cargando...</div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-500 block">Técnico:</span>
                  <span className="font-bold text-slate-900">{detalle.ordenTrabajo.usuarios?.nombre}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Estado:</span>
                  <StatusBadge status={detalle.ordenTrabajo.estado} />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Bitácora:</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {detalle.bitacora.length === 0 ? (
                    <p className="text-slate-500 italic">No hay hitos registrados aún.</p>
                  ) : (
                    detalle.bitacora.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">
                            {b.etapa} — {b.titulo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{b.created_at ? new Date(b.created_at).toLocaleString('es-PE') : ''}</span>
                        </div>
                        {b.descripcion && <p className="text-slate-700">{b.descripcion}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {detalle.firma && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <span className="font-bold block mb-1">Firma Digital de Conformidad:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detalle.firma.url_storage} alt="Firma del cliente" className="h-16 bg-white rounded border border-emerald-300 p-1 object-contain" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={() => {
                    generarInformeTecnicoPDF({
                      codigo: detalle.ordenTrabajo.codigo ?? '',
                      cliente_nombre: detalle.ordenTrabajo.clientes?.razon_social ?? '',
                      ubicacion: detalle.ordenTrabajo.clientes?.direccion ?? '',
                      tecnico_nombre: detalle.ordenTrabajo.usuarios?.nombre ?? '',
                      fecha_programada: detalle.ordenTrabajo.fecha_inicio ? new Date(detalle.ordenTrabajo.fecha_inicio).toLocaleDateString('es-PE') : '',
                      estado: detalle.ordenTrabajo.estado,
                      bitacora: detalle.bitacora.map((b) => ({ titulo: `${b.etapa} — ${b.titulo}`, descripcion: b.descripcion ?? undefined, fecha: b.created_at ?? '' })),
                      firma_url: detalle.firma?.url_storage,
                    });
                    showToast('success', 'Informe técnico PDF descargado.');
                  }}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar Informe PDF
                </Button>
                <Button onClick={() => setSelectedId(null)} className="text-xs">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
