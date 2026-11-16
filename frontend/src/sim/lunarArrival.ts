// Llegada a la Luna: captura en órbita lunar, órbita de descenso y descenso propulsado hasta el suelo.
//
// Constantes:
// - GM de la Tierra y la Luna: JPL DE440, https://ssd.jpl.nasa.gov/astro_par.html (en transfer.ts).
// - Radio lunar medio y semieje de la órbita lunar: NASA NSSDC Moon Fact Sheet.
// - Gravedad estándar g0 = 9.80665 m/s² (definición del sistema SI, usada para el impulso específico).
// - Nave de referencia: módulo lunar del Apolo 11 (NASA NSSDC 1969-059C y datos del motor de descenso, LMDE):
//   masa total 15 103 kg, de ellos 8 248 kg de propelente de descenso; empuje máximo 45.04 kN,
//   regulable hasta el 10 %; impulso específico 311 s.
//
// Modelo:
// - Cónicas empalmadas (patched conics): la nave llega al apogeo de la transferencia a la distancia de la Luna;
//   la velocidad relativa a la Luna es la diferencia de velocidades, en el mismo plano.
// - Dentro de la esfera de influencia lunar, hipérbola de dos cuerpos alrededor de la Luna con periapsis a 100 km.
//   El frenado en el periapsis deja a la nave en órbita circular polar de 100 km: una órbita polar pasa sobre el
//   polo sur en cada vuelta, así que el sitio queda al alcance sin cambiar el plano.
// - Impulso de descenso (DOI): de la órbita de 100 km a una elipse de 100 × 15 km; se cae libremente media vuelta.
// - Descenso propulsado desde 15 km: integración numérica (RK4, paso de 0.1 s) en coordenadas polares con la
//   gravedad lunar μ/r², la fuerza centrífuga de la órbita, el empuje y la pérdida de masa por consumo.
//   La guía es de energía mínima con tiempo final fijo (ZEM/ZEV): busca llegar al suelo a −1 m/s sin velocidad
//   horizontal. Se elige el tiempo más corto que el motor puede cumplir (menos pérdida por gravedad).
//
// Simplificaciones (también en la interfaz): Luna esférica sin mascones, sin la gravedad del Sol ni de la Tierra
// durante la captura, impulsos instantáneos para LOI y DOI, motor regulable sin la banda prohibida real del LMDE
// (entre ~65 % y ~92 %), y el sitio a la altura del radio lunar medio.

import { EARTH_GM_KM3_S2, MOON_GM_KM3_S2, MOON_RADIUS_KM, MOON_SOI_KM, type TransferOrbit } from './transfer.ts'

/** Semieje mayor de la órbita lunar (km), NASA NSSDC Moon Fact Sheet. */
export const MOON_ORBIT_SEMIMAJOR_KM = 384400
export const G0_M_S2 = 9.80665
/** Altura de la órbita circular de estacionamiento lunar (km), la de las misiones Apolo. */
export const LUNAR_ORBIT_ALT_KM = 100
/** Altura del periapsis de la órbita de descenso, donde empieza el descenso propulsado (km). */
export const PDI_ALT_KM = 15

/** Módulo lunar del Apolo 11, con datos de NASA. */
export const APOLLO_LM = {
  name: 'Módulo lunar Apolo 11',
  massKg: 15103,
  descentPropellantKg: 8248,
  maxThrustN: 45040,
  minThrottle: 0.1,
  ispS: 311,
} as const
export type LanderPropulsion = { name: string; massKg: number; descentPropellantKg: number; maxThrustN: number; minThrottle: number; ispS: number }

export interface LunarCapture {
  /** Velocidad de la Luna respecto a la Tierra en ese punto de su órbita (km/s). */
  moonSpeedKmS: number
  /** Velocidad de la nave respecto a la Tierra en el apogeo de la transferencia (km/s). */
  apogeeSpeedKmS: number
  /** Velocidad de llegada respecto a la Luna, lejos de ella (v∞, km/s). */
  vInfinityKmS: number
  /** Velocidad respecto a la Luna al cruzar su esfera de influencia (km/s). */
  soiSpeedKmS: number
  /** Velocidad en el punto más cercano de la hipérbola, a 100 km (km/s). */
  periapsisSpeedKmS: number
  /** Velocidad de la órbita circular de 100 km (km/s). */
  circularSpeedKmS: number
  /** Frenado de inserción en órbita lunar (LOI, km/s). */
  loiDeltaVKmS: number
  /** Excentricidad de la hipérbola de llegada. */
  hyperbolaEccentricity: number
  /** Tiempo desde la esfera de influencia hasta el periapsis (s). */
  soiToPeriapsisSeconds: number
  /** Periodo de la órbita circular de 100 km (s). */
  orbitPeriodSeconds: number
}

/** Velocidad respecto a la Luna a una distancia `rKm` de su centro, sobre la hipérbola de llegada (km/s). */
export function hyperbolicSpeedKmS(vInfinityKmS: number, rKm: number): number {
  if (!(rKm > 0) || !(vInfinityKmS >= 0)) throw new RangeError('Distancia o velocidad no válidas.')
  return Math.sqrt(vInfinityKmS ** 2 + (2 * MOON_GM_KM3_S2) / rKm)
}

/** Captura en órbita lunar por cónicas empalmadas, para la transferencia dada. */
export function lunarCapture(orbit: TransferOrbit, orbitAltKm = LUNAR_ORBIT_ALT_KM): LunarCapture {
  if (!(orbitAltKm > 0)) throw new RangeError('Altura de órbita lunar no válida.')
  const rMoon = orbit.moonDistanceKm
  const moonSpeedKmS = Math.sqrt((EARTH_GM_KM3_S2 + MOON_GM_KM3_S2) * (2 / rMoon - 1 / MOON_ORBIT_SEMIMAJOR_KM))
  // Apogeo de la elipse llevado al centro lunar (aproximación clásica de las cónicas empalmadas).
  const a = (orbit.periapsisKm + rMoon) / 2
  const apogeeSpeedKmS = Math.sqrt(EARTH_GM_KM3_S2 * (2 / rMoon - 1 / a))
  const vInfinityKmS = Math.abs(moonSpeedKmS - apogeeSpeedKmS)
  const rp = MOON_RADIUS_KM + orbitAltKm
  const periapsisSpeedKmS = hyperbolicSpeedKmS(vInfinityKmS, rp)
  const circularSpeedKmS = Math.sqrt(MOON_GM_KM3_S2 / rp)
  const hyperbolaEccentricity = 1 + (rp * vInfinityKmS ** 2) / MOON_GM_KM3_S2
  // Tiempo de vuelo hiperbólico desde r = SOI hasta el periapsis.
  const aH = MOON_GM_KM3_S2 / vInfinityKmS ** 2 // |a| de la hipérbola
  const e = hyperbolaEccentricity
  const coshF = (1 + MOON_SOI_KM / aH) / e
  const F = Math.acosh(coshF)
  const soiToPeriapsisSeconds = (e * Math.sinh(F) - F) * Math.sqrt(aH ** 3 / MOON_GM_KM3_S2)
  return {
    moonSpeedKmS, apogeeSpeedKmS, vInfinityKmS,
    soiSpeedKmS: hyperbolicSpeedKmS(vInfinityKmS, MOON_SOI_KM),
    periapsisSpeedKmS, circularSpeedKmS,
    loiDeltaVKmS: periapsisSpeedKmS - circularSpeedKmS,
    hyperbolaEccentricity, soiToPeriapsisSeconds,
    orbitPeriodSeconds: 2 * Math.PI * Math.sqrt(rp ** 3 / MOON_GM_KM3_S2),
  }
}

export interface DescentOrbit {
  /** Impulso de descenso (DOI, km/s). */
  doiDeltaVKmS: number
  /** Caída libre de 100 a 15 km: media vuelta de la elipse (s). */
  coastSeconds: number
  /** Velocidad al empezar el descenso propulsado, a 15 km (km/s). */
  pdiSpeedKmS: number
  semiMajorKm: number
  eccentricity: number
}

/** Órbita de descenso de 100 × 15 km (transferencia de Hohmann a la baja). */
export function descentOrbit(fromAltKm = LUNAR_ORBIT_ALT_KM, pdiAltKm = PDI_ALT_KM): DescentOrbit {
  if (!(pdiAltKm > 0) || !(fromAltKm > pdiAltKm)) throw new RangeError('Alturas de la órbita de descenso no válidas.')
  const ra = MOON_RADIUS_KM + fromAltKm, rp = MOON_RADIUS_KM + pdiAltKm
  const a = (ra + rp) / 2
  const vApo = Math.sqrt(MOON_GM_KM3_S2 * (2 / ra - 1 / a))
  return {
    doiDeltaVKmS: Math.sqrt(MOON_GM_KM3_S2 / ra) - vApo,
    coastSeconds: Math.PI * Math.sqrt(a ** 3 / MOON_GM_KM3_S2),
    pdiSpeedKmS: Math.sqrt(MOON_GM_KM3_S2 * (2 / rp - 1 / a)),
    semiMajorKm: a,
    eccentricity: (ra - rp) / (ra + rp),
  }
}

/** Altura sobre la órbita de descenso a los `seconds` desde el impulso DOI (km). Kepler en la elipse. */
export function coastAltitudeKm(orbit: DescentOrbit, seconds: number): number {
  const t = Math.max(0, Math.min(orbit.coastSeconds, seconds))
  // Desde el apoapsis: anomalía media π en el apoapsis, 2π en el periapsis.
  const M = Math.PI + (Math.PI * t) / orbit.coastSeconds
  let E = M
  for (let k = 0; k < 50; k++) E -= (E - orbit.eccentricity * Math.sin(E) - M) / (1 - orbit.eccentricity * Math.cos(E))
  return orbit.semiMajorKm * (1 - orbit.eccentricity * Math.cos(E)) - MOON_RADIUS_KM
}

export interface DescentSample {
  /** Segundos desde el inicio del descenso propulsado (PDI). */
  t: number
  altitudeKm: number
  /** Distancia recorrida sobre la superficie desde el PDI (km). */
  downrangeKm: number
  /** Velocidad vertical (m/s, positiva hacia arriba). */
  verticalSpeedMS: number
  /** Velocidad horizontal (m/s). */
  horizontalSpeedMS: number
  /** Empuje como fracción del máximo (0–1). */
  throttle: number
  /** Ángulo del empuje respecto a la vertical (grados; 90 = frenando en horizontal). */
  pitchDeg: number
  massKg: number
  /** Propelente de descenso que queda (kg). */
  propellantKg: number
}

export interface PoweredDescent {
  lander: LanderPropulsion
  orbit: DescentOrbit
  /** Propelente gastado en el impulso DOI (kg). */
  doiPropellantKg: number
  durationSeconds: number
  downrangeKm: number
  /** Cambio de velocidad entregado por el motor durante el descenso propulsado (km/s). */
  deltaVKmS: number
  propellantUsedKg: number
  propellantLeftKg: number
  /** Velocidad al tocar el suelo (m/s). */
  touchdownSpeedMS: number
  samples: DescentSample[]
}

interface State { r: number; th: number; vr: number; vt: number; m: number }

const DT = 0.1
/** Segundos finales en los que la guía pasa a bajar a velocidad constante. */
const TERMINAL_S = 2
/** Altura de la puerta final (m): desde aquí la nave baja en vertical a 1 m/s, como en el Apolo. */
export const LOW_GATE_M = 30
/** Velocidad de la bajada vertical final (m/s). */
export const FINAL_DESCENT_MS = 1

/** Aceleración pedida por la guía (m/s², radial y horizontal) con `tgo` segundos restantes. */
function guidance(s: State, tgo: number) {
  const R = MOON_RADIUS_KM * 1000, mu = MOON_GM_KM3_S2 * 1e9
  const g = mu / (s.r * s.r) - (s.vt * s.vt) / s.r
  const h = s.r - R
  const zem = LOW_GATE_M - (h + s.vr * tgo - 0.5 * g * tgo * tgo)
  const zev = -FINAL_DESCENT_MS - (s.vr - g * tgo)
  return { ar: (6 * zem) / (tgo * tgo) - (2 * zev) / tgo + 0, at: -s.vt / tgo, g }
}

function derivatives(s: State, ar: number, at: number, mdot: number): State {
  const mu = MOON_GM_KM3_S2 * 1e9
  return {
    r: s.vr,
    th: s.vt / s.r,
    vr: (s.vt * s.vt) / s.r - mu / (s.r * s.r) + ar,
    vt: (-s.vr * s.vt) / s.r + at,
    m: -mdot,
  }
}

/** Empuje real a partir de la aceleración pedida: respeta el máximo y el mínimo del motor. */
function command(s: State, tgo: number, lander: LanderPropulsion) {
  let { ar, at } = guidance(s, Math.max(tgo, TERMINAL_S))
  if (tgo <= TERMINAL_S) {
    // Desde la puerta final: bajada vertical a velocidad constante, anulando lo que quede de velocidad horizontal.
    const { g } = guidance(s, TERMINAL_S)
    ar = g + (-FINAL_DESCENT_MS - s.vr) / TERMINAL_S
    at = -s.vt / TERMINAL_S
  }
  const want = Math.hypot(ar, at) * s.m
  const thrust = Math.max(lander.maxThrustN * lander.minThrottle, Math.min(lander.maxThrustN, want))
  const k = want > 0 ? thrust / want : 0
  return { ar: ar * k, at: at * k, thrust, saturated: want > lander.maxThrustN * 1.0001, mdot: thrust / (lander.ispS * G0_M_S2) }
}

function run(tf: number, lander: LanderPropulsion, start: State, record: boolean) {
  const R = MOON_RADIUS_KM * 1000
  let s = { ...start }
  let t = 0
  let saturated = false
  const samples: DescentSample[] = []
  const push = (thrust: number, ar: number, at: number) => samples.push({
    t, altitudeKm: (s.r - R) / 1000, downrangeKm: (s.th * R) / 1000, verticalSpeedMS: s.vr, horizontalSpeedMS: s.vt,
    throttle: thrust / lander.maxThrustN, pitchDeg: (Math.atan2(Math.abs(at), ar) * 180) / Math.PI, massKg: s.m,
    propellantKg: 0,
  })
  while (t < tf + 120 && s.r > R) {
    const tgo = Math.max(tf - t, 0)
    const c = command(s, tgo, lander)
    if (c.saturated && tgo > TERMINAL_S) saturated = true
    if (record && Math.round(t / DT) % 10 === 0) push(c.thrust, c.ar, c.at)
    // RK4 con la orden de empuje fija durante el paso.
    const add = (a: State, b: State, h: number): State => ({ r: a.r + b.r * h, th: a.th + b.th * h, vr: a.vr + b.vr * h, vt: a.vt + b.vt * h, m: a.m + b.m * h })
    const k1 = derivatives(s, c.ar, c.at, c.mdot)
    const k2 = derivatives(add(s, k1, DT / 2), c.ar, c.at, c.mdot)
    const k3 = derivatives(add(s, k2, DT / 2), c.ar, c.at, c.mdot)
    const k4 = derivatives(add(s, k3, DT), c.ar, c.at, c.mdot)
    const next = { r: 0, th: 0, vr: 0, vt: 0, m: 0 }
    for (const key of ['r', 'th', 'vr', 'vt', 'm'] as const) next[key] = s[key] + (DT / 6) * (k1[key] + 2 * k2[key] + 2 * k3[key] + k4[key])
    if (next.r <= R) {
      // Contacto dentro del paso: se interpola el instante exacto.
      const f = (s.r - R) / (s.r - next.r)
      for (const key of ['r', 'th', 'vr', 'vt', 'm'] as const) next[key] = s[key] + (next[key] - s[key]) * f
      t += DT * f
      s = next
      s.r = R
      break
    }
    s = next
    t += DT
  }
  if (record) push(0, 0, 0)
  return { s, t, saturated, samples, landed: s.r <= R + 0.5 }
}

/**
 * Descenso propulsado del módulo `lander` desde el periapsis de la órbita de descenso hasta el suelo.
 * Se busca (por bisección) el tiempo de guía más corto que el motor puede cumplir sin saturarse.
 */
export function poweredDescent(lander: LanderPropulsion = APOLLO_LM, orbit: DescentOrbit = descentOrbit()): PoweredDescent {
  if (!(lander.massKg > lander.descentPropellantKg) || !(lander.descentPropellantKg > 0) || !(lander.maxThrustN > 0) || !(lander.ispS > 0)) {
    throw new RangeError('Datos de la nave no válidos.')
  }
  const ve = lander.ispS * G0_M_S2
  // Impulso DOI con la ecuación del cohete.
  const afterDoi = lander.massKg / Math.exp((orbit.doiDeltaVKmS * 1000) / ve)
  const doiPropellantKg = lander.massKg - afterDoi
  const R = MOON_RADIUS_KM * 1000
  const start: State = { r: R + PDI_ALT_KM * 1000, th: 0, vr: 0, vt: orbit.pdiSpeedKmS * 1000, m: afterDoi }
  const propellantStart = lander.descentPropellantKg - doiPropellantKg
  // Más tiempo de guía pide menos empuje pero gasta más (pérdida por gravedad): se busca el más corto que el
  // motor puede cumplir sin saturarse, y después se comprueba que el propelente alcance.
  const engineOk = (tf: number) => { const res = run(tf, lander, start, false); return !res.saturated && res.landed && res.t - tf < 2 * LOW_GATE_M / FINAL_DESCENT_MS }
  let lo = 100, hi = 1200
  if (!engineOk(hi)) throw new RangeError('El motor no alcanza para frenar desde la órbita de descenso.')
  for (let k = 0; k < 30 && hi - lo > 0.5; k++) { const mid = (lo + hi) / 2; if (engineOk(mid)) hi = mid; else lo = mid }
  const res = run(hi, lander, start, true)
  if (afterDoi - res.s.m > propellantStart) throw new RangeError('El propelente no alcanza para el descenso.')
  for (const sample of res.samples) sample.propellantKg = propellantStart - (afterDoi - sample.massKg)
  const used = afterDoi - res.s.m
  return {
    lander, orbit, doiPropellantKg,
    durationSeconds: res.t,
    downrangeKm: (res.s.th * R) / 1000,
    deltaVKmS: (ve * Math.log(afterDoi / res.s.m)) / 1000,
    propellantUsedKg: used,
    propellantLeftKg: propellantStart - used,
    touchdownSpeedMS: Math.hypot(res.s.vr, res.s.vt),
    samples: res.samples,
  }
}

/** Estado del descenso a los `seconds` desde el PDI, interpolado entre muestras. */
export function descentAt(descent: PoweredDescent, seconds: number): DescentSample {
  const list = descent.samples
  const t = Math.max(0, Math.min(descent.durationSeconds, seconds))
  let k = 0
  while (k < list.length - 2 && list[k + 1].t < t) k++
  const a = list[k], b = list[k + 1] ?? a
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0
  const mix = (x: number, y: number) => x + (y - x) * f
  return {
    t, altitudeKm: Math.max(0, mix(a.altitudeKm, b.altitudeKm)), downrangeKm: mix(a.downrangeKm, b.downrangeKm),
    verticalSpeedMS: mix(a.verticalSpeedMS, b.verticalSpeedMS), horizontalSpeedMS: mix(a.horizontalSpeedMS, b.horizontalSpeedMS),
    throttle: f < 1 && b.throttle === 0 ? a.throttle : mix(a.throttle, b.throttle), pitchDeg: mix(a.pitchDeg, b.pitchDeg),
    massKg: mix(a.massKg, b.massKg), propellantKg: mix(a.propellantKg, b.propellantKg),
  }
}

/**
 * Distancia entre los centros de la Tierra y la Luna (km) a partir de lo que ve el sitio (JPL Horizons):
 * distancia del sitio a la Tierra `dKm` y elevación de la Tierra sobre el horizonte local `elDeg`.
 */
export function earthMoonDistanceKm(dKm: number, elDeg: number): number {
  if (!(dKm > MOON_RADIUS_KM) || !Number.isFinite(elDeg)) throw new RangeError('Distancia a la Tierra no válida.')
  return Math.sqrt(dKm ** 2 + MOON_RADIUS_KM ** 2 + 2 * dKm * MOON_RADIUS_KM * Math.sin((elDeg * Math.PI) / 180))
}
