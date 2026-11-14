import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
  MIN_GAIN,
  bestAlternativeSite,
  bestStartDate,
  missionWindow,
  recommend,
  scanStartDates,
  type SiteContext,
} from '../src/lib/recommend.ts'
import { visibility } from '../src/lib/visibility.ts'
import type { SiteData } from '../src/types.ts'

const DAYS = 10
const N = DAYS * 24 // 240 muestras horarias

/**
 * Sitio sintético de 10 días: el Sol está visible donde `sunUp(i)` es verdadero y la Tierra donde
 * `earthUp(i)`. Horizonte plano en 0°, pendiente suave.
 */
function site(id: string, sunUp: (i: number) => boolean, earthUp: (i: number) => boolean = () => true, slope = 2): SiteContext {
  const el = (up: (i: number) => boolean) => Array.from({ length: N }, (_, i) => (up(i) ? 1 : -1))
  const data: SiteData = {
    site: { id, name: id.toUpperCase(), lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => 0) },
    slope: { atSiteDeg: slope / 2, max100mDeg: slope },
    sun: { az: Array.from({ length: N }, () => 0), el: el(sunUp) },
    earth: { az: Array.from({ length: N }, () => 0), el: el(earthUp) },
  }
  return { data, vis: visibility(data) }
}

describe('missionWindow', () => {
  const s = site('a', () => true)
  test('empieza donde se pide y dura N días', () => assert.deepEqual(missionWindow(s.data, 24, 3), { from: 24, to: 96, shifted: false }))
  test('si no entra, adelanta el inicio', () =>
    assert.deepEqual(missionWindow(s.data, 200, 3), { from: N - 72, to: N, shifted: true }))
  test('una misión más larga que el periodo ocupa todo el periodo', () =>
    assert.deepEqual(missionWindow(s.data, 50, 99), { from: 0, to: N, shifted: true }))
})

describe('scanStartDates y bestStartDate', () => {
  // Luz solo en la segunda mitad del periodo (desde el día 5).
  const lateSun = site('late', (i) => i >= 120)

  test('prueba inicios cada 6 h con la misión completa dentro del periodo', () => {
    const c = scanStartDates(lateSun, 3)
    assert.equal(c[0].startIndex, 0)
    assert.equal(c[1].startIndex, 6)
    assert.ok(c.at(-1)!.startIndex + 72 <= N)
  })
  test('la mejor fecha es cuando hay luz toda la misión', () => {
    const best = bestStartDate(lateSun, 3)!
    assert.ok(best.startIndex >= 120, `empezó en ${best.startIndex}`)
  })
  test('con empate, la fecha más temprana', () => assert.equal(bestStartDate(site('flat', () => true), 3)!.startIndex, 0))
})

describe('bestAlternativeSite', () => {
  const dark = site('dark', () => false)
  const bright = site('bright', () => true)
  const mid = site('mid', (i) => i % 2 === 0)
  test('elige el mejor de los otros en la misma ventana', () =>
    assert.equal(bestAlternativeSite(dark, [dark, mid, bright], { from: 0, to: 72 })!.ctx.data.site.id, 'bright'))
  test('no se compara consigo mismo', () => assert.equal(bestAlternativeSite(bright, [bright], { from: 0, to: 72 }), null))
  test('ignora sitios con otro periodo', () => {
    const other = site('other', () => true)
    other.data = { ...other.data, start: '2028-01-01T00:00:00Z' }
    assert.equal(bestAlternativeSite(dark, [dark, other], { from: 0, to: 72 }), null)
  })
})

describe('recommend', () => {
  const lateSun = site('late', (i) => i >= 120)
  const bright = site('bright', () => true)

  test('recomienda una fecha mejor con su ganancia y una frase', () => {
    const r = recommend(lateSun, [lateSun], { startIndex: 0, missionDays: 3 })
    assert.ok(r.betterDate && r.betterDate.startIndex >= 120)
    assert.ok(r.betterDate.gain >= MIN_GAIN)
    assert.match(r.dateMessage!, /^Empezando el \d\d [a-z]{3} 2027, \d\d:\d\d UTC, la viabilidad sube a \d+ % \(\+\d+\)\.$/)
  })
  test('recomienda un sitio mejor para las mismas fechas', () => {
    const r = recommend(lateSun, [lateSun, bright], { startIndex: 0, missionDays: 3 })
    assert.equal(r.betterSite?.siteId, 'bright')
    assert.match(r.siteMessage!, /^BRIGHT llega a \d+ % en las mismas fechas \(\+\d+\)\.$/)
  })
  test('si ya es lo mejor, no recomienda nada y lo dice', () => {
    const r = recommend(bright, [bright, lateSun], { startIndex: 0, missionDays: 3 })
    assert.equal(r.betterDate, null)
    assert.equal(r.betterSite, null)
    assert.match(r.message, /no hay una fecha ni un sitio claramente mejores/)
  })
  test('una mejora menor al mínimo no se recomienda', () => {
    // 'almost' pierde solo una hora de luz: la diferencia es menor a 3 puntos.
    const almost = site('almost', (i) => i !== 0)
    const r = recommend(almost, [almost, bright], { startIndex: 0, missionDays: 3 })
    assert.equal(r.betterSite, null)
  })
  test('la viabilidad actual usa solo la ventana de la misión', () => {
    const early = recommend(lateSun, [lateSun], { startIndex: 0, missionDays: 3 }).current
    const late = recommend(lateSun, [lateSun], { startIndex: 150, missionDays: 3 }).current
    assert.ok(late.score > early.score)
  })
})

describe('con los datos de prueba', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const all: SiteContext[] = readdirSync(dir).map((f) => {
    const data: SiteData = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    return { data, vis: visibility(data) }
  })

  for (const ctx of all) {
    test(`${ctx.data.site.id}: la mejor fecha nunca es peor que la actual`, () => {
      const r = recommend(ctx, all, { startIndex: 0, missionDays: 14 })
      const best = bestStartDate(ctx, 14)!
      assert.ok(best.score >= r.current.score - 1e-9)
      if (r.betterSite) assert.ok(r.betterSite.score - r.current.score >= MIN_GAIN)
    })
  }

  test('Mons Mouton (con noche lunar) tiene fechas mucho mejores que otras', () => {
    const mm = all.find((c) => c.data.site.id === 'mons-mouton')!
    const scores = scanStartDates(mm, 14).map((c) => c.score)
    assert.ok(Math.max(...scores) - Math.min(...scores) > 15)
  })
})
