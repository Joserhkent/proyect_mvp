export type UserRole = 'ADMIN' | 'TECNICO';

export interface Usuario {
  id: string;
  username?: string;
  nombre: string;
  email: string;
  rol: UserRole;
  telefono?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type TipoDocumento = 'RUC' | 'DNI';

export interface ConsultaSunatResult {
  success?: boolean;
  tipo_doc?: TipoDocumento;
  num_doc?: string;
  razon_social?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  origen?: string;
  error?: string;
}

export interface Cliente {
  id: string;
  tipo_doc: TipoDocumento;
  num_doc: string;
  razon_social: string;
  direccion: string;
  email: string;
  telefono?: string;
  estado_contribuyente?: string; // ACTIVO, etc.
  condicion?: string; // HABIDO, etc.
  departamento?: string;
  provincia?: string;
  distrito?: string;
  created_at?: string;
}

export interface Proveedor {
  id: string;
  ruc: string;
  razon_social: string;
  email: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  dias_entrega_estimados?: number;
  costo_flete_base?: number;
  created_at?: string;
}

export type ProductoCategoria =
  | 'EQUIPO_FERTILIZACION'
  | 'BOMBAS_INYECTORES'
  | 'TUBERIAS_VALVULAS'
  | 'INSUMOS_QUIMICOS'
  | 'SENSORES_CONTROLADORES'
  | 'FERTILIZANTE'
  | 'SEMILLA'
  | 'AGROQUIMICO'
  | 'HERRAMIENTA'
  | 'OTRO';

export interface Producto {
  id: string;
  sku: string; // Código único del producto
  nombre: string;
  descripcion?: string;
  categoria: ProductoCategoria;
  unidad_medida: string; // UNIDAD, SACO, GALONERA, etc.
  ultimo_costo_compra: number;
  costo_promedio: number;
  ultimo_precio_venta: number; // Referencia de mercado, no precio fijo
  stock_actual: number;
  stock_reservado: number;
  stock_minimo: number;
  created_at?: string;
}

export type CotizacionProveedorEstado = 'PENDIENTE' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA';

export interface CotizacionProveedor {
  id: string;
  cotizacion_id: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  detalle_id?: string;
  producto_id: string;
  producto_nombre?: string;
  producto_sku?: string;
  cantidad_cotizada: number;
  costo_unitario: number;
  descuento_aplicado?: number;
  fecha_entrega_proveedor?: string;
  dias_entrega: number;
  es_ganadora: boolean;
  estado: CotizacionProveedorEstado;
  fecha_respuesta?: string;
  created_at?: string;
}

export type CotizacionTipoOperacion = 'PRODUCTO' | 'PROYECTO_MESA';
export type CotizacionEstado =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'VENCIDA'
  | 'AJUSTE_REQUERIDO';

export interface CotizacionDetalle {
  id: string;
  cotizacion_id?: string;
  producto_id: string;
  producto_sku?: string;
  producto_nombre?: string;
  oferta_ganadora_id?: string; // Oferta ganadora del proveedor
  cantidad: number;
  precio_unitario: number; // Margen dinámico asignado por el Admin
  descuento_pct?: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  codigo?: string; // ej. COT-2026-001
  cliente_id?: string;
  cliente_num_doc?: string;
  cliente_razon_social?: string;
  cliente_direccion?: string;       // <--- Agregado
  cliente_email?: string;           // <--- Agregado
  cliente_telefono?: string;        // <--- Agregado
  cliente_departamento?: string;    // <--- Agregado
  vendedor_id?: string;
  tipo_operacion: CotizacionTipoOperacion;
  estado: CotizacionEstado;
  moneda: 'PEN' | 'USD';
  subtotal: number;
  igv: number;
  total: number;
  validez_dias: number;
  fecha_emision?: string;
  fecha_expiracion?: string;
  fecha_entrega_estimada?: string; // Calculado del proveedor con entrega más tardía
  dias_entrega_estimados?: number;
  ingreso_manual_fecha?: boolean;
  created_at?: string;
  updated_at?: string;
  detalles?: CotizacionDetalle[];
  ofertas_proveedores?: CotizacionProveedor[];
}

export type OrdenCompraEstado =
  | 'BORRADOR'
  | 'PENDIENTE_PAGO'
  | 'PAGADA'
  | 'ENVIADA'
  | 'CONFIRMADA'
  | 'PARCIAL'
  | 'RECIBIDA'
  | 'CANCELADA';

export type DestinoProducto = 'CLIENTE' | 'STOCK_PROPIO';

export interface OrdenCompraDetalle {
  id: string;
  orden_compra_id?: string;
  producto_id: string;
  producto_sku?: string;
  producto_nombre?: string;
  oferta_proveedor_id?: string;
  cantidad: number;
  costo_unitario: number;
  destino: DestinoProducto;
  subtotal: number;
}

export interface OrdenCompra {
  id: string;
  codigo?: string; // OC-2026-001
  proveedor_id: string;
  proveedor_ruc?: string;
  proveedor_razon_social?: string;
  cotizacion_origen_id?: string;
  estado: OrdenCompraEstado;
  moneda: 'PEN' | 'USD';
  subtotal: number;
  igv: number;
  total: number;
  voucher_url?: string;
  fecha_pago?: string;
  fecha_envio?: string;
  fecha_entrega_estimada?: string;
  created_at?: string;
  updated_at?: string;
  detalles?: OrdenCompraDetalle[];
}

export interface FacturaCompra {
  id: string;
  orden_compra_id?: string;
  proveedor_id: string;
  serie: string;
  numero: string;
  tipo_comprobante: 'SOLO_GUIA' | 'GUIA_Y_FACTURA' | 'FACTURA';
  fecha_emision: string;
  moneda: 'PEN' | 'USD';
  subtotal: number;
  igv: number;
  total: number;
  ocr_url?: string;
  ocr_datos?: Record<string, unknown>;
  estado_conciliacion: 'PENDIENTE' | 'CONCILIADA' | 'DIFERENCIA';
  diferencia_monto?: number;
  created_at?: string;
}

export type ComprobanteSunatTipo = 'FACTURA' | 'BOLETA';
export type ComprobanteSunatEstado = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'OBSERVADO';

export interface ComprobanteSunat {
  id: string;
  tipo_comprobante: ComprobanteSunatTipo;
  serie: string;
  numero: string;
  cliente_id: string;
  cotizacion_id?: string;
  orden_trabajo_id?: string;
  moneda: 'PEN' | 'USD';
  subtotal: number;
  igv: number;
  total: number;
  xml_url?: string;
  cdr_url?: string;
  estado_sunat: ComprobanteSunatEstado;
  created_at?: string;
}

export type OrdenTrabajoEstado = 'CREADA' | 'EN_PROGRESO' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA';
export type EtapaBitacora =
  | 'VISITA_INICIAL'
  | 'DIAGNOSTICO'
  | 'PROPUESTA'
  | 'IMPLEMENTACION'
  | 'SEGUIMIENTO'
  | 'CIERRE';

export interface BitacoraItem {
  id: string;
  orden_trabajo_id: string;
  usuario_id?: string;
  etapa: EtapaBitacora;
  titulo: string;
  descripcion?: string;
  adjuntos?: Record<string, unknown>;
  created_at?: string;
}

export interface OrdenTrabajo {
  id: string;
  codigo?: string; // OT-2026-001
  cliente_id: string;
  cliente_nombre?: string;
  cotizacion_origen_id?: string;
  nombre_proyecto: string;
  descripcion?: string;
  tecnico_asignado?: string;
  tecnico_nombre?: string;
  estado: OrdenTrabajoEstado;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  fecha_fin_real?: string;
  bitacora?: BitacoraItem[];
}