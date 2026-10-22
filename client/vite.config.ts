import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser only ever talks to localhost:5173. Vite forwards /api to the
    // Express server, so the session cookie is same-origin, exactly like the
    // Vercel rewrite in production.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
