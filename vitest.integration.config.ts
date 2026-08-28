import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Config separada para pruebas de integración que pegan contra la Supabase
// real (npm run test:integration) — no corren con `npm test` (unitarias).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/**/*.integration.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
