'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wrench, MapPin, User, Eye, Download } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { OrdenTrabajo } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';

export default function AdminOrdenesTrabajoPage() {
  const { ordenesTrabajo } = useAgroErp();
  const { showToast } = useToast();
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Módulo Técnico • Órdenes de Trabajo en Campo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión del ensamblaje e instalación de mesas de fertilización, bitácoras fotográficas y firmas de conformidad.
          </p>
        </div>

        <Link href="/tecnico">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs">
            <Wrench className="w-4 h-4" />
            Abrir App del Técnico de Campo
          </Button>
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordenesTrabajo.map((ot) => (
          <div
            key={ot.id}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  {ot.codigo}
                </span>
                <StatusBadge status={ot.estado} />
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-snug">{ot.cliente_nombre}</h3>

              <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{ot.ubicacion_fundo}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                <User className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="font-semibold text-slate-800">{ot.tecnico_nombre}</span>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Hitos en Bitácora:</span>
                  <span className="font-bold text-emerald-700">{ot.bitacora.length} registrados</span>
                </div>
                <div className="flex justify-between text-slate-600 mt-1">
                  <span>Firma del Cliente:</span>
                  <span className={ot.firma_cliente_url ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {ot.firma_cliente_url ? '✓ Firmado Conforme' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-500 font-mono">Prog: {ot.fecha_programada}</span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOT(ot)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver Bitácora & Informe
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Visor de Bitácora & Informe Técnico */}
      {selectedOT && (
        <Modal
          isOpen={Boolean(selectedOT)}
          onClose={() => setSelectedOT(null)}
          title={`Informe Técnico de Campo: ${selectedOT.codigo}`}
          description={`Cliente: ${selectedOT.cliente_nombre} • Fundo: ${selectedOT.ubicacion_fundo}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="font-semibold text-slate-500 block">Técnico Responsable:</span>
                <span className="font-bold text-slate-900">{selectedOT.tecnico_nombre}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">Estado del Trabajo:</span>
                <span className="font-bold text-emerald-700">{selectedOT.estado}</span>
              </div>
            </div>

            {/* Timeline of milestones */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Bitácora Cronológica de Avance:</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedOT.bitacora.length === 0 ? (
                  <p className="text-slate-500 italic">No hay hitos registrados aún.</p>
                ) : (
                  selectedOT.bitacora.map((b, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800">{b.hito}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {b.fecha_registro} • {b.hora_registro}
                        </span>
                      </div>
                      <p className="text-slate-700">{b.nota}</p>
                      {b.materiales_extra && (
                        <div className="text-[11px] bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-200">
                          <strong>Materiales adicionales usados:</strong> {b.materiales_extra}
                        </div>
                      )}
                      {b.foto_url && (
                        <div className="mt-2">
                          <img
                            src={b.foto_url}
                            alt="Foto de avance"
                            className="w-full h-36 object-cover rounded-lg border border-slate-300"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Digital Signature */}
            {selectedOT.firma_cliente_url && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="font-bold block mb-1">Firma Digital de Conformidad del Cliente:</span>
                <img
                  src={selectedOT.firma_cliente_url}
                  alt="Firma del cliente"
                  className="h-16 bg-white rounded border border-emerald-300 p-1 object-contain"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Firmado por: {selectedOT.firma_cliente_nombre || selectedOT.cliente_nombre}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() =>
                  showToast(
                    'info',
                    `Simulando generación del Informe Técnico PDF de ${selectedOT.codigo} — se conectará al generador de PDF real en producción.`
                  )
                }
                className="text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Informe Técnico PDF
              </Button>
              <Button onClick={() => setSelectedOT(null)} className="bg-slate-900 text-white text-xs">
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
