// ========================================================
// USUARIOS Y ROLES
// ========================================================
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

// ========================================================
// ENTIDADES EXTERNAS (SUNAT, CLIENTES, PROVEEDORES)
// ========================================================
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
  ruc?: string;
  num_doc?: string;
  razon_social: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  dias_entrega_estimados?: number;
  costo_flete_base?: number;
  created_at?: string;
}

// ========================================================
// PRODUCTOS Y KITS
// ========================================================
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
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria: ProductoCategoria;
  unidad_medida: string;
  ultimo_costo_compra: number;
  costo_promedio: number;
  ultimo_precio_venta: number;
  stock_actual: number;
  stock_reservado: number;
  stock_minimo: number;
  created_at?: string;
}

export interface KitDetalle {
  id: string;
  kit_id: string;
  producto_id: string;
  cantidad: number;
  producto?: Producto;
  created_at?: string;
}

export interface Kit {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  created_at?: string;
  detalles?: KitDetalle[];
}

// ========================================================
// COTIZACIONES Y REQUERIMIENTOS A PROVEEDORES
// ========================================================
export type CotizacionProveedorEstado =
  | 'ENVIADO'
  | 'PENDIENTE'
  | 'RECIBIDA'
  | 'RESPONDIDO'
  | 'ACEPTADA'
  | 'APROBADO'
  | 'RECHAZADA'
  | 'RECHAZADO';

export type CanalEnvioCotizacion = 'WHATSAPP' | 'EMAIL';

export interface ItemRequerimiento {
  id?: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  observacion?: string;
}

export interface CotizacionProveedor {
  id: string;
  cotizacion_id?: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  proveedor?: Proveedor;
  detalle_id?: string;
  producto_id: string;
  producto_nombre?: string;
  producto_sku?: string;
  cantidad_cotizada: number;
  costo_unitario?: number | null;
  descuento_aplicado?: number | null;
  fecha_entrega_proveedor?: string | null;
  dias_entrega?: number | null;
  es_ganadora?: boolean;
  estado: CotizacionProveedorEstado;
  canal_envio?: CanalEnvioCotizacion;
  notas?: string | null;
  fecha_respuesta?: string | null;
  created_at?: string;
}

// ========================================================
// COTIZACIONES CLIENTE
// ========================================================
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
  oferta_ganadora_id?: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct?: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  codigo?: string;
  cliente_id?: string;
  cliente_num_doc?: string;
  cliente_razon_social?: string;
  cliente_direccion?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  cliente_departamento?: string;
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
  fecha_entrega_estimada?: string;
  dias_entrega_estimados?: number;
  ingreso_manual_fecha?: boolean;
  created_at?: string;
  updated_at?: string;
  detalles?: CotizacionDetalle[];
  ofertas_proveedores?: CotizacionProveedor[];
}

// ========================================================
// COMPRAS Y ORDENES
// ========================================================
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
  codigo?: string;
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

// ========================================================
// FACTURACIÓN ELECTRÓNICA SUNAT
// ========================================================
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

// ========================================================
// ORDENES DE TRABAJO Y BITÁCORA
// ========================================================
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
  codigo?: string;
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