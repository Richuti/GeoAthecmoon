// Cálculos del cielo a partir de los datos crudos del contrato: tamaño aparente del Sol y la Tierra, eclipses
// del Sol por la Tierra, fracción visible de cada disco, la cresta que tapa una dirección, la Red de Espacio
// Profundo (DSN) y la comparación con los mapas de iluminación publicados por NASA.
//
// Nada se inventa: todo sale de `sun`/`earth` (azimut, elevación y distancia de JPL Horizons), del horizonte
// LOLA y de constantes físicas publicadas. Si falta un dato opcional, se usa el valor medio y se dice.

import type { BodyTrack, HorizonMask, SiteData } from '../types'
import { clearanceDeg, normalizeAz } from './horizon.ts'
import { percent, windows } from './visibility.ts'

/** Radio del Sol (km), IAU 2015 (resolución B3). */
export const SUN_RADIUS_KM = 695_700
/** Radio ecuatorial de la Tierra (km), IAU / WGS84. */
export const EARTH_RADIUS_KM = 6378.137
/** Distancias medias usadas solo si los datos no traen `distKm` (km): 1 UA y la distancia media Tierra–Luna. */
export const MEAN_SUN_DIST_KM = 149_597_870.7
export const MEAN_EARTH_DIST_KM = 384_400

const DEG = Math.PI / 180

/** Radio aparente (grados) de una esfera de radio `radiusKm` vista a `distKm`. */
export function angularRadiusDeg(radiusKm: number, distKm: number): number {
  return Math.asin(Math.min(1, radiusKm / distKm)) / DEG
}

function trackRadius(track: BodyTrack, i: number, radiusKm: number, meanDistKm: number): number {
  const d = track.distKm?.[i]
  return angularRadiusDeg(radiusKm, Number.isFinite(d) && d! > 0 ? d! : meanDistKm)
}

/** Radio aparente del Sol en la muestra i (grados). */
export function sunRadiusDeg(data: SiteData, i: number): number {
  return trackRadius(data.sun, i, SUN_RADIUS_KM, MEAN_SUN_DIST_KM)
}

/** Radio aparente de la Tierra en la muestra i (grados). */
export function earthRadiusDeg(data: SiteData, i: number): number {
  return trackRadius(data.earth, i, EARTH_RADIUS_KM, MEAN_EARTH_DIST_KM)
}

/** Separación angular (grados) entre dos direcciones dadas por azimut y elevación. */
export function separationDeg(az1: number, el1: number, az2: number, el2: number): number {
  const c = Math.sin(el1 * DEG) * Math.sin(el2 * DEG) + Math.cos(el1 * DEG) * Math.cos(el2 * DEG) * Math.cos((az1 - az2) * DEG)
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG
}

/**
 * Fracción del área del disco A (radio `ra`) tapada por el disco B (radio `rb`), con sus centros a `d`.
 * Geometría plana de dos círculos: vale para discos pequeños como estos (menos de 1°).
 */
export function discCoverage(ra: number, rb: number, d: number): number {
  if (ra <= 0) return 0
  if (d >= ra + rb) return 0
  if (d <= rb - ra) return 1 // A queda entero detrás de B
  if (d <= ra - rb) return (rb * rb) / (ra * ra) // B entero delante de A
  const a = Math.acos(Math.max(-1, Math.min(1, (d * d + ra * ra - rb * rb) / (2 * d * ra))))
  const b = Math.acos(Math.max(-1, Math.min(1, (d * d + rb * rb - ra * ra) / (2 * d * rb))))
  const area = ra * ra * a + rb * rb * b - 0.5 * Math.sqrt(Math.max(0, (-d + ra + rb) * (d + ra - rb) * (d - ra + rb) * (d + ra + rb)))
  return Math.min(1, Math.max(0, area / (Math.PI * ra * ra)))
}

/** Fracción del disco que queda sobre el relieve (0–1): lineal mientras el disco cruza el borde. */
export function discAboveHorizon(clearance: number, radius: number): number {
  if (radius <= 0) return clearance > 0 ? 1 : 0
  return Math.min(1, Math.max(0, (clearance + radius) / (2 * radius)))
}

/** Fracción del disco solar tapada por la Tierra en la muestra i (eclipse visto desde el sitio). */
export function eclipseFraction(data: SiteData, i: number): number {
  const d = separationDeg(data.sun.az[i], data.sun.el[i], data.earth.az[i], data.earth.el[i])
  return discCoverage(sunRadiusDeg(data, i), earthRadiusDeg(data, i), d)
}

/**
 * Fracción del Sol que llega al panel en la muestra i (0–1): la parte del disco sobre el relieve, menos lo que
 * tapa la Tierra durante un eclipse. Supone que la Tierra, si eclipsa, está delante de la parte visible del disco.
 */
export function solarFraction(data: SiteData, i: number): number {
  const above = discAboveHorizon(clearanceDeg(data.horizon, data.sun.az[i], data.sun.el[i]), sunRadiusDeg(data, i))
  if (above === 0) return 0
  return Math.max(0, above - eclipseFraction(data, i))
}

/** Fracción del disco de la Tierra sobre el relieve en la muestra i (0–1). */
export function earthDiscFraction(data: SiteData, i: number): number {
  return discAboveHorizon(clearanceDeg(data.horizon, data.earth.az[i], data.earth.el[i]), earthRadiusDeg(data, i))
}

export interface Eclipse {
  /** Primera muestra con parte del Sol tapada por la Tierra */
  start: number
  /** Primera muestra después del eclipse */
  end: number
  /** Muestra con la mayor fracción tapada */
  peakIndex: number
  /** Mayor fracción del disco solar tapada (0–1) */
  maxFraction: number
  /** Total si en algún momento la Tierra tapa todo el Sol */
  total: boolean
}

/** Eclipses de Sol por la Tierra vistos desde el sitio en todo el periodo (con el Sol sobre el horizonte o no). */
export function eclipses(data: SiteData): Eclipse[] {
  const n = data.sun.el.length
  const frac = Array.from({ length: n }, (_, i) => eclipseFraction(data, i))
  return windows(frac.map((f) => f > 0)).map((w) => {
    let peakIndex = w.start
    for (let i = w.start; i < w.end; i++) if (frac[i] > frac[peakIndex]) peakIndex = i
    return { start: w.start, end: w.end, peakIndex, maxFraction: frac[peakIndex], total: frac[peakIndex] >= 1 - 1e-9 }
  })
}

export interface Blocker {
  /** Azimut consultado (grados) */
  azimuthDeg: number
  /** Elevación del relieve en esa dirección (grados) */
  elevationDeg: number
  /** Distancia a la cresta que limita la vista (km), o null si los datos no la traen */
  distanceKm: number | null
  /** Altura de esa cresta sobre el suelo del sitio (m), o null si no viene */
  heightM: number | null
}

/** Qué relieve limita la vista en el azimut dado (la muestra de horizonte más cercana). */
export function blockerAt(mask: HorizonMask, azDeg: number): Blocker {
  const n = mask.elevationDeg.length
  const i = Math.round(normalizeAz(azDeg) / mask.azimuthStepDeg) % n
  return {
    azimuthDeg: i * mask.azimuthStepDeg,
    elevationDeg: mask.elevationDeg[i],
    distanceKm: mask.distanceKm?.[i] ?? null,
    heightM: mask.obstacleHeightM?.[i] ?? null,
  }
}

/** El relieve que tapa (o casi tapa) el Sol en la muestra i. */
export function sunBlocker(data: SiteData, i: number): Blocker {
  return blockerAt(data.horizon, data.sun.az[i])
}

/** El relieve en la dirección de la Tierra en la muestra i. */
export function earthBlocker(data: SiteData, i: number): Blocker {
  return blockerAt(data.horizon, data.earth.az[i])
}

/** Nombre corto en español de un azimut (N, NE, E, SE, S, SO, O, NO). */
export function compassPoint(azDeg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return names[Math.round(normalizeAz(azDeg) / 45) % 8]
}

/** Nombre completo en español de un azimut (norte, noreste, ...), para frases. */
export function compassName(azDeg: number): string {
  const names = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']
  return names[Math.round(normalizeAz(azDeg) / 45) % 8]
}

/**
 * Frase corta sobre lo que limita la vista en una dirección: "tras el relieve, a 12.5 km hacia el suroeste" si una
 * cresta sobresale del horizonte plano, o "por el suroeste" si el terreno queda por debajo (el cuerpo se pone).
 */
export function blockerPhrase(b: Blocker): string {
  const toward = compassName(b.azimuthDeg)
  if (b.elevationDeg > 0 && b.distanceKm !== null) return `tras el relieve, a ${b.distanceKm.toFixed(1)} km hacia el ${toward}`
  return `por el ${toward}`
}

// ---------------------------------------------------------------------------
// Red de Espacio Profundo (DSN)
// ---------------------------------------------------------------------------

/** Estaciones de la DSN que ven la Luna sobre su elevación mínima en la muestra i. */
export function dsnStationsAt(data: SiteData, i: number): string[] {
  if (!data.dsn) return []
  return data.dsn.stations.filter((s) => s.el[i] >= data.dsn!.minElevationDeg).map((s) => s.id)
}

/** Por muestra: alguna estación de la DSN ve la Luna. Null si los datos no traen la DSN. */
export function dsnSeries(data: SiteData): boolean[] | null {
  if (!data.dsn) return null
  const { minElevationDeg, stations } = data.dsn
  return data.sun.el.map((_, i) => stations.some((s) => s.el[i] >= minElevationDeg))
}

/**
 * Por muestra: enlace directo posible, es decir, la Tierra sobre el relieve del sitio y la Luna sobre el
 * horizonte de alguna estación. Si los datos no traen la DSN, devuelve null.
 */
export function dsnLinkSeries(data: SiteData, contact: boolean[]): boolean[] | null {
  const dsn = dsnSeries(data)
  return dsn ? contact.map((c, i) => c && dsn[i]) : null
}

/** % del periodo en que cada estación ve la Luna. */
export function dsnStationPercents(data: SiteData): { id: string; name: string; antenna: string; pct: number }[] {
  if (!data.dsn) return []
  const min = data.dsn.minElevationDeg
  return data.dsn.stations.map((s) => ({ id: s.id, name: s.name, antenna: s.antenna, pct: percent(s.el.map((e) => e >= min)) }))
}

// ---------------------------------------------------------------------------
// Validación contra NASA
// ---------------------------------------------------------------------------

export interface ReferenceComparison {
  source: string
  period: string
  /** true si nuestro cálculo usó el horizonte a ras de suelo, como el mapa de NASA */
  groundLevel: boolean
  /** Nuestro % del periodo con alguna parte del Sol sobre el relieve */
  ourSunPct: number
  /** % publicado por NASA en el sitio */
  nasaSunPct: number
  ourEarthPct: number
  nasaEarthPct: number
}

/**
 * Compara nuestro cálculo con el mapa de iluminación de NASA en el sitio, con la misma regla del producto:
 * alguna parte del disco a la vista y, si los datos lo traen, el observador a ras de suelo (el resto de la app
 * usa un panel a 2 m, que en una cresta ve bastante más Sol). Los periodos son distintos (NASA promedia varios
 * años y nosotros uno), así que se espera cercanía, no igualdad. Null si los datos no traen la referencia.
 */
export function compareWithReference(data: SiteData): ReferenceComparison | null {
  const ref = data.reference
  if (!ref) return null
  const ground = ref.groundHorizonDeg?.length === data.horizon.elevationDeg.length
  const mask: HorizonMask = ground ? { azimuthStepDeg: data.horizon.azimuthStepDeg, elevationDeg: ref.groundHorizonDeg! } : data.horizon
  const n = data.sun.el.length
  const sunAny: boolean[] = []
  const earthAny: boolean[] = []
  for (let i = 0; i < n; i++) {
    sunAny.push(clearanceDeg(mask, data.sun.az[i], data.sun.el[i]) > -sunRadiusDeg(data, i))
    earthAny.push(clearanceDeg(mask, data.earth.az[i], data.earth.el[i]) > -earthRadiusDeg(data, i))
  }
  return {
    source: ref.source,
    period: ref.period,
    groundLevel: ground,
    ourSunPct: percent(sunAny),
    nasaSunPct: ref.sunPct,
    ourEarthPct: percent(earthAny),
    nasaEarthPct: ref.earthPct,
  }
}
