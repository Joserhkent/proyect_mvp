'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Camera, MapPin, Clock, Plus, ArrowLeft, FileCheck, Download, Trash2, AlertTriangle, Loader2, ClipboardX, LogOut } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { generarInformeTecnicoPDF } from '@/lib/documents';

export default function TecnicoCampoPage() {
  const {
    ordenesTrabajo,
    agregarHitoBitacora,
    finalizarOTConFirma,
    actualizarEstadoOT,
    usuarioActual,
    catalogosCargando,
    catalogosError,
    authResuelto,
    authUserId,
    cerrarSesion,
  } = useAgroErp();
  const { showToast } = useToast();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function handleCerrarSesion() {
    setCerrandoSesion(true);
    await cerrarSesion();
    router.push('/');
    router.refresh();
  }

  // Solo las órdenes asignadas al técnico autenticado. Si el usuario activo
  // no tiene rol TECNICO (o aún no se resolvió su identidad), no se listan.
  const identidadLista = Boolean(usuarioActual.id);
  const ordenesDelTecnico = identidadLista
    ? ordenesTrabajo.filter((ot) => ot.tecnico_id === usuarioActual.id)
    : [];

  // La identidad del usuario se resuelve de forma asíncrona (sesión de Supabase)
  // en paralelo a la carga de catálogos. Mientras cualquiera de las dos siga
  // pendiente, se trata como "cargando" para no pintar "Sin órdenes" antes de
  // tiempo con una lista todavía vacía por falta de identidad, no por falta de datos.
  const cargandoDatos = catalogosCargando || !identidadLista;

  // Si tras 3 segundos seguimos "cargando", algo se atascó (sesión, red, RLS).
  // En vez de dejar el spinner girando para siempre, se corta forzosamente y
  // se ofrece reintentar, dejando en consola el estado exacto para diagnosticar.
  const [cargaAtascada, setCargaAtascada] = useState(false);

  useEffect(() => {
    if (!cargandoDatos) {
      const reset = setTimeout(() => setCargaAtascada(false), 0);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => {
      console.warn('[AgroErp/tecnico] La carga superó 3s sin resolver. Estado actual:', {
        authResuelto,
        authUserId,
        usuarioActualId: usuarioActual.id,
        catalogosCargando,
        catalogosError,
      });
      setCargaAtascada(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [cargandoDatos, authResuelto, authUserId, usuarioActual.id, catalogosCargando, catalogosError]);

  function handleReintentarConexion() {
    console.warn('[AgroErp/tecnico] Reintentando conexión, recargando la página...');
    window.location.reload();
  }

  // Selección manual del usuario; si aún no eligió nada (o su elección ya no
  // pertenece a este técnico), cae a la primera OT de la lista cargada.
  const [otSeleccionadaId, setOtSeleccionadaId] = useState<string | null>(null);
  const otSeleccionValida = otSeleccionadaId !== null && ordenesDelTecnico.some((ot) => ot.id === otSeleccionadaId);
  const otActivaId = otSeleccionValida ? otSeleccionadaId : (ordenesDelTecnico[0]?.id ?? null);

  // Nuevo Hito
  const [nuevoHitoTitulo, setNuevoHitoTitulo] = useState('');
  const [nuevoHitoNota, setNuevoHitoNota] = useState('');
  const [materialesExtra, setMaterialesExtra] = useState('');
  const [isAddingHito, setIsAddingHito] = useState(false);
  const [guardandoHito, setGuardandoHito] = useState(false);

  // Foto de evidencia (cámara real del dispositivo)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function handleQuitarFoto() {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Ubicación GPS del hito
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionEstado, setUbicacionEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle');

  function obtenerUbicacion() {
    if (!navigator.geolocation) {
      setUbicacionEstado('error');
      return;
    }
    setUbicacionEstado('cargando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUbicacionEstado('ok');
      },
      () => setUbicacionEstado('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddingHito) {
        obtenerUbicacion();
      } else {
        setUbicacion(null);
        setUbicacionEstado('idle');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isAddingHito]);

  // Firma Digital en Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nombreFirmante, setNombreFirmante] = useState('');

  const currentOT = ordenesDelTecnico.find((o) => o.id === otActivaId) ?? null;

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

  const handleGuardarHito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOT || !nuevoHitoTitulo) return;

    setGuardandoHito(true);
    await agregarHitoBitacora(
      currentOT.id,
      nuevoHitoTitulo,
      nuevoHitoNota,
      fotoFile || undefined,
      materialesExtra || undefined,
      ubicacion || undefined
    );
    setGuardandoHito(false);

    setIsAddingHito(false);
    setNuevoHitoTitulo('');
    setNuevoHitoNota('');
    setMaterialesExtra('');
    handleQuitarFoto();
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
          {usuarioActual.id && usuarioActual.rol === 'ADMIN' && (
            <Link
              href="/admin"
              title="Volver al panel administrativo"
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-50 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <span className="text-sm font-black text-slate-900 block leading-tight">Portal Técnico de Campo</span>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">AgroFertil Móvil</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
            {usuarioActual.nombre || 'Técnico'} (Técnico)
          </span>

          <button
            type="button"
            onClick={handleCerrarSesion}
            disabled={cerrandoSesion}
            title="Cerrar sesión"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cerrandoSesion ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">

        {/* OT Selector Dropdown */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Seleccionar Orden de Trabajo Asignada:
          </label>

          {cargandoDatos && cargaAtascada ? (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 font-medium">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                La conexión está tardando más de lo normal.
              </span>
              <button
                type="button"
                onClick={handleReintentarConexion}
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Reintentar conexión
              </button>
            </div>
          ) : cargandoDatos ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando órdenes...
            </div>
          ) : catalogosError ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Error al cargar órdenes. Intenta recargar la página.
            </div>
          ) : ordenesDelTecnico.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-500">
              <ClipboardX className="w-4 h-4 shrink-0" />
              Sin órdenes asignadas actualmente.
            </div>
          ) : (
            <select
              value={otActivaId ?? ''}
              onChange={(e) => setOtSeleccionadaId(e.target.value || null)}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ordenesDelTecnico.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  {ot.codigo} - {ot.cliente_nombre} ({ot.estado})
                </option>
              ))}
            </select>
          )}
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

              <div className="space-y-1.5 text-sm text-emerald-100">
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
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Foto de evidencia (opcional):
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                    {fotoPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fotoPreview}
                          alt="Vista previa de la foto"
                          className="w-full h-40 object-cover rounded-lg border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={handleQuitarFoto}
                          title="Quitar foto"
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-600 rounded-lg border border-slate-200 shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-white border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-700 font-medium"
                      >
                        <Camera className="w-4 h-4" /> Tomar foto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    {ubicacionEstado === 'cargando' && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Obteniendo ubicación GPS...
                      </span>
                    )}
                    {ubicacionEstado === 'ok' && ubicacion && (
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <MapPin className="w-3.5 h-3.5" />
                        Ubicación registrada ({ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)})
                      </span>
                    )}
                    {ubicacionEstado === 'error' && (
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No se pudo obtener tu ubicación.
                        <button type="button" onClick={obtenerUbicacion} className="underline font-bold cursor-pointer">
                          Reintentar
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingHito(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={guardandoHito}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
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

                    <p className="text-sm text-slate-700 leading-relaxed">{b.nota}</p>

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

                    {b.ubicacion && (
                      <a
                        href={`https://www.google.com/maps?q=${b.ubicacion.lat},${b.ubicacion.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Ver ubicación del registro
                      </a>
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

                  <p className="text-sm text-slate-700">
                    Firmado por: <strong>{currentOT.firma_cliente_nombre}</strong>
                  </p>

                  <Button
                    onClick={() => {
                      generarInformeTecnicoPDF(currentOT);
                      showToast('success', `Informe Técnico PDF de ${currentOT.codigo} descargado.`);
                    }}
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
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
