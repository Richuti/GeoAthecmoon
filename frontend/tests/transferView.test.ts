import assert from 'node:assert/strict'
import { test } from 'node:test'
import { journeyAt, lunarTransfer, MOON_RADIUS_KM } from '../src/sim/transfer.ts'
import { DUST_ONSET_KM, DUST_SETTLE, LAUNCH_PAD_DECK_M, LAUNCH_SHIP_HEIGHT_M, TOUCHDOWN, descentFrame, encounterFrame, launchFrame } from '../src/sim/transferView.ts'

test('la nave parte apoyada en la cubierta y el encuadre conserva el conjunto en móvil', () => {
  for (const aspect of [0.6, 350 / 400, 808 / 448, 2.5]) {
    const frame = launchFrame(0, aspect)
    assert.ok(Math.abs(frame.centerY - LAUNCH_SHIP_HEIGHT_M / 2 - LAUNCH_PAD_DECK_M) < 1e-8)
    const halfHeight = frame.distanceM * Math.tan(21 * Math.PI / 180)
    assert.ok(halfHeight > 90)
    assert.ok(halfHeight * aspect > 90)
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
    assert.equal(descentFrame(TOUCHDOWN, aspect).altitudeKm, 0)
    assert.deepEqual(descentFrame(2, aspect), descentFrame(1, aspect))
    assert.deepEqual(descentFrame(-1, aspect), descentFrame(0, aspect))
  }
  for (const aspect of [0, -1, NaN]) assert.throws(() => descentFrame(0, aspect), RangeError)
  assert.throws(() => descentFrame(NaN, 1), RangeError)
})

test('durante el ascenso la cámara no se aleja tanto que el cohete desaparezca', async () => {
  const { LAUNCH_CHASE_MAX_M } = await import('../src/sim/transferView.ts')
  for (const altitude of [10000, 65000, 200000]) assert.ok(launchFrame(altitude, 1.6).distanceM <= Math.max(LAUNCH_CHASE_MAX_M, 260))
})

test('la salida encuadra la Tierra entera y la nave', async () => {
  const { departureFrame } = await import('../src/sim/transferView.ts')
  const orbit = lunarTransfer()
  for (const aspect of [0.46, 1.8]) {
    for (const p of [0.12, 0.13, 0.16, 0.2]) {
      const s = journeyAt(orbit, p)
      const f = departureFrame(s, 6378.1, aspect)
      const halfH = f.distanceKm * Math.tan(21 * Math.PI / 180)
      for (const [x, y, r] of [[0, 0, 6378.1], [s.shipXKm, s.shipYKm, 0]]) {
        assert.ok(Math.abs(y - f.yKm) + r <= halfH + 1e-6, `alto ${p} ${aspect}`)
        assert.ok(Math.abs(x - f.xKm) + r <= halfH * aspect + 1e-6, `ancho ${p} ${aspect}`)
      }
    }
  }
})

test('la vista general contiene toda la trayectoria y el recorrido de la Luna', async () => {
  const { overviewFrame } = await import('../src/sim/transferView.ts')
  const { transferAt } = await import('../src/sim/transfer.ts')
  const orbit = lunarTransfer()
  for (const aspect of [0.46, 1.8]) {
    const f = overviewFrame(orbit, aspect, 6378.1 * 4, MOON_RADIUS_KM * 5)
    const halfH = f.distanceKm * Math.tan(21 * Math.PI / 180)
    for (let j = 0; j <= 50; j++) {
      const s = transferAt(orbit, orbit.durationSeconds * j / 50)
      for (const [x, y] of [[s.xKm, s.yKm], [s.moonXKm, s.moonYKm]]) {
        assert.ok(Math.abs(x - f.xKm) <= halfH * aspect && Math.abs(y - f.yKm) <= halfH, `${j} ${aspect}`)
      }
    }
  }
})

test('la escala de tiempo convierte la duración real en segundos de pantalla', async () => {
  const { transferPlaybackSeconds, TIME_SCALES_H_PER_S } = await import('../src/sim/transfer.ts')
  const orbit = lunarTransfer()
  const hours = orbit.durationSeconds / 3600
  for (const k of TIME_SCALES_H_PER_S) assert.ok(Math.abs(transferPlaybackSeconds(orbit, k) * k - hours) < 1e-9)
  assert.throws(() => transferPlaybackSeconds(orbit, 0), RangeError)
})

test('el polvo solo aparece cerca del suelo y cae enseguida al apagar el motor (no hay aire)', () => {
  assert.equal(descentFrame(0, 1).dust, 0)
  assert.equal(descentFrame(0.5, 1).dust, 0)
  // Justo antes del contacto el chorro levanta polvo y el motor está encendido.
  const before = descentFrame(TOUCHDOWN - 0.002, 1)
  assert.ok(before.altitudeKm < DUST_ONSET_KM && before.dust > 0.9 && before.engine === 1 && !before.touched)
  // Tras el contacto: motor apagado y el polvo desaparece en DUST_SETTLE.
  const after = descentFrame(TOUCHDOWN + DUST_SETTLE / 2, 1)
  assert.ok(after.touched && after.engine === 0 && after.dust > 0 && after.dust < 1)
  assert.ok(descentFrame(TOUCHDOWN + DUST_SETTLE, 1).dust < 1e-9)
  assert.equal(descentFrame(1, 1).dust, 0)
})

test('la esfera de influencia lunar mide unos 66 000 km (masas de JPL)', async () => {
  const { MOON_SOI_KM } = await import('../src/sim/transfer.ts')
  assert.ok(MOON_SOI_KM > 66000 && MOON_SOI_KM < 66300, String(MOON_SOI_KM))
})
