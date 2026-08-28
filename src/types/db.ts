import { Database } from './supabase';

type Tables = Database['public']['Tables'];
export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type InsertRow<T extends keyof Tables> = Tables[T]['Insert'];
export type UpdateRow<T extends keyof Tables> = Tables[T]['Update'];

// El generador de tipos de Supabase no expone los CHECK constraints como
// uniones literales (ver supabase/erp_schema.sql) — se declaran a mano aquí
// para tener autocompletado/seguridad de tipos real en el código de la app.

export type UsuarioRol = 'ADMIN' | 'VENTAS' | 'ALMACEN' | 'FINANZAS' | 'TECNICO' | 'CLIENTE';
export type TipoDoc = 'RUC' | 'DNI';

export type ProductoCategoria = 'FERTILIZANTE' | 'SEMILLA' | 'AGROQUIMICO' | 'HERRAMIENTA' | 'OTRO';

export type CotizacionTipoOperacion = 'PRODUCTO' | 'PROYECTO_MESA';
export type CotizacionEstado =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'AJUSTE_REQUERIDO';

export type CotizacionProveedorEstado = 'PENDIENTE' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA';

export type OrdenCompraEstado =
  | 'BORRADOR'
  | 'PENDIENTE_PAGO'
  | 'PAGADA'
  | 'ENVIADA'
  | 'CONFIRMADA'
  | 'PARCIAL'
  | 'RECIBIDA'
  | 'CANCELADA';

export type OrdenCompraDetalleDestino = 'CLIENTE' | 'STOCK_PROPIO';

export type FacturaCompraTipoComprobante = 'SOLO_GUIA' | 'GUIA_Y_FACTURA' | 'FACTURA';
export type FacturaCompraEstadoConciliacion = 'PENDIENTE' | 'CONCILIADA' | 'DIFERENCIA';

export type MovimientoInventarioTipo = 'ENTRADA' | 'SALIDA' | 'RESERVA' | 'LIBERACION' | 'AJUSTE';

export type ComprobanteSunatTipo = 'FACTURA' | 'BOLETA';
export type ComprobanteSunatEstado = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'OBSERVADO';

export type OrdenTrabajoEstado = 'CREADA' | 'EN_PROGRESO' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA';
export type BitacoraEtapa =
  | 'VISITA_INICIAL'
  | 'DIAGNOSTICO'
  | 'PROPUESTA'
  | 'IMPLEMENTACION'
  | 'SEGUIMIENTO'
  | 'CIERRE';

export type Cliente = Row<'clientes'>;
export type Proveedor = Row<'proveedores'>;
export type Producto = Row<'productos'>;
export type Usuario = Row<'usuarios'>;
export type Cotizacion = Row<'cotizaciones'>;
export type CotizacionDetalle = Row<'cotizacion_detalles'>;
export type CotizacionProveedor = Row<'cotizaciones_proveedor'>;
export type OrdenCompra = Row<'ordenes_compra'>;
export type OrdenCompraDetalle = Row<'orden_compra_detalles'>;
export type FacturaCompra = Row<'facturas_compras'>;
export type MovimientoInventario = Row<'movimientos_inventario'>;
export type DespachoCliente = Row<'despachos_cliente'>;
export type ComprobanteSunat = Row<'comprobantes_sunat'>;
export type OrdenTrabajo = Row<'ordenes_trabajo'>;
export type BitacoraTecnica = Row<'bitacora_tecnica'>;
