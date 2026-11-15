import { MOON_RADIUS_KM, type journeyAt } from './transfer.ts'

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
