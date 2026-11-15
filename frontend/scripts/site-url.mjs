/** Una sola dirección para Open Graph, canónica, datos estructurados y sitemap. */
export function siteUrl(env = process.env) {
  const raw = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://geoathecmoon.vercel.app')
  const url = new URL(raw)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL debe ser una URL pública http(s), sin credenciales, parámetros ni fragmentos.')
  }
  return url.href.replace(/\/+$/, '')
}
