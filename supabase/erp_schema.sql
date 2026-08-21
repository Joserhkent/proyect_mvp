-- ==============================================================================
-- AGROFERTIL ERP / CRM - SCHEMA POSTGRESQL (SUNAT, COMPRAS Y MÓDULO TÉCNICO)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USUARIOS & ROLES
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN', 'TECNICO', 'CLIENTE')),
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTES (Con consulta SUNAT/RENIEC)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo_doc TEXT NOT NULL CHECK (tipo_doc IN ('RUC', 'DNI')),
  num_doc TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  direccion TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  estado_contribuyente TEXT DEFAULT 'ACTIVO',
  condicion TEXT DEFAULT 'HABIDO',
  departamento TEXT,
  provincia TEXT,
  distrito TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROVEEDORES
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ruc TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  contacto TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTOS & COMPONENTES AGRÍCOLAS
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  stock INT NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL DEFAULT 'UNID',
  imagen_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COTIZACIONES
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE, -- ej. COT-2026-001
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
  tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN ('SOLO_VENTA', 'VENTA_ARMADO')),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'EN_COMPRAS', 'EN_INSTALACION', 'FACTURADA', 'RECHAZADA')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  incluye_mano_obra BOOLEAN DEFAULT FALSE,
  costo_mano_obra NUMERIC(12,2) DEFAULT 0,
  observaciones TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COTIZACION_DETALLES
CREATE TABLE IF NOT EXISTS public.cotizacion_detalles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE RESTRICT NOT NULL,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL,
  costo_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- 8. ORDENES DE COMPRA (Generadas automáticamente por proveedor)
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE, -- ej. OC-2026-001
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE RESTRICT NOT NULL,
  cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'ENVIADO', 'RECIBIDO')),
  monto_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  factura_proveedor_num TEXT,
  fecha_recepcion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ORDEN_COMPRA_DETALLES
CREATE TABLE IF NOT EXISTS public.orden_compra_detalles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_compra_id UUID REFERENCES public.ordenes_compra(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE RESTRICT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- 10. FACTURAS DE COMPRAS (Cuentas por Pagar de Proveedores)
CREATE TABLE IF NOT EXISTS public.facturas_compras (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE RESTRICT NOT NULL,
  orden_compra_id UUID REFERENCES public.ordenes_compra(id) ON DELETE SET NULL,
  numero_factura TEXT NOT NULL,
  fecha_emision DATE DEFAULT CURRENT_DATE,
  monto_total NUMERIC(12,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  estado_pago TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_pago IN ('PENDIENTE', 'PAGADO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. COMPROBANTES ELECTRONICOS SUNAT (Facturas, Boletas, GRE)
CREATE TABLE IF NOT EXISTS public.comprobantes_sunat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
  tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('FACTURA', 'BOLETA', 'GUIA_REMISION')),
  serie TEXT NOT NULL, -- F001, B001, T001
  numero TEXT NOT NULL, -- 00000123
  cliente_tipo_doc TEXT NOT NULL,
  cliente_num_doc TEXT NOT NULL,
  cliente_razon_social TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  igv NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  xml_url TEXT,
  cdr_url TEXT,
  pdf_url TEXT,
  estado_sunat TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (estado_sunat IN ('ACEPTADO', 'ENVIADO', 'RECHAZADO', 'ANULADO')),
  hash_cpe TEXT,
  qr_data TEXT,
  observaciones_sunat TEXT,
  fecha_emision DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ORDENES DE TRABAJO (Módulo Técnico para Instalación de Mesas)
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE, -- OT-2026-001
  cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE RESTRICT NOT NULL,
  tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ubicacion_fundo TEXT NOT NULL,
  fecha_programada DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'FINALIZADO')),
  observaciones TEXT,
  firma_cliente_url TEXT,
  firma_cliente_nombre TEXT,
  fecha_finalizacion TIMESTAMPTZ,
  informe_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BITACORA TECNICA (Hitos, fotos de avance y materiales)
CREATE TABLE IF NOT EXISTS public.bitacora_tecnica (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id UUID REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE NOT NULL,
  hito TEXT NOT NULL,
  nota TEXT NOT NULL,
  foto_url TEXT,
  materiales_extra TEXT,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  hora_registro TEXT DEFAULT TO_CHAR(NOW(), 'HH12:MI AM'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_num_doc ON public.clientes(num_doc);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_prov ON public.ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_serie_num ON public.comprobantes_sunat(serie, numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_tecnico ON public.ordenes_trabajo(tecnico_id);
