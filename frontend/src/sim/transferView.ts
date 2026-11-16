import { MOON_RADIUS_KM, transferAt, type journeyAt, type TransferOrbit } from './transfer.ts'
import { PDI_ALT_KM, coastAltitudeKm, descentAt, descentOrbit, poweredDescent, type PoweredDescent } from './lunarArrival.ts'

/** Altura visual del cohete (launch_vehicle.glb), la misma nave en el despegue, el viaje y el alunizaje. */
export const LAUNCH_SHIP_HEIGHT_M = 110
export const LAUNCH_PAD_DECK_M = 4.85
/** Distancia máxima de la cámara al cohete durante el ascenso (m). */
export const LAUNCH_CHASE_MAX_M = 600

/**
 * El tramo final del viaje (desde DESCENT_START) se divide en dos escenas que se funden sin corte:
 * llegada sobre el globo lunar hasta APPROACH_FADE[0] y descenso sobre el relieve LOLA desde ahí.
 * Las dos coinciden en el instante del fundido: nave a DESCENT_START_ALT_KM sobre el sitio y cámara a
 * DESCENT_CAMERA_START_KM, mirando hacia abajo con DESCENT_CAMERA_START_ELEV_DEG de elevación. A 900 km el globo
 * todavía se ve nítido y el relieve de 300 km ocupa el centro del cuadro.
 */
export const APPROACH_FADE = [0.24, 0.3] as const
/** El descenso sobre el relieve empieza donde empieza el descenso propulsado calculado (PDI, 15 km). */
export const DESCENT_START_ALT_KM = PDI_ALT_KM
export const DESCENT_CAMERA_START_KM = 900
export const DESCENT_CAMERA_START_ELEV_DEG = 80
/** Mitad del lado del relieve LOLA lejano (km): el recorte `{id}_far.glb` mide 300 × 300 km. */
export const FAR_TERRAIN_HALF_KM = 150

/**
 * Parte del alto del cuadro (desde el centro) que ocupa el relieve lejano visto desde `cameraDistanceKm`.
 * Con eso el relieve se abre sin mostrar nunca su borde: la máscara queda siempre dentro de él.
 */
export function terrainScreenFraction(cameraDistanceKm: number, halfFovDeg = 21) {
  if (!(cameraDistanceKm > 0)) throw new RangeError('Distancia no válida.')
  return Math.atan(FAR_TERRAIN_HALF_KM / cameraDistanceKm) / (halfFovDeg * Math.PI / 180)
}

/** Altura de la nave al terminar la transferencia (encuentro a 100 km de la superficie, transfer.ts). */
const ENCOUNTER_ALT_KM = 100

/** Fracción del descenso en la que la nave toca el suelo; el resto muestra el apagado y el polvo cayendo. */
export const TOUCHDOWN = 0.85
/**
 * Altura de la base de la nave (km de escena) bajo la que el chorro levanta polvo. En los alunizajes del
 * Apolo el polvo se vio desde unos 30 m; la nave se dibuja 4 veces más grande, así que aquí son 0.12 km.
 */
export const DUST_ONSET_KM = 0.12
/** Tras apagar el motor el polvo cae en balística, sin aire que lo sostenga: se asienta en este tramo. */
export const DUST_SETTLE = 0.06

const smoothstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t))

/** Reparte el avance del tramo final (0–1) entre la llegada sobre el globo y el descenso sobre el relieve. */
export function finalLeg(descentProgress: number) {
  const d = Math.max(0, Math.min(1, descentProgress))
  return {
    /** Avance de la llegada sobre el globo (0–1); termina al empezar el fundido. */
    approach: Math.min(1, d / APPROACH_FADE[0]),
    /** Opacidad del relieve LOLA sobre el globo (0–1). */
    terrain: smoothstep(APPROACH_FADE[0], APPROACH_FADE[1], d),
    /** Avance del descenso sobre el relieve (0–1). */
    descent: Math.max(0, (d - APPROACH_FADE[0]) / (1 - APPROACH_FADE[0])),
  }
}

const COAST = descentOrbit()
let descentProfile: PoweredDescent | null = null
/** Descenso propulsado calculado (lunarArrival.ts). Se integra una sola vez: no depende del sitio ni de la fecha. */
export function descentProfileOf(): PoweredDescent {
  descentProfile ??= poweredDescent()
  return descentProfile
}

/**
 * Llegada sobre el globo: después del frenado (LOI) en la órbita polar de 100 km y del impulso DOI, la nave cae
 * libremente hasta 15 km. La altura sale de esa elipse calculada; el arco en pantalla se acorta a un cuarto de
 * vuelta (la caída real es media vuelta, unos 57 min). Al final la nave se endereza para alunizar.
 */
export function approachState(t: number) {
  if (!Number.isFinite(t)) throw new RangeError('Llegada no válida.')
  const s = smoothstep(0, 1, t)
  const phi = s * Math.PI / 2
  return {
    /** Segundos de caída libre desde el impulso DOI que corresponden a este punto de la llegada. */
    coastSeconds: s * COAST.coastSeconds,
    /** Dirección desde el centro de la Luna hacia la nave. */
    dir: [Math.cos(phi), -Math.sin(phi), 0] as [number, number, number],
    /** Dirección de avance sobre el arco. */
    tangent: [-Math.sin(phi), -Math.cos(phi), 0] as [number, number, number],
    altitudeKm: s <= 0 ? ENCOUNTER_ALT_KM : s >= 1 ? DESCENT_START_ALT_KM : coastAltitudeKm(COAST, s * COAST.coastSeconds),
    /** 0 = nariz hacia delante; 1 = nave vertical sobre el sitio, lista para descender. */
    upright: smoothstep(0.55, 1, t),
    /** 0 = cámara detrás de la nave; 1 = cámara sobre el sitio como al empezar el descenso. */
    overhead: smoothstep(0.5, 1, t),
  }
}

/**
 * Descenso sobre el relieve: la altura de la nave es la del descenso propulsado calculado, comprimido en el tiempo
 * de pantalla. La nave baja en vertical sobre el sitio: los ~480 km de recorrido horizontal se dan en cifras.
 */
export function descentFrame(progress: number, aspect: number) {
  if (!Number.isFinite(progress) || !Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Descenso no válido.')
  const p = Math.max(0, Math.min(1, progress))
  const t = Math.min(1, p / TOUCHDOWN)
  const profile = descentProfileOf()
  const altitudeKm = t >= 1 ? 0 : descentAt(profile, t * profile.durationSeconds).altitudeKm
  const touched = p >= TOUCHDOWN
  const settle = touched ? Math.max(0, 1 - (p - TOUCHDOWN) / DUST_SETTLE) : 1
  // Cerca del suelo: distancia que deja ver la nave entera y el polvo, también en pantallas angostas.
  const near = Math.max(0.9, 0.6 / Math.min(1, aspect), 2.5 * (1 - t)) * 1.4
  const close = smoothstep(0, 0.6, p)
  return {
    altitudeKm,
    /** Distancia de la cámara a la nave: de la vista desde 900 km a la toma cercana. */
    cameraDistanceKm: logLerp(DESCENT_CAMERA_START_KM, near, close),
    /** Elevación de la cámara sobre el horizonte (grados): de casi cenital a una vista oblicua. */
    cameraElevationDeg: lerp(DESCENT_CAMERA_START_ELEV_DEG, 22, close),
    touched,
    /** 1 con el motor encendido; 0 desde el contacto. */
    engine: touched ? 0 : 1,
    /** Intensidad del polvo (0–1): crece cerca del suelo y cae enseguida tras el apagado. */
    dust: smoothstep(DUST_ONSET_KM, 0, altitudeKm) * settle,
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

const HALF_FOV = 21 * Math.PI / 180

/** Encuadre de cámara (centro y distancia, en km) que contiene un recuadro, con margen. */
export function fitFrame(box: { minX: number; maxX: number; minY: number; maxY: number }, aspect: number, margin = 1.15) {
  if (!(aspect > 0) || !(box.maxX >= box.minX) || !(box.maxY >= box.minY)) throw new RangeError('Encuadre no válido.')
  const halfHeight = Math.max((box.maxY - box.minY) / 2, (box.maxX - box.minX) / (2 * aspect)) * margin
  return { xKm: (box.minX + box.maxX) / 2, yKm: (box.minY + box.maxY) / 2, distanceKm: halfHeight / Math.tan(HALF_FOV) }
}

/** Salida: la Tierra entera y la nave en el mismo cuadro, para ver cómo se aleja. */
export function departureFrame(sample: { shipXKm: number; shipYKm: number }, earthRadiusKm: number, aspect: number) {
  return fitFrame({
    minX: Math.min(-earthRadiusKm, sample.shipXKm), maxX: Math.max(earthRadiusKm, sample.shipXKm),
    minY: Math.min(-earthRadiusKm, sample.shipYKm), maxY: Math.max(earthRadiusKm, sample.shipYKm),
  }, aspect, 1.35)
}

/** Vista general: la elipse completa, la Tierra y el arco que recorre la Luna mientras dura el viaje. */
export function overviewFrame(orbit: TransferOrbit, aspect: number, earthRadiusKm: number, moonRadiusKm: number) {
  const start = transferAt(orbit, 0)
  const end = transferAt(orbit, orbit.durationSeconds)
  return fitFrame({
    minX: Math.min(-orbit.apoapsisKm, start.moonXKm, end.moonXKm) - moonRadiusKm,
    maxX: Math.max(orbit.periapsisKm, earthRadiusKm),
    minY: -Math.max(earthRadiusKm, moonRadiusKm),
    maxY: Math.max(orbit.semiMinorKm, start.moonYKm + moonRadiusKm, earthRadiusKm),
  }, aspect, 1.12)
}
