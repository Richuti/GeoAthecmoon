import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { PRESETS } from '../src/sim/lander.ts'
import { bestStart, bestViableStart, compareSites, delayTolerance, scanStarts, seriesOf, type StartResult } from '../src/sim/search.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 20 * 24

describe('bestViableStart: luz, comunicación y terreno', () => {
  const candidate = (startIndex: number, marginKWh: number, survived = true): StartResult => ({ startIndex, marginKWh, survived, minSocPct: 50, dataSentPct: 100 })
  test('prefiere más contacto aunque otra fecha deje más batería', () => {
    const d = site('a', () => true)
    d.earth.el.fill(-5, 0, 24)
    const best = bestViableStart(d, [candidate(0, 2.4), candidate(48, 1.2)], 1)
    assert.equal(best?.startIndex, 48)
    assert.equal(best?.viability, 100)
  })
  test('solo recomienda fechas en las que el módulo sobrevive', () => {
    const d = site('a', () => true)
    assert.equal(bestViableStart(d, [candidate(0, 3, false)], 1), null)
  })
  test('a igual viabilidad elige margen, y después la fecha más temprana', () => {
    const d = site('a', () => true)
    const best = bestViableStart(d, [candidate(48, 2), candidate(24, 1), candidate(0, 2)], 1)
    assert.equal(best?.startIndex, 0)
  })
})

/** 20 días: el Sol se ve mientras `sunUp(i)`; la Tierra siempre. */
function site(id: string, sunUp: (i: number) => boolean): SiteData {
  return {
    site: { id, name: id, lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => 0) },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (sunUp(i) ? 2 : -2)) },
    earth: { az: Array(N).fill(0), el: Array(N).fill(5) },
  }
}

describe('delayTolerance', () => {
  // Sol los primeros 12 días y después oscuridad: una misión de 3 días tolera ~8-9 días de atraso.
  const d = site('a', (i) => i < 12 * 24)
  test('cuenta los días de atraso hasta la primera fecha que falla', () => {
    const t = delayTolerance(d, explorer, 0, 3)
    assert.equal(t.survivesNow, true)
    assert.equal(t.limitedByPeriod, false)
    assert.ok(t.days >= 8 && t.days <= 10, `dio ${t.days}`)
  })
  test('si ya falla en la fecha pedida: 0 días', () => {
    const t = delayTolerance(d, explorer, 14 * 24, 3)
    assert.deepEqual(t, { days: 0, limitedByPeriod: false, survivesNow: false })
  })
  test('si nunca falla, lo limita el periodo de datos', () => {
    const t = delayTolerance(site('b', () => true), explorer, 0, 3)
    assert.equal(t.limitedByPeriod, true)
    assert.equal(t.days, 17)
  })
  test('sin espacio para otro inicio: cero atraso comprobable no significa falla', () => {
    const t = delayTolerance(site('b', () => true), explorer, 17 * 24, 3)
    assert.deepEqual(t, { days: 0, limitedByPeriod: true, survivesNow: true })
  })
})

describe('scanStarts y bestStart', () => {
  const d = site('a', (i) => i < 12 * 24)
  const scan = scanStarts(d, explorer, 3)
  test('prueba cada 6 h con la misión completa dentro del periodo', () => {
    assert.equal(scan[1].startIndex - scan[0].startIndex, 6)
    assert.ok(scan.at(-1)!.startIndex + 72 <= N)
  })
  test('las primeras fechas sobreviven y las últimas no', () => {
    assert.equal(scan[0].survived, true)
    assert.equal(scan.at(-1)!.survived, false)
  })
  test('la mejor fecha sobrevive', () => assert.equal(bestStart(scan)?.survived, true))
  test('sin fechas que sobrevivan: null', () => assert.equal(bestStart(scanStarts(site('c', () => false), explorer, 3)), null))
})

describe('compareSites', () => {
  test('ordena: primero los que sobreviven', () => {
    const sites = [site('x', () => false), site('dark', () => false), site('bright', () => true)].map((data) => ({ data, series: seriesOf(data) }))
    const r = compareSites(sites, 'x', explorer, 0, 3)
    assert.equal(r[0].siteId, 'bright')
    assert.equal(r[0].survived, true)
    assert.equal(r.length, 2)
  })
})

describe('con los datos reales (Mons Mouton, explorador ligero)', () => {
  const data: SiteData = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'data', 'sites', 'mons-mouton.json'), 'utf8'))
  test('hay fechas que sobreviven y fechas que no', () => {
    const scan = scanStarts(data, explorer, 14)
    assert.ok(scan.some((r) => r.survived))
    assert.ok(scan.some((r) => !r.survived))
  })
  test('desde la mejor fecha, la misión tolera algún atraso o lo limita el periodo', () => {
    const best = bestStart(scanStarts(data, explorer, 14))!
    const t = delayTolerance(data, explorer, best.startIndex, 14)
    assert.equal(t.survivesNow, true)
  })
})
