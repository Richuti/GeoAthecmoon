import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { initialState, reducer, type AppState } from '../src/state/appState.ts'
import type { SiteData } from '../src/types.ts'

const data = (id: string, n: number): SiteData => ({
  site: { id, name: id, lat: -89, lon: 0, category: 'custom' },
  start: '2027-01-01T00:00:00Z',
  stepHours: 1,
  horizon: { azimuthStepDeg: 1, elevationDeg: [] },
  slope: { atSiteDeg: 0, max100mDeg: 0 },
  sun: { az: Array(n).fill(0), el: Array(n).fill(0) },
  earth: { az: Array(n).fill(0), el: Array(n).fill(0) },
})

const loaded = (): AppState =>
  [
    { type: 'list/loaded' as const, sites: [data('shackleton-rim', 1).site] },
    { type: 'site/loaded' as const, data: data('shackleton-rim', 1440) },
  ].reduce(reducer, initialState)

describe('duración de la misión', () => {
  test('por defecto son 14 días', () => assert.equal(initialState.missionDays, 14))
  test('se puede cambiar', () => assert.equal(reducer(loaded(), { type: 'missionDays', days: 28 }).missionDays, 28))
  test('se redondea a días enteros', () => assert.equal(reducer(loaded(), { type: 'missionDays', days: 6.6 }).missionDays, 7))
  test('mínimo 1 día', () => assert.equal(reducer(loaded(), { type: 'missionDays', days: 0 }).missionDays, 1))
  test('máximo la duración del periodo (60 días)', () => assert.equal(reducer(loaded(), { type: 'missionDays', days: 400 }).missionDays, 60))
  test('sin cambios devuelve el mismo estado', () => {
    const s = loaded()
    assert.equal(reducer(s, { type: 'missionDays', days: 14 }), s)
  })
})
