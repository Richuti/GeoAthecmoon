import assert from 'node:assert/strict'
import { test } from 'node:test'
import { siteUrl } from '../scripts/site-url.mjs'

test('el build local genera enlaces del despliegue público, nunca relativos', () => {
  assert.equal(siteUrl({}), 'https://geoathectum.vercel.app')
})
test('SITE_URL prevalece sobre Vercel y normaliza la barra final', () => {
  assert.equal(siteUrl({ SITE_URL: 'https://example.org///', VERCEL_PROJECT_PRODUCTION_URL: 'another.vercel.app' }), 'https://example.org')
  assert.equal(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'another.vercel.app' }), 'https://another.vercel.app')
})
test('rechaza una dirección que no pueda usarse en las etiquetas públicas', () => {
  for (const SITE_URL of ['javascript:alert(1)', 'https://name:secret@example.org', 'https://example.org/?x=1', 'https://example.org/#inicio', 'invalid']) {
    assert.throws(() => siteUrl({ SITE_URL }))
  }
})
