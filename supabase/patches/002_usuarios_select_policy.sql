-- ==============================================================================
-- PARCHE 002: Ampliar lectura de usuarios a cualquier autenticado
-- La política original ("usuarios_self_read") solo permite ver la propia fila,
-- lo que rompe cualquier selector de técnico/vendedor en el admin. La
-- autorización real (quién puede hacer qué) se resuelve en código de
-- aplicación, siguiendo el mismo patrón usado en el resto de tablas.
-- Aditivo, no destructivo. Seguro de re-ejecutar (idempotente).
-- ==============================================================================

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
DROP POLICY IF EXISTS "auth_select_usuarios" ON public.usuarios;
CREATE POLICY "auth_select_usuarios" ON public.usuarios
FOR SELECT TO authenticated USING (true);
