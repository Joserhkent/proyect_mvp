// Crea (de forma idempotente) los buckets de Storage que usa el flujo de negocio:
//   - vouchers: comprobantes de pago/transferencia subidos al pagar una Orden de Compra
//   - documentos: firmas de técnico, informes y otros adjuntos de operación
// Requiere SUPABASE_SERVICE_ROLE_KEY (server-only) en .env.local.
// Uso: npm run setup:storage

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = [
  { id: 'vouchers', public: false, fileSizeLimit: 10 * 1024 * 1024 },
  { id: 'documentos', public: false, fileSizeLimit: 15 * 1024 * 1024 },
];

async function main() {
  const { data: existentes, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('No se pudo listar buckets existentes:', listError.message);
    process.exit(1);
  }

  const nombresExistentes = new Set((existentes ?? []).map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (nombresExistentes.has(bucket.id)) {
      console.log(`✓ Bucket "${bucket.id}" ya existe, se omite.`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
    });
    if (error) {
      console.error(`✗ Error creando bucket "${bucket.id}":`, error.message);
      process.exit(1);
    }
    console.log(`✓ Bucket "${bucket.id}" creado.`);
  }

  console.log('\nListo. Ahora aplica supabase/patches/003_storage_policies.sql en el SQL Editor de Supabase para habilitar el acceso desde la app.');
}

main();
