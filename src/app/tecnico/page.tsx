'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Camera, MapPin, Clock, Plus, ArrowLeft, FileCheck, Download, Trash2 } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { OrdenTrabajo } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';

export default function TecnicoCampoPage() {
  const { ordenesTrabajo, agregarHitoBitacora, finalizarOTConFirma, actualizarEstadoOT } = useAgroErp();
  const { showToast } = useToast();

  const [otSeleccionada, setOtSeleccionada] = useState<OrdenTrabajo | null>(
    ordenesTrabajo[0] || null
  );

  // Nuevo Hito
  const [nuevoHitoTitulo, setNuevoHitoTitulo] = useState('4. Calibración de Inyectores Venturi y Medición de EC');
  const [nuevoHitoNota, setNuevoHitoNota] = useState('Se programaron 4 recetas de fertirriego. La conductividad eléctrica se mantiene estable en 2.4 mS/cm y pH en 5.8.');
  const [fotoUrl, setFotoUrl] = useState('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80');
  const [materialesExtra, setMaterialesExtra] = useState('1x Válvula de alivio 3/4" de repuesto');
  const [isAddingHito, setIsAddingHito] = useState(false);

  // Firma Digital en Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nombreFirmante, setNombreFirmante] = useState('Ing. Manuel Benavides (Jefe de Riego)');

  // Sync selected OT with context state
  const currentOT = ordenesTrabajo.find((o) => o.id === otSeleccionada?.id) || otSeleccionada;

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [currentOT]);

  // Drawing handlers for touch & mouse
  type CanvasPointerEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

  const getPointerPosition = (e: CanvasPointerEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const startDrawing = (e: CanvasPointerEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleGuardarHito = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOT || !nuevoHitoTitulo) return;

    agregarHitoBitacora(
      currentOT.id,
      nuevoHitoTitulo,
      nuevoHitoNota,
      fotoUrl || undefined,
      materialesExtra || undefined
    );

    setIsAddingHito(false);
    setNuevoHitoTitulo('');
    setNuevoHitoNota('');
    setMaterialesExtra('');
  };

  const handleFinalizarTrabajo = () => {
    if (!currentOT || !canvasRef.current || !hasSignature) {
      showToast('error', 'Por favor solicita la firma del cliente en pantalla antes de finalizar.');
      return;
    }

    const firmaData = canvasRef.current.toDataURL('image/png');
    finalizarOTConFirma(currentOT.id, firmaData, nombreFirmante);
    showToast('success', 'Instalación finalizada y firmada por el cliente.');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Mobile Top App Bar */}
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

        <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
          Juan Quispe (Técnico)
        </span>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        
        {/* OT Selector Dropdown */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Seleccionar Orden de Trabajo Asignada:
          </label>
          <select
            value={currentOT?.id}
            onChange={(e) => {
              const ot = ordenesTrabajo.find((o) => o.id === e.target.value);
              if (ot) setOtSeleccionada(ot);
            }}
            className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {ordenesTrabajo.map((ot) => (
              <option key={ot.id} value={ot.id}>
                {ot.codigo} - {ot.cliente_nombre} ({ot.estado})
              </option>
            ))}
          </select>
        </div>

        {currentOT && (
          <>
            {/* Active OT Card Banner */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-emerald-900 bg-white px-2.5 py-1 rounded-lg">
                  {currentOT.codigo}
                </span>
                <StatusBadge status={currentOT.estado} className="bg-white/90 text-slate-900 border-white/60" />
              </div>

              <h2 className="text-base font-black text-white leading-tight">
                {currentOT.cliente_nombre}
              </h2>

              <div className="space-y-1.5 text-xs text-emerald-100">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span>{currentOT.ubicacion_fundo}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Programado: {currentOT.fecha_programada}</span>
                </div>
              </div>

              {currentOT.estado === 'PENDIENTE' && (
                <Button
                  onClick={() => actualizarEstadoOT(currentOT.id, 'EN_PROCESO')}
                  className="w-full py-2.5 bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs rounded-xl shadow-md border-0"
                >
                  Iniciar Trabajo en Fundo (Marcar En Proceso)
                </Button>
              )}
            </div>

            {/* Bitácora de Avance en Campo */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bitácora Técnica en Tiempo Real</h3>
                  <p className="text-[11px] text-slate-500">Registro cronológico con fotos de avance y notas</p>
                </div>

                {currentOT.estado !== 'FINALIZADO' && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddingHito(!isAddingHito)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Hito
                  </Button>
                )}
              </div>

              {/* Formulario Agregar Hito */}
              {isAddingHito && (
                <form onSubmit={handleGuardarHito} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-emerald-800">Registrar Hito de Instalación:</h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Título del Hito:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Montaje de válvulas y prueba de fugas..."
                      value={nuevoHitoTitulo}
                      onChange={(e) => setNuevoHitoTitulo(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nota Técnica / Observaciones:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre presiones, caudales o ajustes realizados..."
                      value={nuevoHitoNota}
                      onChange={(e) => setNuevoHitoNota(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Materiales adicionales usados en campo (si aplica):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 2x Niples 1 pulgada, cinta teflón..."
                      value={materialesExtra}
                      onChange={(e) => setMaterialesExtra(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      URL de Fotografía de Avance (o Cámara):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fotoUrl}
                        onChange={(e) => setFotoUrl(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFotoUrl('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80')}
                        className="px-3 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-lg text-xs flex items-center gap-1 shrink-0 font-medium"
                      >
                        <Camera className="w-3.5 h-3.5" /> Foto Ejemplo
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingHito(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                      Guardar Hito
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista de Hitos */}
              <div className="space-y-3">
                {currentOT.bitacora.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{b.hito}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {b.fecha_registro} • {b.hora_registro}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{b.nota}</p>

                    {b.materiales_extra && (
                      <div className="text-[11px] p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                        <strong>Material extra:</strong> {b.materiales_extra}
                      </div>
                    )}

                    {b.foto_url && (
                      <div className="pt-2">
                        <img
                          src={b.foto_url}
                          alt="Foto de avance"
                          className="w-full h-48 object-cover rounded-xl border border-slate-300 shadow-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Signature & Final Report Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Firma Digital de Conformidad del Cliente</h3>
                <p className="text-[11px] text-slate-500">
                  El cliente o encargado del fundo firma en la pantalla con el dedo para validar la instalación conforme.
                </p>
              </div>

              {currentOT.estado === 'FINALIZADO' ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>¡Instalación FINALIZADA y Aprobada por el Cliente!</span>
                  </div>

                  {currentOT.firma_cliente_url && (
                    <div className="inline-block p-2 bg-white rounded-xl border border-emerald-300 shadow-xs">
                      <img
                        src={currentOT.firma_cliente_url}
                        alt="Firma del cliente"
                        className="h-20 object-contain mx-auto"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-700">
                    Firmado por: <strong>{currentOT.firma_cliente_nombre}</strong>
                  </p>

                  <Button
                    onClick={() =>
                      showToast(
                        'info',
                        `Simulando generación del Informe Técnico PDF de ${currentOT.codigo} — se conectará al generador de PDF real en producción.`
                      )
                    }
                    className="text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Informe Técnico Final (PDF)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre y Cargo del Cliente que Recibe la Mesa:
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreFirmante}
                      onChange={(e) => setNombreFirmante(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Canvas Pad */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Dibuja la firma aquí (Usa tu dedo o mouse):
                      </label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[10px] text-rose-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Limpiar firma
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

                  <Button
                    type="button"
                    onClick={handleFinalizarTrabajo}
                    disabled={!hasSignature}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 mr-1" />
                    Firmar y Generar Informe Técnico Final
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
