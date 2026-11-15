// Vista junto al astronauta: lo que vería una persona de pie en el sitio. Todo lo que se dibuja encima de la
// escena sale de los datos: el horizonte LOLA de 150 km y el camino del Sol y de la Tierra (JPL Horizons),
// marcado según el contacto y la luz que calcula la app.

import { horizonAt } from '../lib/horizon.ts'
import { nextChange } from '../lib/visibility.ts'
import type { HorizonMask, SiteData } from '../types'

/** Dónde está el astronauta respecto a la nave (fijo por sitio): 300 m hacia el azimut 200°. */
export const ASTRONAUT_AZ_DEG = 200
export const ASTRONAUT_DISTANCE_KM = 0.3
/** Altura de la persona y de sus ojos (km). */
export const ASTRONAUT_HEIGHT_KM = 0.00185
export const EYE_HEIGHT_KM = 0.0017
/** Días del camino del Sol y la Tierra que se dibujan desde el momento actual. */
export const PATH_DAYS = 14

export interface SkyPoint { az: number; el: number; visible: boolean; index: number }

/** Camino de un cuerpo desde `from` durante `days` días, una muestra cada `everyHours`. */
export function skyPath(
  data: SiteData,
  body: 'sun' | 'earth',
  visible: boolean[],
  from: number,
  days = PATH_DAYS,
  everyHours = 1,
): SkyPoint[] {
  const n = data[body].el.length
  const step = Math.max(1, Math.round(everyHours / data.stepHours))
  const to = Math.min(n - 1, from + Math.round((days * 24) / data.stepHours))
  const out: SkyPoint[] = []
  for (let i = Math.max(0, from); i <= to; i += step) out.push({ az: data[body].az[i], el: data[body].el[i], visible: visible[i], index: i })
  return out
}

/** Perfil del horizonte para dibujar: un punto por grado de azimut (cerrado en 360°). */
export function horizonProfile(mask: HorizonMask): Array<{ az: number; el: number }> {
  return Array.from({ length: 361 }, (_, az) => ({ az, el: horizonAt(mask, az % 360) }))
}

export interface SkyEvent {
  /** Muestra en la que cambia (el Sol se oculta o vuelve) */
  index: number
  /** true si en ese momento el Sol aparece; false si se oculta */
  appears: boolean
  az: number
  el: number
}

/** El próximo cambio de luz del Sol dentro de los próximos `days` días, o null. */
export function nextSunEvent(data: SiteData, lit: boolean[], index: number, days = PATH_DAYS): SkyEvent | null {
  const ahead = nextChange(lit, index)
  if (ahead === null || ahead > (days * 24) / data.stepHours) return null
  const next = index + ahead
  return { index: next, appears: lit[next], az: data.sun.az[next], el: data.sun.el[next] }
}
