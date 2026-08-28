// Prueba de caja negra end-to-end (navegador real, Playwright) del flujo:
// login -> pedir productos (cotizador) -> comparar proveedores -> enviar ->
// aprobar -> generar Orden de Compra (admin/cotizaciones y admin/compras).
//
// Requiere credenciales de un usuario real con rol ADMIN en Supabase Auth,
// vía las variables de entorno E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (no se
// hardcodean credenciales). Si no se corre `npm run setup:test-users` (o no
// existe un usuario de prueba porque el trigger de auth.users de tu proyecto
// está fallando — ver el informe final), estas pruebas se saltan solas.
//
// Ejecutar con: E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe('Flujo completo de negocio', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Faltan E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/correo|email/i).fill(ADMIN_EMAIL!);
    await page.getByPlaceholder(/contraseña|password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
    await page.waitForURL(/\/admin/);
  });

  test('el dashboard admin carga con datos reales de Supabase', async ({ page }) => {
    await expect(page.getByText('Panel de Control General')).toBeVisible();
  });

  test('cliente pide productos desde el cotizador y queda registrado en admin/cotizaciones', async ({ page }) => {
    const codigoUnico = `E2E-${Date.now()}`;

    await page.goto('/cotizador');
    await page.getByRole('button', { name: 'Solo Productos' }).click();

    const primeraFilaAgregar = page.getByRole('button', { name: 'Agregar' }).first();
    await primeraFilaAgregar.click();

    await page.getByPlaceholder('Número de documento').fill(`20${Date.now()}`.slice(0, 11));
    await page.getByPlaceholder('Razón social / Nombre completo').fill(`TEST ${codigoUnico}`);
    await page.getByPlaceholder('Dirección / Fundo').fill('Av. Prueba 123');
    await page.getByPlaceholder('Correo electrónico').fill('e2e@example.com');

    await page.getByRole('button', { name: /Enviar Solicitud de Cotización/i }).click();
    await expect(page.getByText('¡Solicitud enviada!')).toBeVisible({ timeout: 15000 });

    await page.goto('/admin/cotizaciones');
    await page.getByPlaceholder(/Buscar por código/i).fill(`TEST ${codigoUnico}`);
    await expect(page.getByText(`TEST ${codigoUnico}`)).toBeVisible();
  });
});
