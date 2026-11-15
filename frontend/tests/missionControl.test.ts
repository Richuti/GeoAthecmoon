import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { contactSeries, litSeries } from '../src/lib/visibility.ts'
import { rescueOptions } from '../src/sim/incident.ts'
import { PRESETS } from '../src/sim/lander.ts'
import { controlFeed, controlMessage, fixText, type ControlContext } from '../src/sim/missionControl.ts'
import { seriesOf } from '../src/sim/search.ts'
import { simulate } from '../src/sim/simulate.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 30 * 24

function site(id: string, dark: (i: number) => boolean, earthUp: (i: number) => boolean = () => true): SiteData {
  return {
    site: { id, name: id.toUpperCase(), lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array(360).fill(0) },
    slope: { atSiteDeg: 0, max100mDeg: 1 },
    sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (dark(i) ? -2 : 2)) },
    earth: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (earthUp(i) ? 5 : -5)) },
  }
}

/** «a»: Sol las primeras 10 h y después un día de sombra (falla). «b»: siempre con Sol. Tierra a ratos en «a». */
function context(): ControlContext {
  const a = site('a', (i) => i >= 10 && i < 34, (i) => i < 6 || i > 20)
  const b = site('b', () => false)
  const sites = [a, b].map((data) => ({ data, series: seriesOf(data) }))
  const result = simulate(a, explorer, { startIndex: 0, missionDays: 3 }, sites[0].series)
  assert.equal(result.summary.survived, false)
  const options = rescueOptions({ data: a, cfg: explorer, startIndex: 0, missionDays: 3, sites }, sites[0].series)
  const fix = options.reduce((x, o) => (!x || o.summary.dataSentMb > x.summary.dataSentMb ? o : x), options[0] ?? null)
  return { data: a, result, lit: litSeries(a), contact: contactSeries(a), survivalThreshold: explorer.survivalThreshold, fix }
}

describe('control de misión', () => {
  test('cuando el Sol se oculta y la batería no alcanza, dice cuándo falla y cómo resolverlo', () => {
    const ctx = context()
    const sunset = ctx.result.events.find((e) => e.type === 'sun-set')!
    const m = controlMessage(ctx, sunset)!
    assert.equal(m.tone, 'fail')
    assert.equal(m.problem, 'El Sol se oculta tras el relieve.')
    assert.match(m.response, /sombra de 1 día/)
    assert.match(m.response, /no alcanza/)
    assert.match(m.response, /Así lo resolvemos: alunizar en B/)
  })

  test('la falla responde con la mejor salida simulada y sus datos', () => {
    const ctx = context()
    const fail = ctx.result.events.find((e) => e.type === 'failure')!
    const m = controlMessage(ctx, fail)!
    assert.equal(m.tone, 'fail')
    assert.match(m.response, /sobrevive y envía \d+\.\d Gb/)
    assert.equal(fixText({ ...ctx, fix: null }).startsWith('Con este módulo no hay'), true)
  })

  test('al perder la Tierra dice cuántos datos esperan y cuándo vuelve', () => {
    const ctx = context()
    const close = ctx.result.events.find((e) => e.type === 'contact-close')!
    const m = controlMessage(ctx, close)!
    assert.equal(m.problem, 'Perdemos contacto con la Tierra.')
    assert.match(m.response, /Gb en espera\)\. La Tierra vuelve en 15 horas/)
  })

  test('el registro va del suceso más reciente al más antiguo, solo hasta el momento actual', () => {
    const ctx = context()
    const feed = controlFeed(ctx, 12)
    assert.ok(feed.length >= 2)
    assert.ok(feed.every((m) => m.index <= 12))
    assert.ok(feed[0].index >= feed[feed.length - 1].index)
    assert.equal(feed.at(-1)!.problem, 'Alunizaje en A.')
  })
})

describe('control de misión · modo ahorro', () => {
  test('el consumo baja de verdad al apagar los instrumentos', () => {
    const ctx = context()
    const save = ctx.result.events.find((e) => e.type === 'survival')
    if (!save) return
    const m = controlMessage(ctx, save)!
    const [, from, to] = m.response.match(/de (\d+) W a (\d+) W/)!
    assert.ok(Number(to) < Number(from), m.response)
  })
})
