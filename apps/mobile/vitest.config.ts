import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Meme alias que le tsconfig : les tests importent "@/lib/..." comme l'app.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // Resout @padelteammates/shared sur ses sources TS (pas besoin de le builder).
    conditions: ['@padelteammates/source'],
  },
  test: {
    // Logique pure : pas de React Native a simuler. Les modules testes ici ne
    // doivent importer de l'app que des types, effaces a la compilation.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
