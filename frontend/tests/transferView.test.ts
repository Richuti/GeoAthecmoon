import assert from 'node:assert/strict'
import { test } from 'node:test'
import { journeyAt, lunarTransfer, MOON_RADIUS_KM } from '../src/sim/transfer.ts'
import { encounterFrame } from '../src/sim/transferView.ts'

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
