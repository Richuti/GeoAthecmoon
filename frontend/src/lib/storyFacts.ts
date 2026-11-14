// Datos reales para la portada narrativa. Cada frase de la historia usa un número calculado aquí a partir
// de los datos de la app (JPL Horizons, horizonte y simulador), nunca escrito a mano.

import type { SiteData } from '../types'
import { autonomyHours, PRESETS } from '../sim/lander.ts'
import { recommend } from './recommend.ts'
import { visibility } from './visibility.ts'

export interface StoryFacts {
  /** Sitio de referencia para los datos del Sol y la Tierra (Shackleton si existe) */
  refName: string
  /** Elevación máxima del Sol en el periodo (°) */
  sunMaxElDeg: number
  /** Días que tarda el Sol en dar una vuelta completa al horizonte */
  sunLapDays: number
  /** % del periodo con contacto directo con la Tierra en el sitio de referencia */
  contactPct: number
  /** Ejemplo de fecha: viabilidad de una misión de 14 días desde el inicio del periodo y desde la mejor fecha */
  dateExample: { siteName: string; fromStart: number; best: number; bestStartIndex: number } | null
  /** Horas que aguanta el Explorador ligero sin Sol */
  autonomyHours: number
  /** Cantidad de sitios y días de datos */
  siteCount: number
  periodDays: number
  /** Periodo de los datos, para escribir fechas */
  period: { start: string; stepHours: number }
}

/** Días por vuelta completa del azimut (desenrollando los saltos de 360°). */
export function lapDays(az: number[], stepHours: number): number {
  let total = 0
  for (let i = 1; i < az.length; i++) {
    let d = az[i] - az[i - 1]
    if (d > 180) d -= 360
    if (d < -180) d += 360
    total += d
  }
  const hours = (az.length - 1) * stepHours
  return Math.abs(total) > 0 ? (360 * hours) / Math.abs(total) / 24 : Infinity
}

export function storyFacts(sites: SiteData[]): StoryFacts | null {
  if (sites.length === 0) return null
  const ref = sites.find((s) => s.site.id === 'shackleton-rim') ?? sites[0]
  const contexts = sites.map((data) => ({ data, vis: visibility(data) }))
  const refVis = contexts.find((c) => c.data === ref)!.vis

  // El ejemplo de fecha: el sitio donde más cambia la viabilidad entre empezar el día 1 o en la mejor fecha.
  let dateExample: StoryFacts['dateExample'] = null
  for (const ctx of contexts) {
    const r = recommend(ctx, contexts, { startIndex: 0, missionDays: 14 })
    const best = r.betterDate?.score ?? r.current.score
    const gain = best - r.current.score
    if (r.betterDate && (!dateExample || gain > dateExample.best - dateExample.fromStart)) {
      dateExample = { siteName: ctx.data.site.name, fromStart: r.current.score, best, bestStartIndex: r.betterDate.startIndex }
    }
  }

  return {
    refName: ref.site.name,
    sunMaxElDeg: Math.max(...ref.sun.el),
    sunLapDays: lapDays(ref.sun.az, ref.stepHours),
    contactPct: refVis.contact.length ? (100 * refVis.contact.filter(Boolean).length) / refVis.contact.length : 0,
    dateExample,
    autonomyHours: autonomyHours(PRESETS.explorer.config),
    siteCount: sites.length,
    periodDays: Math.round((ref.sun.el.length * ref.stepHours) / 24),
    period: { start: ref.start, stepHours: ref.stepHours },
  }
}
