// Prerender de la portada (corre al final de `npm run build`).
//
// 1. Lee los JSON de public/data y genera, con el build de servidor (dist-ssr/entry.js), el HTML estático de la
//    portada: texto real, cifras calculadas y enlaces. Lo pone dentro de <div id="root"> en dist/index.html.
//    Así los buscadores (y quien abra la página sin JavaScript o sin imágenes) ven contenido, no una página vacía.
//    React lo reemplaza al arrancar.
// 2. Agrega la URL canónica y los datos estructurados (JSON-LD), y escribe robots.txt y sitemap.xml.
//
// La URL pública sale de SITE_URL o de VERCEL_PROJECT_PRODUCTION_URL, igual que en vite.config.ts.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssr = path.join(root, 'dist-ssr')
const dataDir = path.join(root, 'public', 'data')

const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
const base = raw.replace(/\/+$/, '')

const entry = fs.readdirSync(ssr).find((f) => /^entry\.m?js$/.test(f))
if (!entry) throw new Error('prerender: falta dist-ssr/entry.js (¿corrió vite build --ssr?)')
const { render } = await import(pathToFileURL(path.join(ssr, entry)).href)

const { sites } = JSON.parse(fs.readFileSync(path.join(dataDir, 'sites.json'), 'utf8'))
const data = sites.map((s) => JSON.parse(fs.readFileSync(path.join(dataDir, 'sites', `${s.id}.json`), 'utf8')))
const { html, sites: summary } = render(data)

const escapeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c')
const description = 'Planifica y simula una misión en el polo sur de la Luna: luz solar, contacto con la Tierra y pendiente de cada sitio de alunizaje.'
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'GEOATHECMOON',
  alternateName: 'Planificador de alunizaje lunar',
  description,
  ...(base && { url: `${base}/` }),
  inLanguage: 'es',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  about: summary.map((s) => ({ '@type': 'Place', name: s.name, description: s.description })),
  isBasedOn: [
    { '@type': 'Dataset', name: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' },
    { '@type': 'Dataset', name: 'LRO LOLA', url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm' },
  ],
}

const head = [
  base && `<link rel="canonical" href="${base}/" />`,
  `<script type="application/ld+json">${escapeJson(jsonLd)}</script>`,
].filter(Boolean).join('\n    ')

const indexPath = path.join(dist, 'index.html')
let index = fs.readFileSync(indexPath, 'utf8')
if (!index.includes('<div id="root"></div>')) throw new Error('prerender: no encontré <div id="root"></div> en dist/index.html')
index = index.replace('<div id="root"></div>', `<div id="root">${html}</div>`).replace('</head>', `    ${head}\n  </head>`)
fs.writeFileSync(indexPath, index)

fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n${base ? `\nSitemap: ${base}/sitemap.xml\n` : ''}`)
if (base) {
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
</urlset>
`)
}

fs.rmSync(ssr, { recursive: true, force: true })
console.log(`prerender: portada estática con ${summary.length} sitios (${(html.length / 1024).toFixed(1)} KB)${base ? ` · ${base}` : ' · sin SITE_URL: sin canónica ni sitemap'}`)
