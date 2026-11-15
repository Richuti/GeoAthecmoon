import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { lapDays, storyFacts } from '../src/lib/storyFacts.ts'
import type { SiteData } from '../src/types.ts'

describe('lapDays', () => {
  test('una vuelta en 24 h (paso de 1 h, 15° por hora) es 1 día', () => {
    const az = Array.from({ length: 25 }, (_, i) => (i * 15) % 360)
    assert.ok(Math.abs(lapDays(az, 1) - 1) < 1e-9)
  })
  test('girando hacia el otro lado da lo mismo', () => {
    const az = Array.from({ length: 25 }, (_, i) => (360 - ((i * 15) % 360)) % 360)
    assert.ok(Math.abs(lapDays(az, 1) - 1) < 1e-9)
  })
  test('sin movimiento: Infinity', () => assert.equal(lapDays([10, 10, 10], 1), Infinity))
})

describe('con los datos de JPL Horizons y LOLA', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites: SiteData[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  const f = storyFacts(sites)!

  test('usa Shackleton como referencia', () => assert.equal(f.refName, 'Borde del cráter Shackleton'))
  test('el Sol nunca sube más de 2° en Shackleton', () => assert.ok(f.sunMaxElDeg > 0.5 && f.sunMaxElDeg < 2))
  test('el Sol da una vuelta al horizonte cada ~29.5 días (mes sinódico)', () =>
    assert.ok(Math.abs(f.sunLapDays - 29.5) < 0.5, `dio ${f.sunLapDays}`))
  test('hay un ejemplo de fecha que mejora mucho', () => {
    assert.ok(f.dateExample)
    assert.ok(f.dateExample.best - f.dateExample.fromStart > 30)
  })
  test('calcula la sombra con la serie solar y el paso temporal', () => {
    const site: SiteData = {
      ...sites[0],
      stepHours: 2,
      horizon: { azimuthStepDeg: 360, elevationDeg: [0] },
      sun: { az: [0, 0, 0, 0, 0, 0], el: [-1, -1, 1, -1, -1, -1] },
      earth: { az: [0, 0, 0, 0, 0, 0], el: [1, 1, 1, 1, 1, 1] },
    }
    assert.equal(storyFacts([site])!.longestShadowHours, 6)
    assert.equal(storyFacts([{ ...site, sun: { ...site.sun, el: [1, 1, 1, 1, 1, 1] } }])!.longestShadowHours, 0)
  })
  test('excluye datos sintéticos y fuentes sin verificar', () => {
    assert.equal(storyFacts(sites.map((site) => ({ ...site, mock: true }))), null)
    assert.equal(storyFacts(sites.map((site) => ({ ...site, sources: { ephemeris: 'model', terrain: 'lola' } }))), null)
    assert.equal(storyFacts(sites.map((site) => ({ ...site, sources: { ephemeris: 'jpl-horizons', terrain: 'synthetic' } }))), null)
    assert.equal(storyFacts(sites.map((site) => ({ ...site, sources: undefined }))), null)
    assert.equal(storyFacts([...sites, { ...sites[0], mock: true }])!.siteCount, sites.length)
  })
  test('6 sitios y 365 días (todo 2027)', () => {
    assert.equal(f.siteCount, 6)
    assert.equal(f.periodDays, 365)
  })
  test('sin sitios: null', () => assert.equal(storyFacts([]), null))
})
