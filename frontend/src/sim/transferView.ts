import { MOON_RADIUS_KM, type journeyAt } from './transfer.ts'

/** Altura visual del cohete (launch_vehicle.glb), la misma nave en el despegue, el viaje y el alunizaje. */
export const LAUNCH_SHIP_HEIGHT_M = 110
export const LAUNCH_PAD_DECK_M = 4.85
/** Distancia máxima de la cámara al cohete durante el ascenso (m). */
export const LAUNCH_CHASE_MAX_M = 600

/** Presentación local en km; no calcula una maniobra propulsiva lunar. */
export function descentFrame(progress: number, aspect: number) {
  if (!Number.isFinite(progress) || !Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Descenso no válido.')
  const p = Math.max(0, Math.min(1, progress))
  return {
    altitudeKm: 3 * (1 - p) ** 2,
    distanceKm: Math.max(0.65, 0.42 / Math.min(1, aspect), 2.5 * (1 - p)),
  }
}

/** Cámara de presentación en metros: la nave tiene la misma escala que la plataforma. */
export function launchFrame(altitudeM: number, aspect: number) {
  if (!Number.isFinite(altitudeM) || altitudeM < 0 || !Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError('Altura y proporción de cámara no válidas.')
  }
  // Cámara de persecución: se aleja al subir, pero no más de LAUNCH_CHASE_MAX_M para que el cohete siga a la vista.
  const distanceM = Math.max(220, 95 / (Math.tan(21 * Math.PI / 180) * Math.min(1, aspect)), Math.min(altitudeM * 0.08, LAUNCH_CHASE_MAX_M))
  return { altitudeM, centerY: LAUNCH_PAD_DECK_M + altitudeM + LAUNCH_SHIP_HEIGHT_M / 2, distanceM }
}

/** Encuadra los dos cuerpos durante la aproximación, con margen para los rótulos. */
export function encounterFrame(sample: ReturnType<typeof journeyAt>, moonRadiusKm: number, shipSizeKm: number, aspect: number) {
  const left = Math.min(sample.shipXKm - shipSizeKm / 2, sample.moonXKm - moonRadiusKm)
  const right = Math.max(sample.shipXKm + shipSizeKm / 2, sample.moonXKm + moonRadiusKm)
  const bottom = Math.min(sample.shipYKm - shipSizeKm / 2, sample.moonYKm - moonRadiusKm)
  const top = Math.max(sample.shipYKm + shipSizeKm / 2, sample.moonYKm + moonRadiusKm)
  const halfHeight = Math.max((right - left) / (2 * aspect), (top - bottom) / 2)
  return {
    xKm: (left + right) / 2,
    yKm: (bottom + top) / 2,
    distanceKm: Math.max(11500, halfHeight * 1.55 / Math.tan(21 * Math.PI / 180) + Math.max(MOON_RADIUS_KM, moonRadiusKm)),
  }
}
