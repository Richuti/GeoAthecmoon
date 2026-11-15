import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MOON_GM_KM3_S2, MOON_RADIUS_KM, MOON_SOI_KM, lunarTransfer, transferAt } from '../src/sim/transfer.ts'
import {
  APOLLO_LM, FINAL_DESCENT_MS, G0_M_S2, PDI_ALT_KM, coastAltitudeKm, descentAt, descentOrbit, earthMoonDistanceKm,
  hyperbolicSpeedKmS, lunarCapture, poweredDescent,
} from '../src/sim/lunarArrival.ts'

const near = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, msg ?? `${a} ≉ ${b} (±${tol})`)

test('la transferencia llega a la distancia real de la Luna y dura más si está más lejos', () => {
  const perigee = lunarTransfer(200, 363300), apogee = lunarTransfer(200, 405500)
  assert.equal(perigee.moonDistanceKm, 363300)
  assert.equal(perigee.apoapsisKm, 363300 - MOON_RADIUS_KM - 100)
  assert.ok(apogee.durationSeconds > perigee.durationSeconds)
  // La Luna dibujada está a la distancia de la órbita.
  const end = transferAt(apogee, apogee.durationSeconds)
  near(Math.hypot(end.moonXKm, end.moonYKm), 405500, 1e-6)
  assert.throws(() => lunarTransfer(200, 100000), RangeError)
})

test('captura lunar: cifras del orden de las misiones Apolo', () => {
  const c = lunarCapture(lunarTransfer(200))
  near(c.moonSpeedKmS, 1.02, 0.03)
  near(c.vInfinityKmS, 0.84, 0.1)
  near(c.loiDeltaVKmS, 0.85, 0.1) // Apolo 11: LOI-1 de unos 0.89 km/s
  near(c.orbitPeriodSeconds / 60, 117.8, 0.5) // órbita de 100 km: ~2 h
  near(c.periapsisSpeedKmS - c.circularSpeedKmS, c.loiDeltaVKmS, 1e-12)
  assert.ok(c.hyperbolaEccentricity > 1)
  // Conservación de energía en la hipérbola.
  const energy = (v: number, r: number) => v * v / 2 - MOON_GM_KM3_S2 / r
  near(energy(c.soiSpeedKmS, MOON_SOI_KM), energy(c.periapsisSpeedKmS, MOON_RADIUS_KM + 100), 1e-9)
  near(energy(c.soiSpeedKmS, MOON_SOI_KM), c.vInfinityKmS ** 2 / 2, 1e-9)
  // De la esfera de influencia al periapsis: horas, no días.
  assert.ok(c.soiToPeriapsisSeconds > 10 * 3600 && c.soiToPeriapsisSeconds < 24 * 3600)
})

test('la velocidad respecto a la Luna crece al acercarse', () => {
  const v = 0.8
  assert.ok(hyperbolicSpeedKmS(v, 2000) > hyperbolicSpeedKmS(v, 20000))
  near(hyperbolicSpeedKmS(v, 1e12), v, 1e-6)
  assert.throws(() => hyperbolicSpeedKmS(v, 0), RangeError)
})

test('órbita de descenso de 100 × 15 km', () => {
  const o = descentOrbit()
  near(o.doiDeltaVKmS * 1000, 19.5, 1) // Apolo: ~20 m/s
  near(o.coastSeconds / 60, 56.9, 1)
  near(coastAltitudeKm(o, 0), 100, 1e-6)
  near(coastAltitudeKm(o, o.coastSeconds), PDI_ALT_KM, 1e-6)
  let previous = Infinity
  for (let k = 0; k <= 20; k++) {
    const h = coastAltitudeKm(o, (o.coastSeconds * k) / 20)
    assert.ok(h <= previous + 1e-9)
    previous = h
  }
  assert.throws(() => descentOrbit(10, 15), RangeError)
})

test('descenso propulsado del módulo lunar Apolo: llega al suelo suave y con propelente de sobra', () => {
  const d = poweredDescent()
  const last = d.samples[d.samples.length - 1]
  near(last.altitudeKm, 0, 1e-9)
  near(last.verticalSpeedMS, -FINAL_DESCENT_MS, 0.05)
  near(last.horizontalSpeedMS, 0, 0.05)
  near(d.touchdownSpeedMS, FINAL_DESCENT_MS, 0.05)
  // Del orden del Apolo 11: unos 12 min, ~480 km y ~2 km/s.
  assert.ok(d.durationSeconds > 400 && d.durationSeconds < 900, `${d.durationSeconds}`)
  near(d.downrangeKm, 480, 60)
  near(d.deltaVKmS, 1.9, 0.15)
  assert.ok(d.propellantLeftKg > 0)
  // Balance de masa y ecuación del cohete.
  near(d.doiPropellantKg + d.propellantUsedKg + d.propellantLeftKg, APOLLO_LM.descentPropellantKg, 1e-6)
  const m0 = APOLLO_LM.massKg - d.doiPropellantKg
  near(d.deltaVKmS * 1000, APOLLO_LM.ispS * G0_M_S2 * Math.log(m0 / (m0 - d.propellantUsedKg)), 1e-6)
  // La altura nunca sube y el empuje respeta los límites del motor.
  for (let k = 1; k < d.samples.length; k++) assert.ok(d.samples[k].altitudeKm <= d.samples[k - 1].altitudeKm + 1e-9)
  for (const s of d.samples.slice(0, -1)) assert.ok(s.throttle >= APOLLO_LM.minThrottle - 1e-9 && s.throttle <= 1 + 1e-9)
})

test('el estado del descenso se interpola entre muestras', () => {
  const d = poweredDescent()
  const a = descentAt(d, 0), b = descentAt(d, d.durationSeconds), mid = descentAt(d, d.durationSeconds / 2)
  near(a.altitudeKm, PDI_ALT_KM, 1e-9)
  near(b.altitudeKm, 0, 1e-6)
  assert.ok(mid.altitudeKm < a.altitudeKm && mid.altitudeKm > 0)
  assert.ok(mid.propellantKg < a.propellantKg && mid.propellantKg > b.propellantKg)
})

test('rechaza una nave que no puede frenar', () => {
  assert.throws(() => poweredDescent({ ...APOLLO_LM, maxThrustN: 5000 }), RangeError)
  assert.throws(() => poweredDescent({ ...APOLLO_LM, descentPropellantKg: 3000 }), RangeError)
  assert.throws(() => poweredDescent({ ...APOLLO_LM, massKg: 100 }), RangeError)
})

test('distancia entre centros a partir de lo que ve el sitio', () => {
  // Tierra en el cenit: se suma el radio lunar; en el horizonte, Pitágoras.
  near(earthMoonDistanceKm(380000, 90), 380000 + MOON_RADIUS_KM, 1e-6)
  near(earthMoonDistanceKm(380000, 0), Math.hypot(380000, MOON_RADIUS_KM), 1e-6)
  assert.throws(() => earthMoonDistanceKm(100, 0), RangeError)
})
