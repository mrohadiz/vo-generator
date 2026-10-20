import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend Flask berjalan di 5055; saat `pnpm dev` semua panggilan API diteruskan ke sana.
const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:5055';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static/app',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/output': BACKEND,
    },
  },
});
