-- Endurece el control de acceso a nivel de base de datos: hasta ahora
-- cualquier usuario autenticado (incluido un técnico) podía leer y escribir
-- TODAS las tablas vía la API de Supabase, sin importar su rol — el control
-- de acceso solo existía a nivel de rutas (proxy.ts), no a nivel de datos.
--
-- Esta migración introduce:
--   1. Una función is_admin() para no repetir la subconsulta en cada policy.
--   2. Tablas exclusivas de administración (back-office: cotizaciones, compras,
--      productos, proveedores, facturación SUNAT) — un técnico ya no puede
--      leerlas ni escribirlas, sin importar si llama a la API directamente.
--   3. Tablas de uso mixto (usuarios, clientes, ordenes_trabajo,
--      bitacora_tecnica) — el técnico solo ve/edita lo que le corresponde:
--      su propio usuario, los clientes de sus órdenes asignadas, sus propias
--      órdenes de trabajo, y la bitácora de esas órdenes.
--
-- Nota: cuando ninguna policy permisiva aplica para un rol/tabla, Postgres
-- no lanza error — simplemente devuelve 0 filas. Por eso el front-end
-- (AgroErpContext) no necesita ningún cambio: para un técnico, las tablas
-- de solo-admin ya llegan vacías de forma transparente.

-- ==============================================================================
-- 1. Función auxiliar
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'ADMIN'
  );
$$;

-- ==============================================================================
-- 2. Tablas exclusivas de administración (back-office)
-- ==============================================================================
DROP POLICY IF EXISTS "auth_all_proveedores" ON public.proveedores;
CREATE POLICY "admin_all_proveedores" ON public.proveedores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_productos" ON public.productos;
CREATE POLICY "admin_all_productos" ON public.productos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_cotizaciones" ON public.cotizaciones;
CREATE POLICY "admin_all_cotizaciones" ON public.cotizaciones FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_cotizacion_detalles" ON public.cotizacion_detalles;
CREATE POLICY "admin_all_cotizacion_detalles" ON public.cotizacion_detalles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_cotizaciones_proveedor" ON public.cotizaciones_proveedor;
CREATE POLICY "admin_all_cotizaciones_proveedor" ON public.cotizaciones_proveedor FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_ordenes_compra" ON public.ordenes_compra;
CREATE POLICY "admin_all_ordenes_compra" ON public.ordenes_compra FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_orden_compra_detalles" ON public.orden_compra_detalles;
CREATE POLICY "admin_all_orden_compra_detalles" ON public.orden_compra_detalles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_facturas_compras" ON public.facturas_compras;
CREATE POLICY "admin_all_facturas_compras" ON public.facturas_compras FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "admin_all_movimientos_inventario" ON public.movimientos_inventario FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_despachos_cliente" ON public.despachos_cliente;
CREATE POLICY "admin_all_despachos_cliente" ON public.despachos_cliente FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_comprobantes_sunat" ON public.comprobantes_sunat;
CREATE POLICY "admin_all_comprobantes_sunat" ON public.comprobantes_sunat FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_documentos_operacion" ON public.documentos_operacion;
CREATE POLICY "admin_all_documentos_operacion" ON public.documentos_operacion FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_all_plantillas_mensaje" ON public.plantillas_mensaje;
CREATE POLICY "admin_all_plantillas_mensaje" ON public.plantillas_mensaje FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- 3. usuarios: admin ve todos, cada quien ve (y actualiza) solo su propia fila
-- ==============================================================================
DROP POLICY IF EXISTS "usuarios_read_all" ON public.usuarios;
CREATE POLICY "admin_read_all_usuarios" ON public.usuarios FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "usuarios_self_read" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid());
-- usuarios_self_update ya existía y sigue vigente (id = auth.uid()).

-- ==============================================================================
-- 4. clientes: admin ve todos; un técnico solo ve los clientes de SUS órdenes
-- ==============================================================================
DROP POLICY IF EXISTS "auth_all_clientes" ON public.clientes;
CREATE POLICY "admin_all_clientes" ON public.clientes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "tecnico_clientes_de_sus_ordenes" ON public.clientes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ordenes_trabajo ot
    WHERE ot.cliente_id = clientes.id AND ot.tecnico_asignado = auth.uid()
  )
);

-- ==============================================================================
-- 5. ordenes_trabajo: admin ve/edita todas; el técnico solo ve/edita las suyas
-- ==============================================================================
DROP POLICY IF EXISTS "auth_all_ordenes_trabajo" ON public.ordenes_trabajo;
CREATE POLICY "admin_all_ordenes_trabajo" ON public.ordenes_trabajo FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "tecnico_select_sus_ordenes" ON public.ordenes_trabajo FOR SELECT TO authenticated USING (tecnico_asignado = auth.uid());
CREATE POLICY "tecnico_update_sus_ordenes" ON public.ordenes_trabajo FOR UPDATE TO authenticated USING (tecnico_asignado = auth.uid()) WITH CHECK (tecnico_asignado = auth.uid());

-- ==============================================================================
-- 6. bitacora_tecnica: admin ve/edita todo; el técnico ve/agrega solo en SUS OT
-- ==============================================================================
DROP POLICY IF EXISTS "auth_all_bitacora_tecnica" ON public.bitacora_tecnica;
CREATE POLICY "admin_all_bitacora_tecnica" ON public.bitacora_tecnica FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "tecnico_select_bitacora_sus_ordenes" ON public.bitacora_tecnica FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ordenes_trabajo ot
    WHERE ot.id = bitacora_tecnica.orden_trabajo_id AND ot.tecnico_asignado = auth.uid()
  )
);
CREATE POLICY "tecnico_insert_bitacora_sus_ordenes" ON public.bitacora_tecnica FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ordenes_trabajo ot
    WHERE ot.id = bitacora_tecnica.orden_trabajo_id AND ot.tecnico_asignado = auth.uid()
  )
);
