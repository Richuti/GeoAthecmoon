import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { DEFAULT_DELAY_DAYS, failureCause, planDelayIncident } from '../src/sim/incident.ts'
import { PRESETS } from '../src/sim/lander.ts'
import { delayTolerance, seriesOf } from '../src/sim/search.ts'
import { simulate } from '../src/sim/simulate.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 40 * 24

/** 40 días: el Sol se ve mientras `sunUp(i)` (azimut 225°, rumbo SO); la Tierra siempre. */
function site(id: string, sunUp: (i: number) => boolean): SiteData {
  return {
    site: { id, name: id, lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: {
      azimuthStepDeg: 1,
      elevationDeg: Array.from({ length: 360 }, () => 1),
      distanceKm: Array.from({ length: 360 }, (_, az) => (az === 225 ? 12.5 : 3)),
      obstacleHeightM: Array.from({ length: 360 }, (_, az) => (az === 225 ? 400 : 50)),
    },
    slope: { atSiteDeg: 0, max100mDeg: 0 },
    sun: { az: Array(N).fill(225), el: Array.from({ length: N }, (_, i) => (sunUp(i) ? 3 : -1)) },
    earth: { az: Array(N).fill(0), el: Array(N).fill(5) },
  }
}

describe('planDelayIncident con datos sintéticos', () => {
  test('siempre con Sol: ningún atraso la rompe y se muestra el atraso por defecto', () => {
    const d = site('a', () => true)
    const inc = planDelayIncident({ data: d, cfg: explorer, startIndex: 0, missionDays: 7, sites: [{ data: d }] })!
    assert.equal(inc.breaksMission, false)
    assert.equal(inc.delayHours, DEFAULT_DELAY_DAYS * 24)
    assert.equal(inc.delayed.survived, true)
    assert.equal(inc.cause, null)
    assert.deepEqual(inc.options, [])
  })
  test('si el plan original ya falla, no hay imprevisto', () => {
    const d = site('a', () => false)
    assert.equal(planDelayIncident({ data: d, cfg: explorer, startIndex: 0, missionDays: 7, sites: [{ data: d }] }), null)
  })

  // Sol hasta el día 12, noche de 10 días, Sol de nuevo desde el día 22. Una misión de 7 días que empieza el día 0
  // sobrevive; atrasada, la noche la alcanza y falla.
  const night = (i: number) => i < 12 * 24 || i >= 22 * 24
  const d = site('a', night)
  const always = site('b', () => true)
  const inc = planDelayIncident({ data: d, cfg: explorer, startIndex: 0, missionDays: 7, sites: [{ data: d }, { data: always }] })!

  test('el atraso es el primero que hace fallar la misión', () => {
    const tol = delayTolerance(d, explorer, 0, 7)
    assert.equal(inc.breaksMission, true)
    assert.equal(inc.delayHours, tol.days * 24 + 6)
    assert.equal(inc.original.survived, true)
    assert.equal(inc.delayed.survived, false)
    assert.equal(simulate(d, explorer, { startIndex: inc.delayedStart - 6, missionDays: 7 }).summary.survived, true)
  })
  test('la causa es la puesta de Sol del día 12, tras la cresta del SO a 12.5 km', () => {
    assert.equal(inc.cause?.sunsetIndex, 12 * 24)
    assert.equal(inc.cause?.shadowHours, 10 * 24)
    assert.equal(inc.cause?.compass, 'SO')
    assert.equal(inc.cause?.ridgeKm, 12.5)
    assert.equal(inc.cause?.ridgeHeightM, 400)
    assert.equal(inc.cause?.ridgeElevationDeg, 1)
  })
  test('las tres salidas sobreviven y se pueden volver a simular con el mismo resultado', () => {
    assert.deepEqual(inc.options.map((o) => o.kind).sort(), ['site', 'wait'].concat(inc.options.some((o) => o.kind === 'save') ? ['save'] : []).sort())
    for (const o of inc.options) {
      const data = o.siteId === 'b' ? always : d
      const again = simulate(data, o.cfg, { startIndex: o.startIndex, missionDays: 7 }).summary
      assert.equal(again.survived, true)
      assert.deepEqual(again, o.summary)
    }
  })
  test('esperar: la primera llegada que sobrevive, después de la atrasada', () => {
    const wait = inc.options.find((o) => o.kind === 'wait')!
    assert.ok(wait.startIndex > inc.delayedStart)
    assert.equal(simulate(d, explorer, { startIndex: wait.startIndex - 6, missionDays: 7 }).summary.survived, false)
    assert.equal(wait.waitDays, (wait.startIndex - inc.delayedStart) / 24)
  })
  test('cambiar de sitio: la misma llegada atrasada en otro sitio', () => {
    const other = inc.options.find((o) => o.kind === 'site')!
    assert.equal(other.siteId, 'b')
    assert.equal(other.startIndex, inc.delayedStart)
  })
  test('ahorrar energía baja el consumo y los datos en la misma proporción', () => {
    const save = inc.options.find((o) => o.kind === 'save')
    if (!save) return
    assert.ok(save.instrumentShare! < 1)
    assert.equal(save.cfg.instrumentLoadW, explorer.instrumentLoadW * save.instrumentShare!)
    assert.equal(save.cfg.dataPerDayMb, explorer.dataPerDayMb * save.instrumentShare!)
    assert.equal(save.cfg.baseLoadW, explorer.baseLoadW)
  })
})

describe('failureCause', () => {
  test('si aterriza a oscuras, no hay puesta y la sombra empieza en el alunizaje', () => {
    const d = site('a', (i) => i >= 30)
    const c = failureCause(d, 0, 20, seriesOf(d))
    assert.equal(c.sunsetIndex, null)
    assert.equal(c.shadowHours, 30)
  })
})

describe('con los datos reales: el caso de la demo (Malapert, 15 ene 2027, Explorador ligero)', () => {
  const dir = join(import.meta.dirname, '..', 'public', 'data', 'sites')
  const sites = readdirSync(dir).map((f) => ({ data: JSON.parse(readFileSync(join(dir, f), 'utf8')) as SiteData }))
  const data = sites.find((s) => s.data.site.id === 'malapert-massif')!.data
  const start = (Date.parse('2027-01-15T00:00:00Z') - Date.parse(data.start)) / 3_600_000
  const inc = planDelayIncident({ data, cfg: explorer, startIndex: start, missionDays: 14, sites })!

  test('un atraso de 4.5 días hace fallar la misión', () => {
    assert.equal(inc.original.survived, true)
    assert.equal(inc.delayHours, 4.5 * 24)
    assert.equal(inc.delayed.survived, false)
  })
  test('falla por la puesta de Sol al SO seguida de más de una semana de sombra', () => {
    assert.equal(inc.cause?.compass, 'SO')
    assert.ok(inc.cause!.shadowHours > 168)
  })
  test('salidas: esperar al 11 de febrero, cambiar de sitio o encender menos instrumentos', () => {
    const wait = inc.options.find((o) => o.kind === 'wait')!
    assert.ok(new Date(Date.parse(data.start) + wait.startIndex * 3_600_000).toISOString().startsWith('2027-02-11'))
    assert.ok(inc.options.some((o) => o.kind === 'site' && o.siteId !== 'malapert-massif'))
    assert.ok(inc.options.some((o) => o.kind === 'save'))
    for (const o of inc.options) assert.equal(o.summary.survived, true)
  })
})
