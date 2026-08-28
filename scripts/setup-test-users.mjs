// Crea usuarios de prueba (Auth + fila en public.usuarios) para poder correr
// las pruebas E2E de Playwright y para pruebas manuales. Usa la service-role
// key. Seguro de re-ejecutar (idempotente por email).
// Uso: node scripts/setup-test-users.mjs

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

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export const TEST_USERS = [
  { email: 'test-admin@agrofertil.pe', password: 'TestAdmin123!', nombre: 'TEST Admin E2E', rol: 'ADMIN' },
  { email: 'test-tecnico@agrofertil.pe', password: 'TestTecnico123!', nombre: 'TEST Tecnico E2E', rol: 'TECNICO' },
];

async function main() {
  for (const u of TEST_USERS) {
    let userId;
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((x) => x.email === u.email);

    if (existing) {
      userId = existing.id;
      console.log(`✓ Auth user ya existe: ${u.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) {
        console.error(`✗ Error creando auth user ${u.email}:`, error.message);
        process.exit(1);
      }
      userId = data.user.id;
      console.log(`✓ Auth user creado: ${u.email}`);
    }

    const { error: upsertError } = await supabase
      .from('usuarios')
      .upsert({ id: userId, nombre: u.nombre, email: u.email, rol: u.rol }, { onConflict: 'id' });
    if (upsertError) {
      console.error(`✗ Error en public.usuarios para ${u.email}:`, upsertError.message);
      process.exit(1);
    }
    console.log(`✓ public.usuarios sincronizado: ${u.email} (${u.rol})`);
  }
}

main();
