import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteUrl as publicSiteUrl } from './scripts/site-url.mjs'
import { POST as copilotPost } from './api/copilot.ts'

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

/**
 * En local (`npm run dev` y `npm run preview`), /api/copilot usa la misma función que Vercel. La clave se lee de
 * frontend/.env.local (OPENAI_API_KEY, sin prefijo VITE_: nunca entra en el código del navegador).
 */
function copilotApi(): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    const response = req.method === 'POST'
      ? await copilotPost(new Request(`http://${req.headers.host ?? 'localhost'}/api/copilot`, { method: 'POST', headers, body: Buffer.concat(chunks) }))
      : new Response(null, { status: 405 })
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(await response.text())
  }
  const loadKey = (mode: string) => {
    const env = loadEnv(mode, process.cwd(), '')
    for (const k of ['OPENAI_API_KEY', 'OPENAI_MODEL']) if (env[k] && !process.env[k]) process.env[k] = env[k]
  }
  return {
    name: 'copilot-api',
    configureServer(server) { loadKey(server.config.mode); server.middlewares.use('/api/copilot', (req, res) => { void handle(req, res) }) },
    configurePreviewServer(server) { loadKey('production'); server.middlewares.use('/api/copilot', (req, res) => { void handle(req, res) }) },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrl(), copilotApi()],
})
