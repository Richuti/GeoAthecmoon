// Búsquedas sobre el simulador (S3): qué fechas de inicio sobreviven, cuánto atraso tolera una misión y qué
// sitio funciona mejor con el mismo módulo y la misma fecha.

import { missionWindow } from '../lib/recommend.ts'
import { samplesFor } from '../lib/time.ts'
import { contactSeries, litSeries, visibility, type Visibility } from '../lib/visibility.ts'
import { DEFAULT_WEIGHTS, siteViability } from '../lib/viability.ts'
import type { SiteData } from '../types'
import type { LanderConfig } from './lander.ts'
import { simulate, type Series } from './simulate.ts'

/** Cada cuántas horas se prueba una fecha de inicio. */
export const SCAN_STEP_HOURS = 6

export interface StartResult {
  startIndex: number
  survived: boolean
  minSocPct: number
  /** Energía sobre el mínimo del 20 % en el peor momento (kWh); 0 si falla */
  marginKWh: number
  dataSentPct: number
}

export type ViableStart = StartResult & { viability: number }

/** Entre las fechas que sobreviven, prioriza luz, contacto y pendiente; después el margen y la fecha más temprana. */
export function bestViableStart(data: SiteData, scan: StartResult[], missionDays: number, vis: Visibility = visibility(data)): ViableStart | null {
  let best: ViableStart | null = null
  for (const candidate of scan) {
    if (!candidate.survived) continue
    const score = siteViability(data, vis, DEFAULT_WEIGHTS, missionWindow(data, candidate.startIndex, missionDays)).score
    const tiedScore = best !== null && Math.abs(score - best.viability) < 1e-9
    const tiedMargin = best !== null && Math.abs(candidate.marginKWh - best.marginKWh) < 1e-9
    if (!best || score > best.viability + 1e-9 || (tiedScore && (candidate.marginKWh > best.marginKWh + 1e-9 || (tiedMargin && candidate.startIndex < best.startIndex)))) {
      best = { ...candidate, viability: score }
    }
  }
  return best
}

/** Series de luz y contacto, para no recalcularlas en cada simulación. */
export function seriesOf(data: SiteData): Series {
  return { lit: litSeries(data), contact: contactSeries(data) }
}

/** Simula empezando cada `stepHours` (con la misión completa dentro del periodo). */
export function scanStarts(
  data: SiteData,
  cfg: LanderConfig,
  missionDays: number,
  series: Series = seriesOf(data),
  stepHours = SCAN_STEP_HOURS,
): StartResult[] {
  const n = data.sun.el.length
  const len = Math.min(n, Math.max(1, samplesFor(data, missionDays * 24)))
  const step = Math.max(1, samplesFor(data, stepHours))
  const out: StartResult[] = []
  for (let s = 0; s + len <= n; s += step) {
    const r = simulate(data, cfg, { startIndex: s, missionDays }, series).summary
    out.push({ startIndex: s, survived: r.survived, minSocPct: r.minSocPct, marginKWh: r.survived ? r.energyMarginKWh : 0, dataSentPct: r.dataSentPct })
  }
  return out
}

export interface DelayTolerance {
  /** Días que se puede atrasar el alunizaje y la misión sigue sobreviviendo */
  days: number
  /** true si no falló ninguna fecha probada pero se acabaron los datos (el número real puede ser mayor) */
  limitedByPeriod: boolean
  /** La misión sobrevive empezando en la fecha pedida */
  survivesNow: boolean
}

/**
 * Cuántos días se puede atrasar el alunizaje: prueba inicios cada 6 h desde `startIndex` y se detiene en el
 * primero que falla. Responde "si la misión se atrasa, ¿todavía funciona?".
 */
export function delayTolerance(
  data: SiteData,
  cfg: LanderConfig,
  startIndex: number,
  missionDays: number,
  series: Series = seriesOf(data),
  stepHours = SCAN_STEP_HOURS,
): DelayTolerance {
  const n = data.sun.el.length
  const { from, to } = missionWindow(data, startIndex, missionDays)
  const len = to - from
  const step = Math.max(1, samplesFor(data, stepHours))
  if (!simulate(data, cfg, { startIndex: from, missionDays }, series).summary.survived) {
    return { days: 0, limitedByPeriod: false, survivesNow: false }
  }
  let lastOk = from
  for (let s = from + step; s + len <= n; s += step) {
    if (!simulate(data, cfg, { startIndex: s, missionDays }, series).summary.survived) {
      return { days: ((lastOk - from) * data.stepHours) / 24, limitedByPeriod: false, survivesNow: true }
    }
    lastOk = s
  }
  return { days: ((lastOk - from) * data.stepHours) / 24, limitedByPeriod: true, survivesNow: true }
}

/** La mejor fecha de inicio: entre las que sobreviven, la de mayor margen de energía (la más temprana si empatan). */
export function bestStart(scan: StartResult[]): StartResult | null {
  let best: StartResult | null = null
  for (const r of scan) {
    if (!r.survived) continue
    if (!best || r.marginKWh > best.marginKWh + 1e-9) best = r
  }
  return best
}

export interface SiteOutcome {
  siteId: string
  name: string
  survived: boolean
  minSocPct: number
  dataSentPct: number
}

/**
 * El mismo módulo y la misma fecha en los otros sitios (solo los que comparten periodo), ordenados de mejor a
 * peor: primero los que sobreviven, luego por batería mínima.
 */
export function compareSites(
  sites: Array<{ data: SiteData; series?: Series }>,
  currentId: string,
  cfg: LanderConfig,
  startIndex: number,
  missionDays: number,
): SiteOutcome[] {
  const current = sites.find((s) => s.data.site.id === currentId)?.data
  return sites
    .filter((s) => s.data.site.id !== currentId)
    .filter((s) => !current || (s.data.start === current.start && s.data.stepHours === current.stepHours && s.data.sun.el.length === current.sun.el.length))
    .map(({ data, series }) => {
      const r = simulate(data, cfg, { startIndex, missionDays }, series ?? seriesOf(data)).summary
      return { siteId: data.site.id, name: data.site.name, survived: r.survived, minSocPct: r.minSocPct, dataSentPct: r.dataSentPct }
    })
    .sort((a, b) => Number(b.survived) - Number(a.survived) || b.minSocPct - a.minSocPct)
}
