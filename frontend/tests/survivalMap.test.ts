import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { PRESETS } from '../src/sim/lander.ts'
import { scanStarts, seriesOf, type StartResult } from '../src/sim/search.ts'
import { dailySurvival, dayState, rowSummary, safeRunFrom, stateRuns } from '../src/sim/survivalMap.ts'
import type { SiteData } from '../src/types.ts'

const r = (startIndex: number, survived: boolean): StartResult => ({ startIndex, survived, minSocPct: 50, marginKWh: 1, dataSentPct: 100 })
const period = (days: number) => ({ stepHours: 1, sun: { az: [], el: Array(days * 24).fill(0) } })

describe('mapa de supervivencia', () => {
  test('agrupa los inicios por día y guarda los que sobreviven', () => {
    const cells = dailySurvival(period(3), [r(0, true), r(6, true), r(12, false), r(18, true), r(24, false), r(30, false)])
    assert.equal(cells.length, 3)
    assert.deepEqual(cells[0], { total: 4, ok: 3, starts: [0, 6, 18] })
    assert.deepEqual(cells[1], { total: 2, ok: 0, starts: [] })
    assert.deepEqual(cells[2], { total: 0, ok: 0, starts: [] })
    assert.deepEqual(cells.map(dayState), ['partial', 'fail', 'none'])
  })

  test('rachas y resumen: solo cuentan los días con todos los horarios a salvo', () => {
    const safe = { total: 4, ok: 4, starts: [0] }
    const fail = { total: 4, ok: 0, starts: [] }
    const none = { total: 0, ok: 0, starts: [] }
    const cells = [safe, safe, fail, safe, safe, safe, none]
    assert.equal(safeRunFrom(cells, 0), 2)
    assert.equal(safeRunFrom(cells, 2), 0)
    assert.equal(safeRunFrom(cells, 3), 3)
    assert.deepEqual(rowSummary(cells), { safeDays: 5, testedDays: 6, longest: { start: 3, length: 3 } })
    assert.deepEqual(stateRuns(cells), [
      { start: 0, end: 2, state: 'safe' }, { start: 2, end: 3, state: 'fail' }, { start: 3, end: 6, state: 'safe' }, { start: 6, end: 7, state: 'none' },
    ])
  })

  test('con el simulador real: una noche larga a mitad del periodo deja días rojos antes de ella', () => {
    const N = 20 * 24
    const d: SiteData = {
      site: { id: 'x', name: 'x', lat: -89, lon: 0, category: 'custom' },
      start: '2027-01-01T00:00:00Z',
      stepHours: 1,
      horizon: { azimuthStepDeg: 1, elevationDeg: Array(360).fill(0) },
      slope: { atSiteDeg: 0, max100mDeg: 0 },
      sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (i >= 10 * 24 && i < 11 * 24 ? -2 : 2)) },
      earth: { az: Array(N).fill(0), el: Array(N).fill(5) },
    }
    const cells = dailySurvival(d, scanStarts(d, PRESETS.explorer.config, 3, seriesOf(d)))
    assert.equal(dayState(cells[0]), 'safe')
    assert.equal(dayState(cells[9]), 'fail')
    assert.equal(dayState(cells[12]), 'safe')
    assert.equal(dayState(cells[19]), 'none')
  })
})
