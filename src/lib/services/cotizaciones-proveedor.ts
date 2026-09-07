import { createClient } from '@/lib/supabase/client';
import { CanalEnvioCotizacion } from '@/types/erp';
import type { Database } from '@/types/supabase';

type CotizacionProveedorInsert = Database['public']['Tables']['cotizaciones_proveedor']['Insert'];

export interface ItemCotizacionProveedorDTO {
  producto_id: string;
  cantidad: number;
}

export interface CrearCotizacionProveedorDTO {
  proveedor_id: string;
  canal_envio: CanalEnvioCotizacion;
  notas?: string;
  detalles: ItemCotizacionProveedorDTO[];
  /** Cotización de cliente de origen (si esta RFQ nace de una cotización ya creada). */
  cotizacion_id?: string;
}

/**
 * Registra una solicitud de cotización para un proveedor en la base de datos.
 * Inserta una fila por cada ítem solicitado dejando listos los campos que
 * rellenará el proveedor posteriormente (costo_unitario, dias_entrega, etc.).
 */
export async function guardarCotizacionProveedor(payload: CrearCotizacionProveedorDTO) {
  const supabase = createClient();

  if (!payload.detalles || payload.detalles.length === 0) {
    throw new Error('Debe incluir al menos un producto en la solicitud.');
  }

  // Preparamos los registros mapeando exactamente las columnas de la DB.
  // `cotizacion_id` queda null cuando es una solicitud libre a proveedor
  // (no depende de una cotización de cliente ya creada).
  const registrosAInsertar: CotizacionProveedorInsert[] = payload.detalles.map((item) => ({
    proveedor_id: payload.proveedor_id,
    producto_id: item.producto_id,
    cantidad_cotizada: item.cantidad,
    canal_envio: payload.canal_envio,
    notas: payload.notas || null,
    cotizacion_id: payload.cotizacion_id || null,
    // La BD solo acepta PENDIENTE | RECIBIDA | ACEPTADA | RECHAZADA (CHECK constraint).
    estado: 'PENDIENTE',
    es_ganadora: false,
    // Placeholder hasta que el proveedor responda (la columna es NOT NULL en la BD):
    costo_unitario: 0,
    descuento_aplicado: 0,
    fecha_entrega_proveedor: null,
    dias_entrega: null,
    fecha_respuesta: null,
  }));

  const { data, error } = await supabase
    .from('cotizaciones_proveedor')
    .insert(registrosAInsertar)
    .select();

  if (error) {
    console.error('Error al guardar en cotizaciones_proveedor:', error);
    throw new Error('No se pudo guardar la solicitud en la base de datos.');
  }

  return data;
}

/**
 * Obtiene el listado completo de cotizaciones de proveedores para la pantalla de monitoreo.
 */
export async function obtenerCotizacionesProveedores() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cotizaciones_proveedor')
    .select(`
      *,
      proveedor:proveedores(id, razon_social, ruc, email, telefono),
      producto:productos(id, nombre, sku),
      cotizacion:cotizaciones(id, codigo)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener cotizaciones de proveedores:', error);
    throw new Error('No se pudo cargar el historial de cotizaciones.');
  }

  return data;
}

/**
 * Trae, por producto, la oferta de proveedor ganadora registrada para una
 * cotización de cliente específica. Se usa al armar/editar esa cotización
 * para reutilizar el costo ya negociado en vez del costo de catálogo.
 */
export async function obtenerOfertasGanadorasPorCotizacion(cotizacionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cotizaciones_proveedor')
    .select('producto_id, costo_unitario, proveedor_id, proveedor:proveedores(razon_social)')
    .eq('cotizacion_id', cotizacionId)
    .eq('es_ganadora', true);

  if (error) {
    console.error('Error al obtener ofertas ganadoras:', error);
    return {} as Record<string, { costo_unitario: number; proveedor_id: string; proveedor_nombre?: string }>;
  }

  const porProducto: Record<string, { costo_unitario: number; proveedor_id: string; proveedor_nombre?: string }> = {};
  (data || []).forEach((oferta) => {
    porProducto[oferta.producto_id] = {
      costo_unitario: Number(oferta.costo_unitario ?? 0),
      proveedor_id: oferta.proveedor_id,
      proveedor_nombre: oferta.proveedor?.razon_social,
    };
  });

  return porProducto;
}