import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { dataNotice, validateSiteData, validateSites, withFallback } from '../src/api.ts'
import type { SiteData } from '../src/types'

const real = { mock: false, sources: { ephemeris: 'jpl-horizons', terrain: 'lola' } } as const

describe('dataNotice', () => {
  test('datos reales: sin aviso', () => assert.equal(dataNotice(real), null))
  test('mock: true avisa aunque las fuentes digan reales', () => assert.match(dataNotice({ ...real, mock: true })!, /prueba/))
  test('sin sources: el Sol, la Tierra y el relieve no son reales', () =>
    assert.match(dataNotice({})!, /el Sol y la Tierra ni el relieve de este sitio no son reales/))
  test('solo el relieve sintético', () =>
    assert.match(dataNotice({ sources: { ephemeris: 'jpl-horizons', terrain: 'synthetic' } })!, /el relieve de este sitio no es real/))
  test('solo las efemérides de modelo', () =>
    assert.match(dataNotice({ sources: { ephemeris: 'model', terrain: 'lola' } })!, /el Sol y la Tierra de este sitio no son reales/))
})

describe('public/data cumple el contrato y es real', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data')
  test('sites.json', () => assert.deepEqual(validateSites(JSON.parse(readFileSync(join(dir, 'sites.json'), 'utf8'))), []))
  for (const f of readdirSync(join(dir, 'sites'))) {
    test(f, () => {
      const d: SiteData = JSON.parse(readFileSync(join(dir, 'sites', f), 'utf8'))
      assert.deepEqual(validateSiteData(d, f.replace('.json', '')), [])
      assert.equal(dataNotice(d), null)
    })
  }
})

describe('withFallback: respaldo estático si el backend falla', () => {
  test('usa el backend cuando responde', async () => {
    assert.equal(await withFallback(async () => 'backend', async () => 'local'), 'backend')
  })
  test('usa los archivos locales si el backend falla', async () => {
    const warn = console.warn
    console.warn = () => {}
    try {
      assert.equal(await withFallback(async () => { throw new Error('caído') }, async () => 'local'), 'local')
    } finally {
      console.warn = warn
    }
  })
  test('sin respaldo, el error llega a la interfaz', async () => {
    await assert.rejects(withFallback(async () => { throw new Error('caído') }, null), /caído/)
  })
})
