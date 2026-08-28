'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, MapPin, Clock, Plus, ArrowLeft, FileCheck, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { generarInformeTecnicoPDF } from '@/lib/documents';
import { OrdenTrabajoConRelaciones, FirmaOrdenTrabajo } from '@/lib/queries/ordenesTrabajo';
import { BitacoraTecnica, BitacoraEtapa } from '@/types/db';
import { obtenerOrdenTrabajoCompleta, agregarHitoBitacora, finalizarOTConFirma, actualizarEstadoOT } from '@/app/actions/ordenesTrabajo';

const ETAPAS: BitacoraEtapa[] = ['VISITA_INICIAL', 'DIAGNOSTICO', 'PROPUESTA', 'IMPLEMENTACION', 'SEGUIMIENTO', 'CIERRE'];

export function TecnicoClient({ ordenesTrabajo }: { ordenesTrabajo: OrdenTrabajoConRelaciones[] }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [otSeleccionadaId, setOtSeleccionadaId] = useState<string | null>(ordenesTrabajo[0]?.id ?? null);
  const [detalle, setDetalle] = useState<{ ordenTrabajo: OrdenTrabajoConRelaciones; bitacora: BitacoraTecnica[]; firma: FirmaOrdenTrabajo | null } | null>(null);

  const [etapa, setEtapa] = useState<BitacoraEtapa>('IMPLEMENTACION');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [materialesExtra, setMaterialesExtra] = useState('');
  const [isAddingHito, setIsAddingHito] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nombreFirmante, setNombreFirmante] = useState('');

  useEffect(() => {
    if (otSeleccionadaId) cargarDetalle(otSeleccionadaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otSeleccionadaId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [detalle]);

  async function cargarDetalle(id: string) {
    try {
      const res = await obtenerOrdenTrabajoCompleta(id);
      setDetalle(res);
      setHasSignature(false);
    } catch {
      showToast('error', 'No se pudo cargar la orden de trabajo.');
    }
  }

  type CanvasPointerEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

  const getPointerPosition = (e: CanvasPointerEvent) => {
    if ('touches' in e) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const startDrawing = (e: CanvasPointerEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getPointerPosition(e);
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: CanvasPointerEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getPointerPosition(e);
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  function handleGuardarHito(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle || !titulo) return;
    startTransition(async () => {
      try {
        await agregarHitoBitacora(detalle.ordenTrabajo.id, etapa, titulo, descripcion || undefined, materialesExtra ? { materiales_extra: materialesExtra } : undefined);
        setIsAddingHito(false);
        setTitulo('');
        setDescripcion('');
        setMaterialesExtra('');
        cargarDetalle(detalle.ordenTrabajo.id);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'No se pudo guardar el hito.');
      }
    });
  }

  function handleIniciar() {
    if (!detalle) return;
    startTransition(async () => {
      await actualizarEstadoOT(detalle.ordenTrabajo.id, 'EN_PROGRESO');
      cargarDetalle(detalle.ordenTrabajo.id);
    });
  }

  function handleFinalizar() {
    if (!detalle || !canvasRef.current || !hasSignature || !nombreFirmante) {
      showToast('error', 'Ingresa el nombre del firmante y solicita la firma en pantalla.');
      return;
    }
    const firmaData = canvasRef.current.toDataURL('image/png');
    startTransition(async () => {
      try {
        await finalizarOTConFirma(detalle.ordenTrabajo.id, firmaData, nombreFirmante);
        showToast('success', 'Instalación finalizada y firmada por el cliente.');
        cargarDetalle(detalle.ordenTrabajo.id);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'No se pudo finalizar.');
      }
    });
  }

  const ot = detalle?.ordenTrabajo;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-50 border border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-sm font-black text-slate-900 block leading-tight">Portal Técnico de Campo</span>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">AgroFertil Móvil</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {ordenesTrabajo.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-1.5">
            <p className="text-sm font-bold text-slate-700">Todavía no tienes órdenes de trabajo asignadas</p>
            <p className="text-xs text-slate-500">
              Una orden aparece aquí cuando, en el panel administrativo, se asigna un técnico a una cotización de tipo
              &quot;Proyecto (Mesa)&quot; ya aprobada por el cliente.
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Orden de Trabajo Asignada:</label>
            <select
              value={otSeleccionadaId ?? ''}
              onChange={(e) => setOtSeleccionadaId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs"
            >
              {ordenesTrabajo.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo} - {o.clientes?.razon_social} ({o.estado})
                </option>
              ))}
            </select>
          </div>
        )}

        {ot && (
          <>
            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-emerald-900 bg-white px-2.5 py-1 rounded-lg">{ot.codigo}</span>
                <StatusBadge status={ot.estado} className="bg-white/90 text-slate-900 border-white/60" />
              </div>
              <h2 className="text-base font-black text-white leading-tight">{ot.clientes?.razon_social}</h2>
              <div className="space-y-1.5 text-xs text-emerald-100">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span>{ot.clientes?.direccion}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Inicio: {ot.fecha_inicio ? new Date(ot.fecha_inicio).toLocaleDateString('es-PE') : ''}</span>
                </div>
              </div>
              {ot.estado === 'CREADA' && (
                <Button disabled={isPending} onClick={handleIniciar} className="w-full py-2.5 bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs rounded-xl shadow-md border-0">
                  Iniciar Trabajo en Fundo
                </Button>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bitácora Técnica</h3>
                  <p className="text-[11px] text-slate-500">Registro cronológico de avance</p>
                </div>
                {ot.estado !== 'COMPLETADA' && (
                  <Button size="sm" onClick={() => setIsAddingHito(!isAddingHito)} className="text-xs font-bold">
                    <Plus className="w-3.5 h-3.5" /> Nuevo Hito
                  </Button>
                )}
              </div>

              {isAddingHito && (
                <form onSubmit={handleGuardarHito} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <select value={etapa} onChange={(e) => setEtapa(e.target.value as BitacoraEtapa)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300">
                    {ETAPAS.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Título del hito"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <textarea
                    rows={2}
                    placeholder="Notas técnicas / observaciones"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <input
                    placeholder="Materiales adicionales usados (opcional)"
                    value={materialesExtra}
                    onChange={(e) => setMaterialesExtra(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingHito(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={isPending} className="text-xs font-bold">
                      Guardar Hito
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {(detalle?.bitacora ?? []).map((b) => {
                  const adjuntos = (b.adjuntos as { materiales_extra?: string } | null) ?? null;
                  return (
                    <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900">
                          {b.etapa} — {b.titulo}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">{b.created_at ? new Date(b.created_at).toLocaleString('es-PE') : ''}</span>
                      </div>
                      {b.descripcion && <p className="text-xs text-slate-700 leading-relaxed">{b.descripcion}</p>}
                      {adjuntos?.materiales_extra && (
                        <div className="text-[11px] p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                          <strong>Material extra:</strong> {adjuntos.materiales_extra}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Firma Digital de Conformidad</h3>
              </div>

              {ot.estado === 'COMPLETADA' ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>¡Instalación FINALIZADA y Aprobada por el Cliente!</span>
                  </div>
                  {detalle?.firma && (
                    <div className="inline-block p-2 bg-white rounded-xl border border-emerald-300 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detalle.firma.url_storage} alt="Firma del cliente" className="h-20 object-contain mx-auto" />
                    </div>
                  )}
                  <Button
                    onClick={() =>
                      generarInformeTecnicoPDF({
                        codigo: ot.codigo ?? '',
                        cliente_nombre: ot.clientes?.razon_social ?? '',
                        ubicacion: ot.clientes?.direccion ?? '',
                        tecnico_nombre: ot.usuarios?.nombre ?? '',
                        fecha_programada: ot.fecha_inicio ? new Date(ot.fecha_inicio).toLocaleDateString('es-PE') : '',
                        estado: ot.estado,
                        bitacora: (detalle?.bitacora ?? []).map((b) => ({ titulo: `${b.etapa} — ${b.titulo}`, descripcion: b.descripcion ?? undefined, fecha: b.created_at ?? '' })),
                        firma_url: detalle?.firma?.url_storage,
                      })
                    }
                    className="text-xs"
                  >
                    <Download className="w-4 h-4" /> Descargar Informe Técnico Final (PDF)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    required
                    placeholder="Nombre y cargo del cliente que recibe"
                    value={nombreFirmante}
                    onChange={(e) => setNombreFirmante(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">Dibuja la firma aquí:</label>
                      <button type="button" onClick={clearCanvas} className="text-[10px] text-rose-600 hover:underline flex items-center gap-1 font-bold">
                        <Trash2 className="w-3 h-3" /> Limpiar
                      </button>
                    </div>
                    <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-white p-1">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-36 touch-none cursor-crosshair"
                      />
                    </div>
                  </div>
                  <Button type="button" disabled={!hasSignature || isPending} onClick={handleFinalizar} className="w-full py-3 font-bold text-xs rounded-xl">
                    <FileCheck className="w-4 h-4 mr-1" /> Firmar y Generar Informe Técnico Final
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
