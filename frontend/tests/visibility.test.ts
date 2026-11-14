import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
  contactSeries,
  hasContact,
  isLit,
  litSeries,
  nextChange,
  percent,
  visibility,
  windowAt,
  windows,
} from '../src/lib/visibility.ts'
import type { SiteData } from '../src/types.ts'

/** Sitio mínimo: horizonte plano a `h` grados, el Sol y la Tierra con las elevaciones dadas (azimut 0). */
function fakeSite(sunEl: number[], earthEl: number[] = sunEl, h = 0): SiteData {
  const zeros = (n: number) => Array.from({ length: n }, () => 0)
  return {
    site: { id: 'x', name: 'x', lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => h) },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun: { az: zeros(sunEl.length), el: sunEl },
    earth: { az: zeros(earthEl.length), el: earthEl },
  }
}

const T = true
const F = false

describe('isLit y hasContact', () => {
  const d = fakeSite([1, -1, 0, 0.001], [-2, 3, 0.5, -0.5], 0)
  test('luz si el Sol está sobre el relieve', () => assert.deepEqual([0, 1, 2, 3].map((i) => isLit(d, i)), [T, F, F, T]))
  test('justo en el borde (= horizonte) no cuenta como luz', () => assert.equal(isLit(d, 2), false))
  test('contacto si la Tierra está sobre el relieve', () =>
    assert.deepEqual([0, 1, 2, 3].map((i) => hasContact(d, i)), [F, T, T, F]))
  test('las series coinciden con las funciones de un instante', () => {
    assert.deepEqual(litSeries(d), [0, 1, 2, 3].map((i) => isLit(d, i)))
    assert.deepEqual(contactSeries(d), [0, 1, 2, 3].map((i) => hasContact(d, i)))
  })
  test('un relieve más alto tapa más', () => assert.deepEqual(litSeries(fakeSite([1, 2, 3], [1, 2, 3], 2.5)), [F, F, T]))
})

describe('percent', () => {
  test('todo el periodo', () => assert.equal(percent([T, F, T, T]), 75))
  test('un rango [from, to)', () => assert.equal(percent([T, F, T, T], 1, 3), 50))
  test('rango vacío da 0', () => assert.equal(percent([T, T], 1, 1), 0))
  test('rango fuera de límites se recorta', () => assert.equal(percent([T, F], -5, 99), 50))
  test('sin muestras da 0', () => assert.equal(percent([]), 0))
})

describe('windows', () => {
  test('tramos continuos', () =>
    assert.deepEqual(windows([F, T, T, F, T]), [
      { start: 1, end: 3, openStart: false, openEnd: false },
      { start: 4, end: 5, openStart: false, openEnd: true },
    ]))
  test('un tramo que empieza con el periodo queda marcado', () =>
    assert.deepEqual(windows([T, T, F]), [{ start: 0, end: 2, openStart: true, openEnd: false }]))
  test('todo verdadero es un solo tramo abierto a los dos lados', () =>
    assert.deepEqual(windows([T, T, T]), [{ start: 0, end: 3, openStart: true, openEnd: true }]))
  test('todo falso no tiene tramos', () => assert.deepEqual(windows([F, F]), []))
  test('vacío no tiene tramos', () => assert.deepEqual(windows([]), []))
})

describe('windowAt', () => {
  const f = [F, T, T, T, F, F]
  test('el tramo de luz que contiene la muestra', () =>
    assert.deepEqual(windowAt(f, 2), { start: 1, end: 4, openStart: false, openEnd: false }))
  test('también sirve para tramos de sombra', () =>
    assert.deepEqual(windowAt(f, 5), { start: 4, end: 6, openStart: false, openEnd: true }))
  test('fuera de rango da null', () => assert.equal(windowAt(f, 9), null))
})

describe('nextChange', () => {
  const f = [T, T, F, F, F, T]
  test('muestras hasta que cambia', () => assert.equal(nextChange(f, 0), 2))
  test('desde una sombra, hasta que vuelve la luz', () => assert.equal(nextChange(f, 2), 3))
  test('si no cambia más, null', () => assert.equal(nextChange(f, 5), null))
  test('fuera de rango, null', () => assert.equal(nextChange(f, -1), null))
})

describe('con los datos de prueba', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites: SiteData[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

  for (const d of sites) {
    test(`${d.site.id}: ventanas, porcentajes y próximo cambio son coherentes`, () => {
      const v = visibility(d)
      assert.equal(v.lit.length, d.sun.el.length)

      // Las ventanas no se superponen, están en orden y suman lo mismo que el porcentaje.
      for (const flags of [v.lit, v.contact]) {
        const ws = windows(flags)
        ws.forEach((w, k) => {
          assert.ok(w.end > w.start)
          if (k > 0) assert.ok(w.start > ws[k - 1].end, 'dos ventanas seguidas deben estar separadas por al menos una muestra')
        })
        const covered = ws.reduce((sum, w) => sum + (w.end - w.start), 0)
        assert.ok(Math.abs((100 * covered) / flags.length - percent(flags)) < 1e-9)
      }

      // nextChange coincide con windowAt en varias muestras.
      for (const i of [0, 100, 700, v.lit.length - 1]) {
        const w = windowAt(v.lit, i)!
        assert.equal(nextChange(v.lit, i), w.openEnd ? null : w.end - i)
      }
    })
  }
})
