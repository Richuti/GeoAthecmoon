// Transferencia educativa de dos cuerpos, con un encuentro lunar idealizado.
// GM: JPL DE440, https://ssd.jpl.nasa.gov/astro_par.html
// Radios, distancia y periodo lunar: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
// Modelo: órbita elíptica de transferencia de dos cuerpos hasta la distancia real de la Luna en la fecha de llegada
// (JPL Horizons). La captura y el descenso se calculan en lunarArrival.ts; el ascenso desde la Tierra es ilustrativo.

export const EARTH_GM_KM3_S2 = 398600.435507
export const MOON_GM_KM3_S2 = 4902.800118
export const EARTH_RADIUS_KM = 6378.1
export const MOON_RADIUS_KM = 1737.4
export const MOON_DISTANCE_KM = 384400
export const MOON_PERIOD_SECONDS = 27.3217 * 86400
/**
 * Esfera de influencia de la Luna (Laplace): r = a·(m_Luna/m_Tierra)^(2/5), unos 66 000 km.
 * Dentro de ella domina la gravedad lunar. Este modelo de dos cuerpos no la incluye; solo la señala.
 */
export const MOON_SOI_KM = MOON_DISTANCE_KM * (MOON_GM_KM3_S2 / EARTH_GM_KM3_S2) ** 0.4
export const LAUNCH_END = 0.12
/** El último tramo es una presentación del descenso, fuera del modelo orbital. */
export const DESCENT_START = 0.86

/** Escalas de reproducción de la transferencia: horas de viaje por cada segundo en pantalla. */
export const TIME_SCALES_H_PER_S = [2, 5, 12] as const
export type TimeScale = (typeof TIME_SCALES_H_PER_S)[number]

/** Segundos en pantalla que dura la transferencia a una escala dada (tiempo real ÷ escala). */
export function transferPlaybackSeconds(orbit: TransferOrbit, hoursPerSecond: number): number {
  if (!(hoursPerSecond > 0)) throw new RangeError('La escala debe ser positiva.')
  return orbit.durationSeconds / 3600 / hoursPerSecond
}

export interface TransferOrbit {
  /** Distancia entre los centros de la Tierra y la Luna al llegar (km). */
  moonDistanceKm: number
  parkingAltitudeKm: number
  encounterAltitudeKm: number
  periapsisKm: number
  apoapsisKm: number
  semiMajorKm: number
  semiMinorKm: number
  eccentricity: number
  durationSeconds: number
  departureSpeedKmS: number
  injectionDeltaVKmS: number
}

/**
 * Parte de una órbita circular de 200–2000 km; termina a 100 km de la cara lunar próxima a la Tierra.
 * `moonDistanceKm` es la distancia Tierra–Luna al llegar (de las efemérides); por defecto, la media.
 */
export function lunarTransfer(parkingAltitudeKm = 200, moonDistanceKm = MOON_DISTANCE_KM): TransferOrbit {
  if (!Number.isFinite(parkingAltitudeKm) || parkingAltitudeKm < 200 || parkingAltitudeKm > 2000) {
    throw new RangeError('La órbita inicial debe estar entre 200 y 2000 km.')
  }
  if (!Number.isFinite(moonDistanceKm) || moonDistanceKm < 350000 || moonDistanceKm > 410000) {
    throw new RangeError('La distancia a la Luna debe estar entre 350 000 y 410 000 km.')
  }
  const periapsisKm = EARTH_RADIUS_KM + parkingAltitudeKm
  const encounterAltitudeKm = 100
  const apoapsisKm = moonDistanceKm - MOON_RADIUS_KM - encounterAltitudeKm
  const semiMajorKm = (periapsisKm + apoapsisKm) / 2
  const eccentricity = (apoapsisKm - periapsisKm) / (apoapsisKm + periapsisKm)
  const semiMinorKm = semiMajorKm * Math.sqrt(1 - eccentricity ** 2)
  const durationSeconds = Math.PI * Math.sqrt(semiMajorKm ** 3 / EARTH_GM_KM3_S2)
  const departureSpeedKmS = Math.sqrt(EARTH_GM_KM3_S2 * (2 / periapsisKm - 1 / semiMajorKm))
  return {
    moonDistanceKm, parkingAltitudeKm, encounterAltitudeKm, periapsisKm, apoapsisKm, semiMajorKm, semiMinorKm, eccentricity, durationSeconds,
    departureSpeedKmS,
    injectionDeltaVKmS: departureSpeedKmS - Math.sqrt(EARTH_GM_KM3_S2 / periapsisKm),
  }
}

/** Resuelve M = E − e sen(E) en [0, π] con Newton acotado para la elipse de alta excentricidad. */
function eccentricAnomaly(mean: number, eccentricity: number): number {
  if (mean === 0 || mean === Math.PI) return mean
  let low = 0
  let high = Math.PI
  let e = mean
  for (let j = 0; j < 60; j++) {
    const error = e - eccentricity * Math.sin(e) - mean
    if (Math.abs(error) < 1e-13) break
    if (error > 0) high = e
    else low = e
    const next = e - error / (1 - eccentricity * Math.cos(e))
    e = next > low && next < high ? next : (low + high) / 2
  }
  return e
}

/** Posición y velocidad geocéntricas en un plano arbitrario. La fase lunar se ajusta al encuentro ideal. */
export function transferAt(orbit: TransferOrbit, elapsedSeconds: number) {
  if (!Number.isFinite(elapsedSeconds)) throw new RangeError('El tiempo debe ser un número finito.')
  const seconds = Math.max(0, Math.min(orbit.durationSeconds, elapsedSeconds))
  const mean = Math.PI * seconds / orbit.durationSeconds
  const e = eccentricAnomaly(mean, orbit.eccentricity)
  const xKm = orbit.semiMajorKm * (Math.cos(e) - orbit.eccentricity)
  const yKm = orbit.semiMinorKm * Math.sin(e)
  const radiusKm = orbit.semiMajorKm * (1 - orbit.eccentricity * Math.cos(e))
  const factor = Math.sqrt(EARTH_GM_KM3_S2 * orbit.semiMajorKm) / radiusKm
  const vxKmS = -factor * Math.sin(e)
  const vyKmS = factor * Math.sqrt(1 - orbit.eccentricity ** 2) * Math.cos(e)
  const moonAngle = Math.PI + 2 * Math.PI * (seconds - orbit.durationSeconds) / MOON_PERIOD_SECONDS
  return {
    seconds, xKm, yKm, vxKmS, vyKmS,
    radiusKm,
    speedKmS: Math.hypot(vxKmS, vyKmS),
    moonXKm: orbit.moonDistanceKm * Math.cos(moonAngle),
    moonYKm: orbit.moonDistanceKm * Math.sin(moonAngle),
  }
}

/** Un mismo instante para los controles, las cifras y los modelos del viaje. */
export function journeyAt(orbit: TransferOrbit, progress: number) {
  if (!Number.isFinite(progress)) throw new RangeError('El avance debe ser un número finito.')
  const bounded = Math.max(0, Math.min(1, progress))
  const flight = Math.max(0, Math.min(1, (bounded - LAUNCH_END) / (DESCENT_START - LAUNCH_END)))
  const descent = bounded >= DESCENT_START
  const descentProgress = Math.max(0, (bounded - DESCENT_START) / (1 - DESCENT_START))
  const launch = bounded < LAUNCH_END
  const ascent = Math.min(1, bounded / LAUNCH_END)
  const sample = transferAt(orbit, flight * orbit.durationSeconds)
  return {
    ...sample, flight, launch, ascent, descent, descentProgress,
    // Curva de presentación: permite ver el despegue antes de alejar la cámara.
    // No representa una integración de empuje ni una velocidad de ascenso real.
    shipXKm: launch ? EARTH_RADIUS_KM + orbit.parkingAltitudeKm * ascent ** 5 : sample.xKm,
    shipYKm: launch ? 0 : sample.yKm,
  }
}
