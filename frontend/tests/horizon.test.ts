import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { clearanceDeg, horizonAt, horizonExtremes, normalizeAz } from '../src/lib/horizon.ts'
import type { HorizonMask, SiteData } from '../src/types.ts'

const close = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `esperaba ${expected} y dio ${actual}`)

/** Horizonte de 1° de paso donde la elevación en el azimut `a` vale `a / 100`. */
const ramp: HorizonMask = { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, (_, a) => a / 100) }

describe('normalizeAz', () => {
  test('deja igual lo que ya está en [0, 360)', () => close(normalizeAz(123.4), 123.4))
  test('360 es 0', () => close(normalizeAz(360), 0))
  test('negativos dan la vuelta', () => close(normalizeAz(-10), 350))
  test('más de una vuelta', () => close(normalizeAz(725), 5))
})

describe('horizonAt', () => {
  test('en un azimut entero devuelve el valor exacto', () => close(horizonAt(ramp, 90), 0.9))
  test('a mitad de camino interpola en línea recta', () => close(horizonAt(ramp, 90.5), 0.905))
  test('cerca del final interpola entre 359° y 0° (da la vuelta)', () => {
    // 359° vale 3.59 y 0° vale 0: a 359.5° la mitad, 1.795
    close(horizonAt(ramp, 359.5), 1.795)
  })
  test('360° es lo mismo que 0°', () => close(horizonAt(ramp, 360), horizonAt(ramp, 0)))
  test('azimut negativo', () => close(horizonAt(ramp, -0.5), horizonAt(ramp, 359.5)))

  test('funciona con paso de 2° (180 valores)', () => {
    const coarse: HorizonMask = { azimuthStepDeg: 2, elevationDeg: Array.from({ length: 180 }, (_, i) => i) }
    close(horizonAt(coarse, 4), 2)
    close(horizonAt(coarse, 5), 2.5)
    close(horizonAt(coarse, 359), 89.5) // entre 358° (vale 179) y 0° (vale 0): la mitad
  })

  test('horizonte vacío da NaN', () => assert.ok(Number.isNaN(horizonAt({ azimuthStepDeg: 1, elevationDeg: [] }, 10))))
})

describe('clearanceDeg', () => {
  test('positivo si el cuerpo está sobre el relieve', () => close(clearanceDeg(ramp, 100, 2), 1))
  test('negativo si el relieve lo tapa', () => close(clearanceDeg(ramp, 200, 1), -1))
})

describe('horizonExtremes', () => {
  test('máximo, mínimo y dónde está el máximo', () => {
    const e = horizonExtremes(ramp)
    close(e.maxDeg, 3.59)
    close(e.maxAzDeg, 359)
    close(e.minDeg, 0)
  })
})

describe('con los datos de prueba', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites: SiteData[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

  test('hay 6 sitios', () => assert.equal(sites.length, 6))

  // `npm run mock` calcula el % de luz con esta misma regla (Sol sobre el horizonte interpolado).
  // Si estos números cambian, cambió la interpolación o cambiaron los datos.
  // Horizonte real LOLA (rayos de 150 km con curvatura, `npm run horizon`) y Sol de JPL Horizons en todo 2027,
  // con las coordenadas verificadas. En los primeros 60 días coinciden con backend/out a menos de 0.5 puntos.
  const expectedLightPct: Record<string, number> = {
    'shackleton-rim': 64,
    'de-gerlache-rim': 79.5,
    'connecting-ridge': 89.5,
    'mons-mouton': 45.8,
    'nobile-rim': 24.7,
    'malapert-massif': 70.5,
  }
  for (const d of sites) {
    test(`% de luz de ${d.site.id} coincide con el generador`, () => {
      const lit = d.sun.el.filter((el, i) => clearanceDeg(d.horizon, d.sun.az[i], el) > 0).length
      const pct = Math.round((1000 * lit) / d.sun.el.length) / 10
      assert.equal(pct, expectedLightPct[d.site.id])
    })
  }
})
