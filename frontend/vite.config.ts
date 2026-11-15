import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteUrl as publicSiteUrl } from './scripts/site-url.mjs'

/**
 * Dirección pública del sitio para las etiquetas Open Graph (las redes necesitan la URL completa de la imagen).
 * En Vercel sale de VERCEL_PROJECT_PRODUCTION_URL, que Vercel define en cada build; SITE_URL la reemplaza si
 * hace falta. Sin variables usa el despliegue público del proyecto, también al compilar en local.
 */
function siteUrl(): Plugin {
  const base = publicSiteUrl()
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrl()],
})
