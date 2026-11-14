// Horizonte topográfico: qué tan alto tapa el relieve en cada dirección.
//
// El backend entrega la elevación del relieve cada `azimuthStepDeg` grados de azimut (desde el norte, en
// sentido horario). Entre dos valores se interpola en línea recta, y entre el último y el primero se da
// la vuelta (359° → 0°).

import type { HorizonMask } from '../types'

/** Lleva cualquier azimut al rango [0, 360). */
export function normalizeAz(azDeg: number): number {
  return ((azDeg % 360) + 360) % 360
}

/** Elevación del relieve (en grados) en el azimut dado, interpolada entre las muestras vecinas. */
export function horizonAt(mask: HorizonMask, azDeg: number): number {
  const values = mask.elevationDeg
  const n = values.length
  if (n === 0) return Number.NaN
  const f = normalizeAz(azDeg) / mask.azimuthStepDeg
  const base = Math.floor(f)
  const i0 = base % n
  const i1 = (i0 + 1) % n
  const t = f - base
  return values[i0] + (values[i1] - values[i0]) * t
}

/**
 * Cuánto sobresale un cuerpo (Sol o Tierra) por encima del relieve, en grados.
 * Positivo = se ve sobre el horizonte; negativo = lo tapa el relieve.
 */
export function clearanceDeg(mask: HorizonMask, azDeg: number, elDeg: number): number {
  return elDeg - horizonAt(mask, azDeg)
}

/** Elevación máxima y mínima del relieve, y el azimut donde está la máxima. */
export function horizonExtremes(mask: HorizonMask): { maxDeg: number; maxAzDeg: number; minDeg: number } {
  let maxDeg = -Infinity
  let minDeg = Infinity
  let maxAzDeg = 0
  mask.elevationDeg.forEach((v, i) => {
    if (v > maxDeg) {
      maxDeg = v
      maxAzDeg = i * mask.azimuthStepDeg
    }
    if (v < minDeg) minDeg = v
  })
  return { maxDeg, maxAzDeg, minDeg }
}
