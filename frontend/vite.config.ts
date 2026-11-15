import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Dirección pública del sitio para las etiquetas Open Graph (las redes necesitan la URL completa de la imagen).
 * En Vercel sale de VERCEL_PROJECT_PRODUCTION_URL, que Vercel define en cada build; SITE_URL la reemplaza si
 * hace falta. En local queda vacía y las rutas son relativas.
 */
function siteUrl(): Plugin {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  const base = raw.replace(/\/+$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrl()],
})
