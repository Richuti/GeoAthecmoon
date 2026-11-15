import assert from 'node:assert/strict'
import { test } from 'node:test'
import { journeyAt, lunarTransfer, MOON_RADIUS_KM } from '../src/sim/transfer.ts'
import { LAUNCH_PAD_DECK_M, LAUNCH_SHIP_HEIGHT_M, descentFrame, encounterFrame, launchFrame } from '../src/sim/transferView.ts'

test('la nave parte apoyada en la cubierta y el encuadre conserva el conjunto en móvil', () => {
  for (const aspect of [0.6, 350 / 400, 808 / 448, 2.5]) {
    const frame = launchFrame(0, aspect)
    assert.ok(Math.abs(frame.centerY - LAUNCH_SHIP_HEIGHT_M / 2 - LAUNCH_PAD_DECK_M) < 1e-8)
    const halfHeight = frame.distanceM * Math.tan(21 * Math.PI / 180)
    assert.ok(halfHeight > LAUNCH_SHIP_HEIGHT_M)
    assert.ok(halfHeight * aspect > LAUNCH_SHIP_HEIGHT_M)
  }
})

test('la cámara sigue el ascenso sin discontinuidades ni distancias inválidas', () => {
  let previous = launchFrame(0, 0.8)
  for (let altitude = 100; altitude <= 200000; altitude += 100) {
    const frame = launchFrame(altitude, 0.8)
    assert.ok(Math.abs(frame.centerY - previous.centerY - 100) < 1e-8)
    assert.ok(frame.distanceM >= previous.distanceM)
    assert.ok(frame.distanceM - previous.distanceM <= 8.00001)
    previous = frame
  }
  assert.throws(() => launchFrame(-1, 1), RangeError)
  assert.throws(() => launchFrame(0, 0), RangeError)
})

test('el encuadre de aproximación mantiene a la nave y la Luna visibles en escritorio y móvil', () => {
  const orbit = lunarTransfer()
  for (const aspect of [808 / 448, 350 / 400]) {
    for (let j = 72; j <= 100; j++) {
      const sample = journeyAt(orbit, j / 100)
      // Incluye tanto la escala real de llegada como el realce de la vista general.
      for (const radius of [MOON_RADIUS_KM, MOON_RADIUS_KM * 5]) {
        const shipSize = 100
        const frame = encounterFrame(sample, radius, shipSize, aspect)
        for (const [x, y, extent] of [
          [sample.shipXKm, sample.shipYKm, shipSize / 2],
          [sample.moonXKm, sample.moonYKm, radius],
        ]) {
          const visibleHalfHeight = (frame.distanceKm - extent) * Math.tan(21 * Math.PI / 180)
          assert.ok(Math.abs(x - frame.xKm) + extent < visibleHalfHeight * aspect, `fuera del ancho: ${j} %, aspecto ${aspect}`)
          assert.ok(Math.abs(y - frame.yKm) + extent < visibleHalfHeight, `fuera de la altura: ${j} %, aspecto ${aspect}`)
        }
      }
    }
  }
})


test('el descenso alcanza el suelo sin atravesarlo y conserva el m?dulo en m?vil', () => {
  for (const aspect of [0.6, 1, 2.5]) {
    let previous = 3
    for (let step = 0; step <= 100; step++) {
      const frame = descentFrame(step / 100, aspect)
      assert.ok(frame.altitudeKm <= previous && frame.altitudeKm >= 0)
      assert.ok(frame.distanceKm * Math.tan(22.5 * Math.PI / 180) * aspect > 0.1)
      previous = frame.altitudeKm
    }
    assert.equal(descentFrame(1, aspect).altitudeKm, 0)
    assert.deepEqual(descentFrame(2, aspect), descentFrame(1, aspect))
    assert.deepEqual(descentFrame(-1, aspect), descentFrame(0, aspect))
  }
  for (const aspect of [0, -1, NaN]) assert.throws(() => descentFrame(0, aspect), RangeError)
  assert.throws(() => descentFrame(NaN, 1), RangeError)
})
