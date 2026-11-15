import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { visibility } from '../src/lib/visibility.ts'
import { compareDelay } from '../src/sim/delay.ts'
import { PRESETS } from '../src/sim/lander.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 30 * 24

function site(sunUp: (i: number) => boolean, earthUp: (i: number) => boolean = () => true): SiteData {
  return {
    site: { id: 'a', name: 'a', lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => 0) },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (sunUp(i) ? 2 : -2)) },
    earth: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (earthUp(i) ? 5 : -5)) },
  }
}

describe('compareDelay: si la misión se atrasa, ¿todavía funciona?', () => {
  test('con Sol siempre, el atraso no cambia nada', () => {
    const d = site(() => true)
    const c = compareDelay(d, visibility(d), explorer, 0, 3, 48)
    assert.equal(c.appliedHours, 48)
    assert.equal(c.cutByPeriod, false)
    assert.equal(c.stillWorks, true)
    assert.equal(c.viabilityChange, 0)
    assert.equal(c.delayed.from, 48)
  })

  test('si el atraso cae en la noche, la misión deja de funcionar', () => {
    // Sol los primeros 10 días; después, oscuridad.
    const d = site((i) => i < 10 * 24)
    const c = compareDelay(d, visibility(d), explorer, 0, 3, 9 * 24)
    assert.equal(c.original.survived, true)
    assert.equal(c.delayed.survived, false)
    assert.equal(c.stillWorks, false)
    assert.ok(c.viabilityChange < 0)
    assert.ok(c.delayed.lightPct < c.original.lightPct)
    // Igual que el resultado de la misión: si falla, la viabilidad queda en 40 como máximo.
    assert.ok(c.delayed.viability <= 40)
  })

  test('el atraso se recorta cuando la misión ya no cabe en los datos', () => {
    const d = site(() => true)
    const c = compareDelay(d, visibility(d), explorer, 20 * 24, 7, 10 * 24)
    assert.equal(c.cutByPeriod, true)
    assert.equal(c.delayed.from, N - 7 * 24)
    assert.equal(c.appliedHours, 3 * 24)
  })

  test('un atraso puede mejorar la comunicación', () => {
    // La Tierra aparece a partir del día 5.
    const d = site(() => true, (i) => i >= 5 * 24)
    const c = compareDelay(d, visibility(d), explorer, 0, 3, 5 * 24)
    assert.equal(c.original.contactPct, 0)
    assert.equal(c.delayed.contactPct, 100)
    assert.ok(c.viabilityChange > 0)
  })
})
