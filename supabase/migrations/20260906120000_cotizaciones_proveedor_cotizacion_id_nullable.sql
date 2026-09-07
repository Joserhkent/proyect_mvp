-- La pantalla "Cotizador > Proveedor" crea solicitudes de cotización a un
-- proveedor de forma libre (RFQ), sin depender de una cotización de cliente
-- ya creada. La columna cotizacion_id era NOT NULL, lo que hacía fallar todo
-- insert desde ese flujo. La dejamos nullable para permitir solicitudes
-- independientes; sigue existiendo la FK para cuando sí venga de una
-- cotización de cliente.
ALTER TABLE public.cotizaciones_proveedor
  ALTER COLUMN cotizacion_id DROP NOT NULL;
