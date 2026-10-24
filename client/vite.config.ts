import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Link previews (WhatsApp, X, Slack) need absolute image URLs.
 * Netlify provides the site address as URL while building; set VITE_SITE_URL
 * yourself if you use a custom domain.
 */
function siteUrlInHtml(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '');
  return {
    name: 'site-url-in-html',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', base),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), siteUrlInHtml(env.VITE_SITE_URL || env.URL || '')],
    server: {
      port: 5173,
      // The browser only ever talks to localhost:5173. Vite forwards /api to the
      // Express server, so the session cookie is same-origin, exactly like the
      // Netlify proxy in production.
      proxy: {
        '/api': { target: 'http://localhost:4000', changeOrigin: true },
      },
    },
  };
});
