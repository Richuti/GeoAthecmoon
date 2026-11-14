// Visibilidad del Sol (luz) y de la Tierra (comunicación) a lo largo del periodo.
//
// Regla del contrato (docs/CONTRATO_DATOS.md):
//   hay luz           si sun.el[i]   > horizonte(sun.az[i])
//   hay comunicación  si earth.el[i] > horizonte(earth.az[i])
// Se usa el centro del cuerpo. La fracción del disco solar visible (para la energía) va en el simulador.

import type { BodyTrack, HorizonMask, SiteData } from '../types'
import { clearanceDeg } from './horizon.ts'

/** Un tramo continuo de muestras [start, end): `end` es la primera muestra fuera del tramo. */
export interface TimeWindow {
  start: number
  end: number
  /** El tramo ya estaba en curso al empezar el periodo (puede haber empezado antes) */
  openStart: boolean
  /** El tramo sigue al terminar el periodo (puede durar más) */
  openEnd: boolean
}

/** Resumen de visibilidad de un sitio en todo el periodo. */
export interface Visibility {
  /** Una bandera por muestra: hay luz */
  lit: boolean[]
  /** Una bandera por muestra: hay contacto directo con la Tierra */
  contact: boolean[]
  /** % del periodo con luz (0–100) */
  lightPct: number
  /** % del periodo con contacto (0–100) */
  contactPct: number
}

function visibleSeries(horizon: HorizonMask, track: BodyTrack): boolean[] {
  return track.el.map((el, i) => clearanceDeg(horizon, track.az[i], el) > 0)
}

/** ¿Hay luz en la muestra i? (el Sol está sobre el relieve) */
export function isLit(data: SiteData, i: number): boolean {
  return clearanceDeg(data.horizon, data.sun.az[i], data.sun.el[i]) > 0
}

/** ¿Hay contacto directo con la Tierra en la muestra i? */
export function hasContact(data: SiteData, i: number): boolean {
  return clearanceDeg(data.horizon, data.earth.az[i], data.earth.el[i]) > 0
}

/** Banderas de luz para todo el periodo. */
export function litSeries(data: SiteData): boolean[] {
  return visibleSeries(data.horizon, data.sun)
}

/** Banderas de contacto para todo el periodo. */
export function contactSeries(data: SiteData): boolean[] {
  return visibleSeries(data.horizon, data.earth)
}

/** % de muestras verdaderas en [from, to). Devuelve 0 si el rango está vacío. */
export function percent(flags: boolean[], from = 0, to = flags.length): number {
  const a = Math.max(0, from)
  const b = Math.min(flags.length, to)
  if (b <= a) return 0
  let n = 0
  for (let i = a; i < b; i++) if (flags[i]) n++
  return (100 * n) / (b - a)
}

/** Tramos continuos donde la bandera es verdadera, en orden. */
export function windows(flags: boolean[]): TimeWindow[] {
  const out: TimeWindow[] = []
  let start = -1
  for (let i = 0; i <= flags.length; i++) {
    const on = i < flags.length && flags[i]
    if (on && start < 0) start = i
    if (!on && start >= 0) {
      out.push({ start, end: i, openStart: start === 0, openEnd: i === flags.length })
      start = -1
    }
  }
  return out
}

/** El tramo (de luz o de sombra) que contiene la muestra i. */
export function windowAt(flags: boolean[], i: number): TimeWindow | null {
  if (i < 0 || i >= flags.length) return null
  const v = flags[i]
  let start = i
  while (start > 0 && flags[start - 1] === v) start--
  let end = i + 1
  while (end < flags.length && flags[end] === v) end++
  return { start, end, openStart: start === 0, openEnd: end === flags.length }
}

/**
 * Muestras hasta el próximo cambio (por ejemplo, hasta que el Sol se oculta o vuelve).
 * Devuelve null si no cambia en lo que queda del periodo.
 */
export function nextChange(flags: boolean[], i: number): number | null {
  if (i < 0 || i >= flags.length) return null
  for (let k = i + 1; k < flags.length; k++) if (flags[k] !== flags[i]) return k - i
  return null
}

/** Luz y contacto de todo el periodo, calculados una sola vez. */
export function visibility(data: SiteData): Visibility {
  const lit = litSeries(data)
  const contact = contactSeries(data)
  return { lit, contact, lightPct: percent(lit), contactPct: percent(contact) }
}
