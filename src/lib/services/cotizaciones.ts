import { Cotizacion } from '@/types/erp';

// ==========================================
// 1. TIPOS DE ENTRADA Y FILTROS
// ==========================================

export type EstadoCotizacion = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA';

export interface FiltrosCotizaciones {
  busqueda?: string;        // Por cliente o código de cotización
  estado?: EstadoCotizacion;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}

export interface RespuestaPaginadaCotizaciones {
  data: Cotizacion[];
  total: number;
  paginaActual: number;
  totalPaginas: number;
}

// Datos necesarios para crear una nueva cotización.
// Omitimos los campos automáticos ('id', 'codigo', 'created_at', 'updated_at')
export type PayloadCotizacion = Omit<Cotizacion, 'id' | 'codigo' | 'created_at' | 'updated_at'>;

// ==========================================
// 2. HELPER DE FORMATO Y MONEDA
// ==========================================

/**
 * Formatea un monto según la moneda ('USD' o 'PEN').
 */
export function formatearMonto(monto: number = 0, moneda: 'USD' | 'PEN' = 'USD'): string {
  const simbolo = moneda === 'USD' ? '$' : 'S/';
  const locale = moneda === 'USD' ? 'en-US' : 'es-PE';
  return `${simbolo} ${monto.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==========================================
// 3. CÁLCULOS MATEMÁTICOS DE COTIZACIÓN
// ==========================================

/**
 * Recalcula Subtotal, IGV y Total General de la cotización
 * basándose exclusivamente en los ítems de detalles (Productos y Servicios).
 */
export function recalcularTotalesCotizacion(
  detalles: Cotizacion['detalles'] = [],
  porcentajeIgv: number = 0.18
) {
  const listaDetalles = detalles || [];
  
  // Suma de todos los ítems (productos y servicios de mano de obra)
  const subtotal = listaDetalles.reduce(
    (acc, item) => acc + (item.subtotal ?? (item.cantidad * item.precio_unitario)), 
    0
  );
  
  const igv = subtotal * porcentajeIgv;
  const total = subtotal + igv;

  return {
    subtotal,
    igv,
    total,
  };
}

// ==========================================
// 4. SERVICIOS CRUD Y API
// ==========================================

/**
 * Obtener listado de cotizaciones filtrado y paginado
 */
export async function listarCotizaciones(filtros?: FiltrosCotizaciones): Promise<RespuestaPaginadaCotizaciones> {
  const params = new URLSearchParams();
  if (filtros?.busqueda) params.append('q', filtros.busqueda);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.fechaInicio) params.append('desde', filtros.fechaInicio);
  if (filtros?.fechaFin) params.append('hasta', filtros.fechaFin);
  if (filtros?.page) params.append('page', filtros.page.toString());
  if (filtros?.limit) params.append('limit', filtros.limit.toString());

  const res = await fetch(`/api/cotizaciones?${params.toString()}`);
  if (!res.ok) throw new Error('Error al listar las cotizaciones.');
  return await res.json();
}

/**
 * Obtener el detalle completo de una cotización por su ID
 */
export async function obtenerCotizacionPorId(id: string): Promise<Cotizacion> {
  const res = await fetch(`/api/cotizaciones/${id}`);
  if (!res.ok) throw new Error(`No se pudo obtener la cotización con ID ${id}`);
  return await res.json();
}

/**
 * Registrar una nueva cotización
 */
export async function crearCotizacion(payload: PayloadCotizacion): Promise<Cotizacion> {
  const res = await fetch('/api/cotizaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Error al registrar la cotización.');
  return await res.json();
}

/**
 * Modificar una cotización existente
 */
export async function actualizarCotizacion(id: string, payload: Partial<PayloadCotizacion>): Promise<Cotizacion> {
  const res = await fetch(`/api/cotizaciones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Error al actualizar la cotización ${id}.`);
  return await res.json();
}

/**
 * Actualizar únicamente el estado de una cotización (Aprobar, Rechazar, Vencer, etc.)
 */
export async function cambiarEstadoCotizacion(id: string, nuevoEstado: EstadoCotizacion): Promise<Cotizacion> {
  const res = await fetch(`/api/cotizaciones/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado }),
  });

  if (!res.ok) throw new Error(`Error al cambiar el estado a ${nuevoEstado}.`);
  return await res.json();
}

/**
 * Eliminar / Anular una cotización
 */
export async function eliminarCotizacion(id: string): Promise<boolean> {
  const res = await fetch(`/api/cotizaciones/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error(`Error al eliminar la cotización ${id}.`);
  return true;
}