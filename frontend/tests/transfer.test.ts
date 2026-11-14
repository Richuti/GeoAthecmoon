import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EARTH_GM_KM3_S2, EARTH_RADIUS_KM, MOON_DISTANCE_KM, MOON_RADIUS_KM, lunarTransfer, transferAt } from '../src/sim/transfer.ts'

const orbit = lunarTransfer()
const close = (actual: number, expected: number, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`)

test('la transferencia sale de una órbita de 200 km', () => {
  const s = transferAt(orbit, 0)
  close(s.radiusKm - EARTH_RADIUS_KM, 200)
  close(s.yKm, 0)
  close(s.speedKmS, orbit.departureSpeedKmS)
})

test('la duración y el impulso son los de una transferencia elíptica, no números de animación', () => {
  assert.ok(orbit.durationSeconds / 86400 > 4.8 && orbit.durationSeconds / 86400 < 5.1)
  assert.ok(orbit.injectionDeltaVKmS > 3 && orbit.injectionDeltaVKmS < 3.3)
  close(orbit.durationSeconds, Math.PI * Math.sqrt(orbit.semiMajorKm ** 3 / EARTH_GM_KM3_S2))
})

test('el encuentro ideal termina a 100 km de la superficie lunar, sin atravesar la Luna', () => {
  const s = transferAt(orbit, orbit.durationSeconds)
  close(s.xKm, -orbit.apoapsisKm)
  close(s.yKm, 0)
  close(Math.hypot(s.xKm - s.moonXKm, s.yKm - s.moonYKm) - MOON_RADIUS_KM, 100)
})

test('la Luna se mueve y conserva su distancia circular de referencia', () => {
  const a = transferAt(orbit, 0)
  const b = transferAt(orbit, orbit.durationSeconds)
  assert.notEqual(a.moonYKm, b.moonYKm)
  close(Math.hypot(a.moonXKm, a.moonYKm), MOON_DISTANCE_KM)
})

test('conserva energía y momento angular a lo largo de la transferencia', () => {
  const energy = -EARTH_GM_KM3_S2 / (2 * orbit.semiMajorKm)
  const angularMomentum = orbit.periapsisKm * orbit.departureSpeedKmS
  for (let j = 0; j <= 100; j++) {
    const s = transferAt(orbit, orbit.durationSeconds * j / 100)
    close(s.speedKmS ** 2 / 2 - EARTH_GM_KM3_S2 / s.radiusKm, energy, 1e-9)
    close(s.xKm * s.vyKmS - s.yKm * s.vxKmS, angularMomentum)
    assert.ok(Number.isFinite(s.speedKmS))
  }
})

test('la nave se aleja de la Tierra y pierde velocidad al subir', () => {
  let previous = transferAt(orbit, 0)
  for (let j = 1; j <= 100; j++) {
    const s = transferAt(orbit, orbit.durationSeconds * j / 100)
    assert.ok(s.radiusKm > previous.radiusKm)
    assert.ok(s.speedKmS < previous.speedKmS)
    previous = s
  }
})

test('el tiempo se limita al recorrido, también al retroceder', () => {
  assert.deepEqual(transferAt(orbit, -1), transferAt(orbit, 0))
  assert.deepEqual(transferAt(orbit, orbit.durationSeconds * 2), transferAt(orbit, orbit.durationSeconds))
})

test('cambiar la órbita inicial modifica los cálculos', () => {
  const higher = lunarTransfer(400)
  assert.notEqual(higher.durationSeconds, orbit.durationSeconds)
  assert.notEqual(higher.injectionDeltaVKmS, orbit.injectionDeltaVKmS)
})

test('rechaza parámetros o tiempos inválidos', () => {
  for (const altitude of [0, 199, 2001, NaN, Infinity]) assert.throws(() => lunarTransfer(altitude), RangeError)
  assert.throws(() => transferAt(orbit, NaN), RangeError)
})
