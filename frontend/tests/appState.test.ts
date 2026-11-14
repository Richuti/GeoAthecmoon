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

describe('reproducción de la misión', () => {
  const mission = () => reducer(loaded(), { type: 'play/range', range: { from: 24, to: 48 } })
  test('al fijar la ventana coloca el cursor dentro de la misión', () => {
    assert.equal(mission().index, 24)
  })
  test('se detiene en la última muestra sin avanzar fuera de la misión', () => {
    const s = { ...mission(), index: 46, playing: true }
    const end = reducer(s, { type: 'time/step', by: 6 })
    assert.equal(end.index, 47)
    assert.equal(end.playing, false)
  })
  test('play desde el final repite desde el alunizaje', () => {
    const s = reducer({ ...mission(), index: 47 }, { type: 'play', playing: true })
    assert.equal(s.index, 24)
    assert.equal(s.playing, true)
  })
  test('una misión fallida se detiene en la muestra de falla', () => {
    const s = reducer(loaded(), { type: 'play/range', range: { from: 100, to: 101 } })
    const end = reducer({ ...s, playing: true }, { type: 'time/step', by: 1 })
    assert.equal(end.index, 100)
    assert.equal(end.playing, false)
  })
  test('cambiar de modo pausa y devuelve el periodo completo', () => {
    const s = reducer({ ...mission(), playing: true }, { type: 'mode', mode: 'explore' })
    assert.equal(s.playbackRange, null)
    assert.equal(s.playing, false)
    assert.equal(reducer({ ...s, index: 47 }, { type: 'time/step', by: 1 }).index, 48)
  })
  test('cambiar de sitio elimina la ventana anterior y pausa', () => {
    const s = reducer({ ...mission(), playing: true }, { type: 'select', id: 'another' })
    assert.equal(s.playbackRange, null)
    assert.equal(s.playing, false)
  })
})

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
