-- ==============================================================================
-- PARCHE 003: Políticas RLS para los buckets de Storage 'vouchers' y 'documentos'
-- Los buckets en sí se crean con scripts/setup-storage.mjs (requiere la
-- service-role key). Este parche solo habilita que usuarios autenticados
-- puedan subir/leer/actualizar archivos dentro de esos dos buckets.
-- Aditivo, no destructivo. Seguro de re-ejecutar (idempotente).
-- ==============================================================================

DROP POLICY IF EXISTS "auth_select_vouchers" ON storage.objects;
CREATE POLICY "auth_select_vouchers" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'vouchers');

DROP POLICY IF EXISTS "auth_insert_vouchers" ON storage.objects;
CREATE POLICY "auth_insert_vouchers" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vouchers');

DROP POLICY IF EXISTS "auth_update_vouchers" ON storage.objects;
CREATE POLICY "auth_update_vouchers" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'vouchers') WITH CHECK (bucket_id = 'vouchers');

DROP POLICY IF EXISTS "auth_select_documentos" ON storage.objects;
CREATE POLICY "auth_select_documentos" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "auth_insert_documentos" ON storage.objects;
CREATE POLICY "auth_insert_documentos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "auth_update_documentos" ON storage.objects;
CREATE POLICY "auth_update_documentos" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
