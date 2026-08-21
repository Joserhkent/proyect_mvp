export type UserRole = 'ADMIN' | 'TECNICO' | 'CLIENTE';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  telefono?: string;
  avatarUrl?: string;
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
}

export interface Proveedor {
  id: string;
  ruc: string;
  razon_social: string;
  email: string;
  telefono: string;
  contacto: string;
  direccion: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: 'EQUIPO_FERTILIZACION' | 'BOMBAS_INYECTORES' | 'TUBERIAS_VALVULAS' | 'INSUMOS_QUIMICOS' | 'SENSORES_CONTROLADORES';
  precio_venta: number;
  costo_compra: number;
  proveedor_id: string;
  proveedor_nombre?: string;
  stock: number;
  unidad_medida: string; // UNID, KG, MTR, GLN
  imagen_url?: string;
}

export type CotizacionTipoOperacion = 'SOLO_VENTA' | 'VENTA_ARMADO';
export type CotizacionEstado = 'PENDIENTE' | 'APROBADA' | 'EN_COMPRAS' | 'EN_INSTALACION' | 'FACTURADA' | 'RECHAZADA';

export interface CotizacionDetalle {
  id: string;
  cotizacion_id?: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  proveedor_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  numero: string; // ej. COT-2026-001
  cliente_id: string;
  cliente_tipo_doc: TipoDocumento;
  cliente_num_doc: string;
  cliente_razon_social: string;
  cliente_direccion: string;
  cliente_email: string;
  cliente_telefono?: string;
  tipo_operacion: CotizacionTipoOperacion;
  estado: CotizacionEstado;
  subtotal: number;
  igv: number;
  total: number;
  moneda: 'PEN' | 'USD';
  observaciones?: string;
  incluye_mano_obra: boolean;
  costo_mano_obra: number;
  orden_trabajo_id?: string;
  comprobante_id?: string;
  fecha: string;
  detalles: CotizacionDetalle[];
}

export type OrdenCompraEstado = 'BORRADOR' | 'ENVIADO' | 'RECIBIDO';

export interface OrdenCompraDetalle {
  id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface OrdenCompra {
  id: string;
  numero: string; // ej. OC-2026-001
  proveedor_id: string;
  proveedor_ruc: string;
  proveedor_razon_social: string;
  proveedor_email: string;
  cotizacion_id?: string;
  cotizacion_numero?: string;
  fecha: string;
  estado: OrdenCompraEstado;
  monto_total: number;
  moneda: 'PEN' | 'USD';
  factura_proveedor_num?: string;
  fecha_recepcion?: string;
  detalles: OrdenCompraDetalle[];
}

export interface FacturaCompra {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  orden_compra_id: string;
  orden_compra_numero: string;
  numero_factura: string;
  fecha_emision: string;
  monto_total: number;
  moneda: 'PEN' | 'USD';
  estado_pago: 'PENDIENTE' | 'PAGADO';
}

export type ComprobanteSunatTipo = 'FACTURA' | 'BOLETA' | 'GUIA_REMISION';
export type ComprobanteSunatEstado = 'ACEPTADO' | 'ENVIADO' | 'RECHAZADO' | 'ANULADO';

export interface ComprobanteSunat {
  id: string;
  cotizacion_id?: string;
  tipo_comprobante: ComprobanteSunatTipo;
  serie: string; // F001, B001, T001
  numero: string; // 00000123
  cliente_tipo_doc: TipoDocumento;
  cliente_num_doc: string;
  cliente_razon_social: string;
  cliente_direccion: string;
  subtotal: number;
  igv: number;
  total: number;
  moneda: 'PEN' | 'USD';
  xml_url: string;
  cdr_url: string;
  pdf_url: string;
  estado_sunat: ComprobanteSunatEstado;
  hash_cpe: string;
  qr_data: string;
  fecha_emision: string;
  observaciones_sunat?: string;
}

export type OrdenTrabajoEstado = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADO';

export interface BitacoraItem {
  id: string;
  orden_trabajo_id: string;
  hito: string;
  nota: string;
  foto_url?: string;
  materiales_extra?: string;
  fecha_registro: string;
  hora_registro: string;
}

export interface OrdenTrabajo {
  id: string;
  codigo: string; // OT-2026-001
  cotizacion_id: string;
  cotizacion_numero: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  ubicacion_fundo: string;
  tecnico_id: string;
  tecnico_nombre: string;
  fecha_programada: string;
  estado: OrdenTrabajoEstado;
  observaciones?: string;
  firma_cliente_url?: string;
  firma_cliente_nombre?: string;
  fecha_finalizacion?: string;
  informe_pdf_url?: string;
  bitacora: BitacoraItem[];
}
