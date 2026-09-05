import { createClient } from '@/lib/supabase/client';
import { CanalEnvioCotizacion } from '@/types/erp';

export interface ItemCotizacionProveedorDTO {
  producto_id: string;
  cantidad: number;
}

export interface CrearCotizacionProveedorDTO {
  proveedor_id: string;
  canal_envio: CanalEnvioCotizacion;
  notas?: string;
  detalles: ItemCotizacionProveedorDTO[];
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

  // Preparamos los registros mapeando exactamente las columnas de la DB
  const registrosAInsertar = payload.detalles.map((item) => ({
    proveedor_id: payload.proveedor_id,
    producto_id: item.producto_id || null,
    cantidad_cotizada: item.cantidad,
    canal_envio: payload.canal_envio,
    notas: payload.notas || null,
    estado: 'ENVIADO',
    es_ganadora: false,
    // Campos vacíos intencionalmente que se actualizarán al recibir respuesta:
    costo_unitario: null,
    descuento_aplicado: null,
    fecha_entrega_proveedor: null,
    dias_entrega: null,
    fecha_respuesta: null,
  }));

  const { data, error } = await (supabase as any)
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

  const { data, error } = await (supabase as any)
    .from('cotizaciones_proveedor')
    .select(`
      *,
      proveedor:proveedores(id, razon_social, ruc, email, telefono),
      producto:productos(id, nombre, sku)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener cotizaciones de proveedores:', error);
    throw new Error('No se pudo cargar el historial de cotizaciones.');
  }

  return data;
}