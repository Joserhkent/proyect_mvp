-- ==============================================================================
-- PARCHE 001: Generación atómica de códigos (COT-/OC-/OT-)
-- Reemplaza los contadores basados en Date.now()/longitud de array del front
-- (colisionan bajo concurrencia) por secuencias de Postgres + trigger.
-- Aditivo, no destructivo. Seguro de re-ejecutar (idempotente).
-- ==============================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_cotizaciones_codigo START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ordenes_compra_codigo START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ordenes_trabajo_codigo START 1;

CREATE OR REPLACE FUNCTION public.set_codigo_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'COT-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('public.seq_cotizaciones_codigo')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_codigo_cotizacion ON public.cotizaciones;
CREATE TRIGGER trg_set_codigo_cotizacion
BEFORE INSERT ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_cotizacion();

CREATE OR REPLACE FUNCTION public.set_codigo_orden_compra()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'OC-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('public.seq_ordenes_compra_codigo')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_codigo_orden_compra ON public.ordenes_compra;
CREATE TRIGGER trg_set_codigo_orden_compra
BEFORE INSERT ON public.ordenes_compra
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_orden_compra();

CREATE OR REPLACE FUNCTION public.set_codigo_orden_trabajo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'OT-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('public.seq_ordenes_trabajo_codigo')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_codigo_orden_trabajo ON public.ordenes_trabajo;
CREATE TRIGGER trg_set_codigo_orden_trabajo
BEFORE INSERT ON public.ordenes_trabajo
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_orden_trabajo();
