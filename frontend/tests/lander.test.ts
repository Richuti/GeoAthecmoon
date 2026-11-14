import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  MIN_SOC,
  PRESETS,
  autonomyHours,
  clampConfig,
  minSunFraction,
  nominalLoadW,
  panelPeakW,
  validateConfig,
  type LanderConfig,
} from '../src/sim/lander.ts'

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b} y dio ${a}`)
const explorer = PRESETS.explorer.config

describe('panel', () => {
  test('potencia pico = 1361 × área × eficiencia', () => close(panelPeakW(explorer), 1361 * 0.75 * 0.3))
  test('presets: ≈306, ≈817 y ≈204 W', () => {
    assert.equal(Math.round(panelPeakW(PRESETS.explorer.config)), 306)
    assert.equal(Math.round(panelPeakW(PRESETS.station.config)), 817)
    assert.equal(Math.round(panelPeakW(PRESETS.rover.config)), 204)
  })
})

describe('batería', () => {
  test('el mínimo es 20 %', () => close(MIN_SOC, 0.2))
  test('autonomía sin Sol (nominal del 100 al 40 %, supervivencia del 40 al 20 %)', () => {
    // 3 kWh: 0.6·3000·0.9/150 + 0.2·3000·0.9/60 = 10.8 + 9 = 19.8 h
    close(autonomyHours(explorer), 19.8)
  })
  test('más batería, más autonomía', () => assert.ok(autonomyHours({ ...explorer, batteryKWh: 6 }) > autonomyHours(explorer)))
})

describe('Sol mínimo necesario', () => {
  test('balance con pérdidas de carga y descarga', () => {
    // P = 306.2, L = 150. Sombra: 150/0.9 = 166.7; sobra con Sol: 156.2·0.9 = 140.6 → 166.7/307.2 ≈ 0.5425
    const p = panelPeakW(explorer)
    const expected = 150 / 0.9 / ((p - 150) * 0.9 + 150 / 0.9)
    close(minSunFraction(explorer), expected)
  })
  test('si el panel no cubre el consumo ni con Sol pleno: Infinity', () =>
    assert.equal(minSunFraction({ ...explorer, panelAreaM2: 0.1 }), Infinity))
  test('consumo nominal = base + instrumentos', () => assert.equal(nominalLoadW(explorer), 150))
})

describe('validación', () => {
  test('los presets son válidos', () => {
    for (const p of Object.values(PRESETS)) assert.deepEqual(validateConfig(p.config), [], p.id)
  })
  test('detecta valores fuera de rango', () => {
    const bad: LanderConfig = { ...explorer, panelEfficiency: 0.9, batteryKWh: -1 }
    const problems = validateConfig(bad)
    assert.equal(problems.length, 2)
    assert.match(problems.join(' '), /La eficiencia del panel debe estar entre/)
  })
  test('detecta valores que no son números', () =>
    assert.match(validateConfig({ ...explorer, baseLoadW: Number.NaN }).join(' '), /no es un número/))
  test('clampConfig lleva todo al rango', () => {
    const c = clampConfig({ ...explorer, panelEfficiency: 0.9, batteryKWh: -1, baseLoadW: Number.NaN })
    assert.deepEqual(validateConfig(c), [])
  })
})
