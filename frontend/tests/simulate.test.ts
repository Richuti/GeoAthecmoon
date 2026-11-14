import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { bestStartDate } from '../src/lib/recommend.ts'
import { visibility } from '../src/lib/visibility.ts'
import { PRESETS, autonomyHours, type LanderConfig } from '../src/sim/lander.ts'
import { simulate, sunFraction } from '../src/sim/simulate.ts'
import type { SiteData } from '../src/types.ts'

const N = 30 * 24
const explorer = PRESETS.explorer.config

/** Sitio sintético: el Sol a `sunEl(i)` grados y la Tierra a `earthEl(i)`, horizonte plano en 0°. */
function site(sunEl: (i: number) => number, earthEl: (i: number) => number = () => 5): SiteData {
  return {
    site: { id: 'x', name: 'x', lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => 0) },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun: { az: Array.from({ length: N }, () => 0), el: Array.from({ length: N }, (_, i) => sunEl(i)) },
    earth: { az: Array.from({ length: N }, () => 0), el: Array.from({ length: N }, (_, i) => earthEl(i)) },
  }
}

describe('sunFraction', () => {
  test('disco entero arriba: 1', () => assert.equal(sunFraction(1), 1))
  test('disco entero tapado: 0', () => assert.equal(sunFraction(-1), 0))
  test('centro justo en el borde: mitad', () => assert.equal(sunFraction(0), 0.5))
})

describe('casos extremos', () => {
  test('siempre con luz: no falla y la batería queda llena', () => {
    const r = simulate(site(() => 2), explorer, { startIndex: 0, missionDays: 14 })
    assert.equal(r.summary.survived, true)
    assert.ok(Math.abs(r.summary.endSocPct - 100) < 1e-9)
    assert.equal(r.events.at(-1)!.type, 'complete')
  })

  test('siempre a oscuras: falla cuando se acaba la autonomía', () => {
    const r = simulate(site(() => -5), explorer, { startIndex: 0, missionDays: 14 })
    assert.equal(r.summary.survived, false)
    // Falla en la hora en que se cruza la autonomía teórica (19.8 h → muestra 19, la vigésima hora).
    assert.equal(r.summary.failedAtIndex, Math.ceil(autonomyHours(explorer)) - 1)
    assert.ok(r.events.some((e) => e.type === 'survival'))
    assert.equal(r.events.at(-1)!.type, 'failure')
    assert.ok(Math.abs(r.summary.endSocPct - 20) < 1e-9)
  })

  test('sin contacto: 0 % de datos enviados', () => {
    const r = simulate(site(() => 2, () => -3), explorer, { startIndex: 0, missionDays: 7 })
    assert.equal(r.summary.dataSentMb, 0)
    assert.equal(r.summary.dataSentPct, 0)
  })

  test('con contacto todo el tiempo y envío suficiente: llega todo', () => {
    const r = simulate(site(() => 2), explorer, { startIndex: 0, missionDays: 7 })
    assert.ok(Math.abs(r.summary.dataSentPct - 100) < 1e-9)
  })

  test('la energía nunca pasa de la capacidad ni baja del 20 %', () => {
    const r = simulate(site((i) => (Math.floor(i / 12) % 2 ? 2 : -2)), explorer, { startIndex: 0, missionDays: 14 })
    for (const s of r.series.soc) assert.ok(s <= 1 + 1e-12 && s >= 0.2 - 1e-12)
  })
})

describe('modos y eventos', () => {
  // 15 h de sombra (entra en supervivencia sin fallar) y después Sol.
  const r = simulate(site((i) => (i < 15 ? -2 : 2)), explorer, { startIndex: 0, missionDays: 5 })
  test('entra en supervivencia y se recupera', () => {
    const types = r.events.map((e) => e.type)
    assert.ok(types.includes('survival'))
    assert.ok(types.includes('recovered'))
    assert.equal(r.summary.survived, true)
    assert.ok(r.summary.hoursInSurvival > 0)
  })
  test('avisa cuando vuelve el Sol', () => assert.ok(r.events.some((e) => e.type === 'sun-rise' && e.index === 15)))
  test('mensajes en español con día y hora de la misión', () => {
    const rise = r.events.find((e) => e.type === 'sun-rise')!
    assert.equal(rise.message, 'Día 1, 15:00 UTC: vuelve el Sol.')
    assert.match(r.events[0].message, /^Día 1, 00:00 UTC: alunizaje\./)
  })
  test('las ventanas de comunicación dicen cuánto duran', () => {
    const c = simulate(site(() => 2, (i) => (i >= 10 && i < 16 ? 5 : -5)), explorer, { startIndex: 0, missionDays: 2 })
    assert.equal(c.events.find((e) => e.type === 'contact-open')!.message, 'Día 1, 10:00 UTC: se abre la ventana de comunicación (6 horas).')
  })
  test('en supervivencia no se generan datos', () => {
    const cfg: LanderConfig = { ...explorer }
    const dark = simulate(site(() => -2, () => -2), cfg, { startIndex: 0, missionDays: 1 })
    const k = dark.series.mode.indexOf('survival')
    assert.ok(k > 0)
    const atSurvival = dark.series.dataQueuedMb[k]
    assert.equal(dark.series.dataQueuedMb[k + 1], atSurvival)
  })
})

describe('con los datos de prueba (Mons Mouton, Explorador ligero)', () => {
  const data: SiteData = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'data', 'sites', 'mons-mouton.json'), 'utf8'))
  test('desde el 1 de enero (noche lunar) la misión falla', () => {
    const r = simulate(data, explorer, { startIndex: 0, missionDays: 14 })
    assert.equal(r.summary.survived, false)
  })
  test('desde la mejor fecha (mucha luz) la misión sobrevive', () => {
    const best = bestStartDate({ data, vis: visibility(data) }, 14)!
    const r = simulate(data, explorer, { startIndex: best.startIndex, missionDays: 14 })
    assert.equal(r.summary.survived, true)
    assert.ok(r.summary.dataSentPct > 0)
  })
})
