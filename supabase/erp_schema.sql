-- ==============================================================================
-- AGROFERTIL ERP / CRM - SCHEMA POSTGRESQL (LIMPIO - EJECUTAR EN SUPABASE SQL EDITOR)
-- Este script DESTRUYE y recrea toda la base. Usar solo en proyecto nuevo.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- LIMPIEZA TOTAL (orden inverso de dependencias)
-- ==============================================================================
DROP TABLE IF EXISTS public.documentos_operacion CASCADE;
DROP TABLE IF EXISTS public.plantillas_mensaje CASCADE;
DROP TABLE IF EXISTS public.movimientos_inventario CASCADE;
DROP TABLE IF EXISTS public.cotizaciones_proveedor CASCADE;
DROP TABLE IF EXISTS public.bitacora_tecnica CASCADE;
DROP TABLE IF EXISTS public.ordenes_trabajo CASCADE;
DROP TABLE IF EXISTS public.comprobantes_sunat CASCADE;
DROP TABLE IF EXISTS public.facturas_compras CASCADE;
DROP TABLE IF EXISTS public.orden_compra_detalles CASCADE;
DROP TABLE IF EXISTS public.ordenes_compra CASCADE;
DROP TABLE IF EXISTS public.cotizacion_detalles CASCADE;
DROP TABLE IF EXISTS public.cotizaciones CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.proveedores CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;


-- ==============================================================================
-- 1. USUARIOS & ROLES
-- ==============================================================================
CREATE TABLE public.usuarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN', 'VENTAS', 'ALMACEN', 'FINANZAS', 'TECNICO', 'CLIENTE')),
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. CLIENTES (con consulta SUNAT/RENIEC)
-- ==============================================================================
CREATE TABLE public.clientes (
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

-- ==============================================================================
-- 3. PROVEEDORES (tiempos de despacho y ubicación)
-- ==============================================================================
CREATE TABLE public.proveedores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ruc TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  contacto TEXT,
  departamento TEXT DEFAULT 'LIMA',
  provincia TEXT DEFAULT 'LIMA',
  direccion TEXT,
  dias_entrega_estimados INT DEFAULT 5,
  costo_flete_base NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. PRODUCTOS (inventario con stock reservado y costos)
-- ==============================================================================
CREATE TABLE public.productos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('FERTILIZANTE', 'SEMILLA', 'AGROQUIMICO', 'HERRAMIENTA', 'OTRO')),
  unidad_medida TEXT NOT NULL DEFAULT 'UNIDAD',
  ultimo_costo_compra NUMERIC(12,2) DEFAULT 0,
  costo_promedio NUMERIC(12,2) DEFAULT 0,
  precio_venta NUMERIC(12,2) DEFAULT 0,
  stock_actual INT DEFAULT 0,
  stock_reservado INT DEFAULT 0,
  stock_minimo INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. COTIZACIONES + DETALLE
-- ==============================================================================
CREATE TABLE public.cotizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  vendedor_id UUID REFERENCES public.usuarios(id),
  tipo_operacion TEXT NOT NULL DEFAULT 'PRODUCTO' CHECK (tipo_operacion IN ('PRODUCTO', 'PROYECTO_MESA')),
  estado TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'AJUSTE_REQUERIDO')),
  moneda TEXT DEFAULT 'PEN',
  subtotal NUMERIC(14,2) DEFAULT 0,
  igv NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  validez_dias INT DEFAULT 15,
  fecha_emision TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  fecha_entrega_estimada DATE,
  dias_entrega_estimados INT DEFAULT 0,
  ingreso_manual_fecha BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.cotizaciones.fecha_entrega_estimada IS 'Fecha límite estimada de entrega consolidada para el cliente final.';
COMMENT ON COLUMN public.cotizaciones.ingreso_manual_fecha IS 'TRUE si el usuario digitó la fecha manualmente; FALSE si la calcula la DB según proveedores.';

CREATE TABLE public.cotizacion_detalles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  cantidad INT NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  descuento_pct NUMERIC(5,2) DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL
);

-- ==============================================================================
-- 6. COTIZACIONES A PROVEEDORES (comparador de costos y tiempos)
-- ==============================================================================
CREATE TABLE public.cotizaciones_proveedor (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
  detalle_id UUID REFERENCES public.cotizacion_detalles(id),
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  cantidad_cotizada INT NOT NULL,
  costo_unitario NUMERIC(12,2) NOT NULL,
  descuento_aplicado NUMERIC(12,2) DEFAULT 0,
  fecha_entrega_proveedor DATE,
  dias_entrega INT DEFAULT 0,
  es_ganadora BOOLEAN DEFAULT FALSE,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'RECIBIDA', 'ACEPTADA', 'RECHAZADA')),
  fecha_respuesta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.cotizaciones_proveedor.fecha_entrega_proveedor IS 'Fecha concreta de entrega indicada en la cotización del proveedor.';

-- ==============================================================================
-- 7. ORDENES DE COMPRA Y FINANZAS (compra al proveedor y voucher)
-- ==============================================================================
CREATE TABLE public.ordenes_compra (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo TEXT UNIQUE,
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
  cotizacion_origen_id UUID REFERENCES public.cotizaciones(id),
  estado TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'PENDIENTE_PAGO', 'PAGADA', 'ENVIADA', 'CONFIRMADA', 'PARCIAL', 'RECIBIDA', 'CANCELADA')),
  moneda TEXT DEFAULT 'PEN',
  subtotal NUMERIC(14,2) DEFAULT 0,
  igv NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  
  -- Campos de Finanzas / Pago:
  voucher_url TEXT,                     -- Foto/PDF del comprobante de pago/transferencia
  fecha_pago TIMESTAMPTZ,
  
  fecha_envio TIMESTAMPTZ,
  fecha_entrega_estimada TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.orden_compra_detalles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_compra_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  cantidad INT NOT NULL,
  costo_unitario NUMERIC(12,2) NOT NULL,
  destino TEXT NOT NULL DEFAULT 'CLIENTE' CHECK (destino IN ('CLIENTE', 'STOCK_PROPIO')),
  subtotal NUMERIC(14,2) NOT NULL
);

-- ==============================================================================
-- 8. FACTURAS DE COMPRA Y RECEPCIÓN PROVEEDOR (OCR + Guías)
-- ==============================================================================
CREATE TABLE public.facturas_compras (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_compra_id UUID REFERENCES public.ordenes_compra(id),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
  serie TEXT NOT NULL,
  numero TEXT NOT NULL,
  tipo_comprobante TEXT DEFAULT 'FACTURA' CHECK (tipo_comprobante IN ('SOLO_GUIA', 'GUIA_Y_FACTURA', 'FACTURA')),
  fecha_emision DATE NOT NULL,
  moneda TEXT DEFAULT 'PEN',
  subtotal NUMERIC(14,2) NOT NULL,
  igv NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  ocr_url TEXT,
  ocr_datos JSONB,
  estado_conciliacion TEXT DEFAULT 'PENDIENTE' CHECK (estado_conciliacion IN ('PENDIENTE', 'CONCILIADA', 'DIFERENCIA')),
  diferencia_monto NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(serie, numero)
);

-- ==============================================================================
-- 9. MOVIMIENTOS DE INVENTARIO Y DESPACHOS CLIENTE (Guía de Remisión GRE SUNAT)
-- ==============================================================================
CREATE TABLE public.movimientos_inventario (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'RESERVA', 'LIBERACION', 'AJUSTE')),
  cantidad INT NOT NULL,
  costo_unitario NUMERIC(12,2),
  referencia_tipo TEXT,
  referencia_id UUID,
  usuario_id UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.despachos_cliente (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id),
  numero_guia_remision TEXT NOT NULL, -- GRE SUNAT
  direccion_llegada TEXT NOT NULL,
  transportista_nombre TEXT,
  transportista_ruc TEXT,
  fecha_despacho TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. COMPROBANTES SUNAT (facturas/boletas de venta al cliente)
-- ==============================================================================
CREATE TABLE public.comprobantes_sunat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('FACTURA', 'BOLETA')),
  serie TEXT NOT NULL,
  numero TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  cotizacion_id UUID REFERENCES public.cotizaciones(id),
  orden_trabajo_id UUID,
  moneda TEXT DEFAULT 'PEN',
  subtotal NUMERIC(14,2) NOT NULL,
  igv NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  cdr_url TEXT,
  xml_url TEXT,
  estado_sunat TEXT DEFAULT 'PENDIENTE' CHECK (estado_sunat IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo_comprobante, serie, numero)
);

-- ==============================================================================
-- 11. ORDENES DE TRABAJO / PROYECTOS MESA
-- ==============================================================================
CREATE TABLE public.ordenes_trabajo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo TEXT UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  cotizacion_origen_id UUID REFERENCES public.cotizaciones(id),
  nombre_proyecto TEXT NOT NULL,
  descripcion TEXT,
  tecnico_asignado UUID REFERENCES public.usuarios(id),
  estado TEXT NOT NULL DEFAULT 'CREADA' CHECK (estado IN ('CREADA', 'EN_PROGRESO', 'PAUSADA', 'COMPLETADA', 'CANCELADA')),
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin_estimada TIMESTAMPTZ,
  fecha_fin_real TIMESTAMPTZ
);

CREATE TABLE public.bitacora_tecnica (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id UUID NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  etapa TEXT NOT NULL CHECK (etapa IN ('VISITA_INICIAL', 'DIAGNOSTICO', 'PROPUESTA', 'IMPLEMENTACION', 'SEGUIMIENTO', 'CIERRE')),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  adjuntos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. DOCUMENTOS DE OPERACION (adjuntos genéricos: OC, facturas, guías, vouchers)
-- ==============================================================================
CREATE TABLE public.documentos_operacion (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('COTIZACION', 'ORDEN_COMPRA', 'FACTURA_COMPRA', 'ORDEN_TRABAJO', 'COMPROBANTE', 'DESPACHO')),
  entidad_id UUID NOT NULL,
  nombre_archivo TEXT NOT NULL,
  url_storage TEXT NOT NULL,
  tipo_mime TEXT,
  subido_por UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. PLANTILLAS DE MENSAJE (WhatsApp / Email)
-- ==============================================================================
CREATE TABLE public.plantillas_mensaje (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  canal TEXT NOT NULL CHECK (canal IN ('WHATSAPP', 'EMAIL', 'SMS')),
  evento TEXT NOT NULL CHECK (evento IN ('COTIZACION_ENVIADA', 'OC_ENVIADA', 'MERCADERIA_EN_CAMINO', 'OT_ACTUALIZADA', 'RECORDATORIO_PAGO')),
  asunto TEXT,
  cuerpo TEXT NOT NULL,
  variables JSONB,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ==============================================================================
-- 14. ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_num_doc ON public.clientes(num_doc);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON public.cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_cot ON public.cotizacion_detalles(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_oc_proveedor ON public.ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_oc_estado ON public.ordenes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_ocd_orden ON public.orden_compra_detalles(orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_facturas_oc ON public.facturas_compras(orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON public.movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created ON public.movimientos_inventario(created_at);
CREATE INDEX IF NOT EXISTS idx_comprobantes_cliente ON public.comprobantes_sunat(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ot_cliente ON public.ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_ot ON public.bitacora_tecnica(orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_prov_quot ON public.cotizaciones_proveedor(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_despachos_cotizacion ON public.despachos_cliente(cotizacion_id);


-- ==============================================================================
-- 15. TRIGGERS: ACTUALIZACIÓN AUTOMÁTICA DE UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cotizaciones_updated ON public.cotizaciones;
CREATE TRIGGER trg_cotizaciones_updated
BEFORE UPDATE ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ordenes_compra_updated ON public.ordenes_compra;
CREATE TRIGGER trg_ordenes_compra_updated
BEFORE UPDATE ON public.ordenes_compra
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==============================================================================
-- 16. FUNCIÓN Y TRIGGER: RESERVA DE STOCK AL APROBAR COTIZACIÓN
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reservar_stock_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'APROBADA' AND OLD.estado <> 'APROBADA' THEN
    UPDATE public.productos p
    SET stock_reservado = stock_reservado + d.cantidad
    FROM public.cotizacion_detalles d
    WHERE d.cotizacion_id = NEW.id AND p.id = d.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservar_stock ON public.cotizaciones;
CREATE TRIGGER trg_reservar_stock
AFTER UPDATE OF estado ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION public.reservar_stock_cotizacion();


-- ==============================================================================
-- 17. FUNCIÓN Y TRIGGER: CÁLCULO DE FECHA Y DÍAS DE ENTREGA ESTIMADOS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.actualizar_entrega_estimada_cotizacion()
RETURNS TRIGGER AS $$
DECLARE
  v_cotizacion_id UUID;
  v_max_fecha DATE;
  v_max_dias INT;
BEGIN
  v_cotizacion_id := COALESCE(NEW.cotizacion_id, OLD.cotizacion_id);

  -- 1. Obtiene la fecha más tardía y el máximo de días entre las cotizaciones ganadoras de proveedores
  SELECT 
    MAX(fecha_entrega_proveedor),
    MAX(dias_entrega)
  INTO 
    v_max_fecha,
    v_max_dias
  FROM public.cotizaciones_proveedor
  WHERE cotizacion_id = v_cotizacion_id
    AND es_ganadora = TRUE;

  -- 2. Actualiza la cabecera únicamente si la cotización no tiene bloqueada la fecha manual
  UPDATE public.cotizaciones
  SET 
    fecha_entrega_estimada = CASE 
      WHEN ingreso_manual_fecha = FALSE OR fecha_entrega_estimada IS NULL THEN v_max_fecha 
      ELSE fecha_entrega_estimada 
    END,
    dias_entrega_estimados = CASE 
      WHEN ingreso_manual_fecha = FALSE OR dias_entrega_estimados IS NULL OR dias_entrega_estimados = 0 THEN COALESCE(v_max_dias, 0)
      ELSE dias_entrega_estimados 
    END
  WHERE id = v_cotizacion_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_entrega_cotizacion ON public.cotizaciones_proveedor;
CREATE TRIGGER trg_actualizar_entrega_cotizacion
AFTER INSERT OR UPDATE OF es_ganadora, fecha_entrega_proveedor, dias_entrega OR DELETE 
ON public.cotizaciones_proveedor
FOR EACH ROW 
EXECUTE FUNCTION public.actualizar_entrega_estimada_cotizacion();


-- ==============================================================================
-- 18. SEGURIDAD A NIVEL DE FILAS (RLS - SUPABASE)
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_compra_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_sunat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_operacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_mensaje ENABLE ROW LEVEL SECURITY;

-- Aplicación dinámica de Políticas de Acceso para usuarios Autenticados
-- ==============================================================================
-- 18. SEGURIDAD A NIVEL DE FILAS (RLS - SUPABASE)
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_compra_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_sunat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_operacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_mensaje ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso directo (sin bucles PL/pgSQL)
DROP POLICY IF EXISTS "auth_all_clientes" ON public.clientes;
CREATE POLICY "auth_all_clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_proveedores" ON public.proveedores;
CREATE POLICY "auth_all_proveedores" ON public.proveedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_productos" ON public.productos;
CREATE POLICY "auth_all_productos" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_cotizaciones" ON public.cotizaciones;
CREATE POLICY "auth_all_cotizaciones" ON public.cotizaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_cotizacion_detalles" ON public.cotizacion_detalles;
CREATE POLICY "auth_all_cotizacion_detalles" ON public.cotizacion_detalles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_cotizaciones_proveedor" ON public.cotizaciones_proveedor;
CREATE POLICY "auth_all_cotizaciones_proveedor" ON public.cotizaciones_proveedor FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_ordenes_compra" ON public.ordenes_compra;
CREATE POLICY "auth_all_ordenes_compra" ON public.ordenes_compra FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_orden_compra_detalles" ON public.orden_compra_detalles;
CREATE POLICY "auth_all_orden_compra_detalles" ON public.orden_compra_detalles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_facturas_compras" ON public.facturas_compras;
CREATE POLICY "auth_all_facturas_compras" ON public.facturas_compras FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "auth_all_movimientos_inventario" ON public.movimientos_inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_despachos_cliente" ON public.despachos_cliente;
CREATE POLICY "auth_all_despachos_cliente" ON public.despachos_cliente FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_comprobantes_sunat" ON public.comprobantes_sunat;
CREATE POLICY "auth_all_comprobantes_sunat" ON public.comprobantes_sunat FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_ordenes_trabajo" ON public.ordenes_trabajo;
CREATE POLICY "auth_all_ordenes_trabajo" ON public.ordenes_trabajo FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_bitacora_tecnica" ON public.bitacora_tecnica;
CREATE POLICY "auth_all_bitacora_tecnica" ON public.bitacora_tecnica FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_documentos_operacion" ON public.documentos_operacion;
CREATE POLICY "auth_all_documentos_operacion" ON public.documentos_operacion FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_plantillas_mensaje" ON public.plantillas_mensaje;
CREATE POLICY "auth_all_plantillas_mensaje" ON public.plantillas_mensaje FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
CREATE POLICY "usuarios_self_read" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
CREATE POLICY "usuarios_self_read" ON public.usuarios
FOR SELECT TO authenticated USING (id = auth.uid());


-- ==============================================================================
-- 19. SEED: DATOS SEMILLA E INICIALES DE PRUEBA
-- ==============================================================================
INSERT INTO public.usuarios (nombre, email, rol) VALUES
  ('Admin General', 'admin@agrofertil.pe', 'ADMIN'),
  ('Vendedor Uno', 'ventas@agrofertil.pe', 'VENTAS'),
  ('Tecnico Campo', 'tecnico@agrofertil.pe', 'TECNICO')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.proveedores (ruc, razon_social, email, telefono, dias_entrega_estimados, costo_flete_base) VALUES
  ('20100047218', 'Agroinsumos Andinos SAC', 'ventas@agroandinos.pe', '014567890', 3, 150.00),
  ('20487654321', 'Fertilizantes del Sur SA', 'contacto@fsur.pe', '0198765432', 5, 220.50),
  ('20512345678', 'Semillas Huascaran EIRL', 'info@huascaran.pe', '013344556', 7, 180.00)
ON CONFLICT (ruc) DO NOTHING;

INSERT INTO public.productos (sku, nombre, categoria, unidad_medida, ultimo_costo_compra, precio_venta, stock_actual, stock_minimo) VALUES
  ('FER-UREA-50K', 'Urea Granulada Saco 50kg', 'FERTILIZANTE', 'SACO', 120.00, 155.00, 200, 20),
  ('FER-NPK-25K', 'NPK 15-15-15 Saco 25kg', 'FERTILIZANTE', 'SACO', 95.50, 128.00, 150, 15),
  ('SEM-MZ-HB', 'Maíz Hibrido HB (bolsa 1ha)', 'SEMILLA', 'BOLSA', 380.00, 465.00, 80, 10),
  ('AGR-GLI-20L', 'Glifosato 62% SL 20L', 'AGROQUIMICO', 'GALONERA', 210.00, 275.00, 60, 10)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.clientes (tipo_doc, num_doc, razon_social, direccion, email, telefono, departamento, provincia) VALUES
  ('RUC', '10456789012', 'Agropecuaria El Valle SAC', 'Av. Panamericana Sur Km 45', 'elvalle@correo.pe', '956781234', 'ICA', 'ICA'),
  ('DNI', '45678901', 'Juan Perez Quispe', 'Jr. Los Olivos 123', 'jperez@correo.pe', '987654321', 'LIMA', 'LIMA')
ON CONFLICT (num_doc) DO NOTHING;

INSERT INTO public.plantillas_mensaje (canal, evento, asunto, cuerpo) VALUES
  ('EMAIL', 'COTIZACION_ENVIADA', 'Su cotización {{codigo}} está lista',
   'Estimado {{cliente}}, adjuntamos la cotización {{codigo}} por un total de {{total}}. Válida {{validez_dias}} días.'),
  ('WHATSAPP', 'MERCADERIA_EN_CAMINO', NULL,
   'Hola {{cliente}}, su pedido {{oc}} salió del almacén. Entrega estimada: {{fecha}}.');