# Migraciones de base de datos

Esta carpeta es la **única fuente de verdad** para cambios al esquema de la base de datos real. `supabase/erp_schema.sql` es solo una fotografía de referencia (documentación) — **nunca se vuelve a ejecutar contra el proyecto real**, porque empieza con `DROP TABLE ... CASCADE` y borraría todos los datos.

## Por qué esto importa

Antes de este cambio, `erp_schema.sql` y la base de datos real se desincronizaron sin que nadie lo notara, y eso causó un bug real (un técnico no aparecía en el sistema porque la política de seguridad de la base real seguía siendo la versión vieja, aunque el archivo ya mostraba la versión nueva). Las migraciones incrementales evitan que esto se repita: cada cambio queda registrado, ordenado y es el único camino para modificar la base real.

## Cómo agregar un cambio nuevo

1. Crea un archivo nuevo aquí con el formato `YYYYMMDDHHMMSS_descripcion_corta.sql` (la fecha/hora sirve para ordenarlos cronológicamente).
2. Escribe solo el cambio incremental (`ALTER TABLE`, `CREATE POLICY`, `CREATE FUNCTION`, etc.) — nunca un `DROP TABLE` de algo que ya tiene datos en producción.
3. Aplica ese archivo a la base real:
   - **Hoy (sin CLI vinculado):** copia el contenido y ejecútalo en el **SQL Editor del dashboard de Supabase**.
   - **Si en algún momento se configura `supabase login`:** `supabase db push` aplica automáticamente los archivos nuevos de esta carpeta.
4. Actualiza `supabase/erp_schema.sql` para que refleje el mismo cambio (mantiene la fotografía de referencia honesta, útil para levantar un proyecto nuevo desde cero).

## Vincular el CLI (opcional, para automatizar el paso 3)

Ejecuta `supabase login` en una terminal (abre el navegador para autenticarte) y luego `supabase link --project-ref lepytozvzazjesxwrzrk`. Una vez vinculado, `supabase db push` aplica las migraciones pendientes sin tener que copiar/pegar SQL manualmente.
