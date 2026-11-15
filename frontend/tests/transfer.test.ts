import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EARTH_GM_KM3_S2, EARTH_RADIUS_KM, LAUNCH_END, MOON_DISTANCE_KM, MOON_RADIUS_KM, journeyAt, lunarTransfer, transferAt } from '../src/sim/transfer.ts'

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

test('ascenso y transferencia comparten un reloj sin salto de posición al salir de órbita', () => {
  const surface = journeyAt(orbit, 0)
  const before = journeyAt(orbit, LAUNCH_END - 1e-10)
  const orbital = journeyAt(orbit, LAUNCH_END)
  close(surface.shipXKm, EARTH_RADIUS_KM)
  assert.equal(before.launch, true)
  assert.equal(orbital.launch, false)
  close(before.shipXKm, orbital.shipXKm)
  close(before.shipYKm, orbital.shipYKm)
  close(before.moonXKm, orbital.moonXKm)
  close(before.moonYKm, orbital.moonYKm)
  assert.equal(orbital.seconds, 0)
})

test('avance, nave y Luna comparten el instante al avanzar, retroceder y repetir', () => {
  for (const progress of [0, .5, .95, 1, .8, .3, 0]) {
    const s = journeyAt(orbit, progress)
    const expected = transferAt(orbit, s.seconds)
    close(s.moonXKm, expected.moonXKm)
    close(s.moonYKm, expected.moonYKm)
    if (!s.launch) {
      close(s.shipXKm, expected.xKm)
      close(s.shipYKm, expected.yKm)
    }
  }
  const arrival = journeyAt(orbit, 1)
  close(Math.hypot(arrival.shipXKm - arrival.moonXKm, arrival.shipYKm - arrival.moonYKm) - MOON_RADIUS_KM, 100)
  assert.deepEqual(journeyAt(orbit, -1), journeyAt(orbit, 0))
  assert.deepEqual(journeyAt(orbit, 2), arrival)
  assert.throws(() => journeyAt(orbit, NaN), RangeError)
})
