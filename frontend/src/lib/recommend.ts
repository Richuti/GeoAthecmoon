// Recomendación: para una misión de N días que empieza en una fecha, ¿hay una fecha mejor en el periodo?
// ¿Hay un sitio mejor para las mismas fechas? Usa la viabilidad (5.4); el simulador (S3) la refina después.

import type { SiteData } from '../types'
import { formatDateTime, sampleTime, samplesFor } from './time.ts'
import { DEFAULT_WEIGHTS, siteViability, type ViabilityResult, type Weights } from './viability.ts'
import type { Visibility } from './visibility.ts'

/** Un sitio con su visibilidad ya calculada. */
export interface SiteContext {
  data: SiteData
  vis: Visibility
}

/** Rango de muestras [from, to) que ocupa la misión. */
export interface MissionWindow {
  from: number
  to: number
  /** true si hubo que adelantar el inicio para que la misión entrara en el periodo */
  shifted: boolean
}

export interface DateCandidate {
  startIndex: number
  score: number
}

export interface Recommendation {
  window: MissionWindow
  /** Viabilidad del sitio elegido en la ventana de la misión */
  current: ViabilityResult
  /** Una fecha de inicio mejor en el mismo sitio (null si no mejora lo suficiente) */
  betterDate: (DateCandidate & { gain: number }) | null
  /** Un sitio mejor para las mismas fechas (null si ninguno mejora lo suficiente) */
  betterSite: { siteId: string; name: string; score: number; gain: number } | null
  /** Frases listas para mostrar */
  dateMessage: string | null
  siteMessage: string | null
  /** Resumen: las dos frases, o qué pasa si no hay nada mejor */
  message: string
}

/** Mejora mínima (en puntos) para que valga la pena recomendar otra fecha u otro sitio. */
export const MIN_GAIN = 3

/** Cada cuántas horas se prueba una fecha de inicio. */
export const START_STEP_HOURS = 6

/** Ventana de la misión. Si no entra completa en el periodo, se adelanta el inicio. */
export function missionWindow(data: SiteData, startIndex: number, missionDays: number): MissionWindow {
  const n = data.sun.el.length
  const len = Math.min(n, Math.max(1, samplesFor(data, missionDays * 24)))
  const wanted = Math.max(0, Math.round(startIndex))
  const from = Math.min(wanted, n - len)
  return { from, to: from + len, shifted: from !== wanted }
}

/** Viabilidad de cada fecha de inicio posible (cada `stepHours`), con la misión completa dentro del periodo. */
export function scanStartDates(
  ctx: SiteContext,
  missionDays: number,
  weights: Weights = DEFAULT_WEIGHTS,
  stepHours = START_STEP_HOURS,
): DateCandidate[] {
  const n = ctx.data.sun.el.length
  const len = Math.min(n, Math.max(1, samplesFor(ctx.data, missionDays * 24)))
  const step = Math.max(1, samplesFor(ctx.data, stepHours))
  const out: DateCandidate[] = []
  for (let s = 0; s + len <= n; s += step) {
    out.push({ startIndex: s, score: siteViability(ctx.data, ctx.vis, weights, { from: s, to: s + len }).score })
  }
  return out
}

/** La mejor fecha de inicio del periodo (la más temprana si hay empate). */
export function bestStartDate(
  ctx: SiteContext,
  missionDays: number,
  weights: Weights = DEFAULT_WEIGHTS,
): DateCandidate | null {
  const all = scanStartDates(ctx, missionDays, weights)
  return all.reduce<DateCandidate | null>((best, c) => (best === null || c.score > best.score ? c : best), null)
}

/** Dos sitios se pueden comparar en "las mismas fechas" solo si comparten periodo y paso. */
function samePeriod(a: SiteData, b: SiteData): boolean {
  return a.start === b.start && a.stepHours === b.stepHours && a.sun.el.length === b.sun.el.length
}

/** El mejor de los otros sitios para la misma ventana (o null si no hay otros comparables). */
export function bestAlternativeSite(
  current: SiteContext,
  all: SiteContext[],
  window: { from: number; to: number },
  weights: Weights = DEFAULT_WEIGHTS,
): { ctx: SiteContext; score: number } | null {
  let best: { ctx: SiteContext; score: number } | null = null
  for (const c of all) {
    if (c.data.site.id === current.data.site.id || !samePeriod(c.data, current.data)) continue
    const score = siteViability(c.data, c.vis, weights, window).score
    if (!best || score > best.score) best = { ctx: c, score }
  }
  return best
}

/** Recomendación completa para una misión que empieza en `startIndex` y dura `missionDays`. */
export function recommend(
  current: SiteContext,
  all: SiteContext[],
  opts: { startIndex: number; missionDays: number; weights?: Weights; minGain?: number },
): Recommendation {
  const weights = opts.weights ?? DEFAULT_WEIGHTS
  const minGain = opts.minGain ?? MIN_GAIN
  const window = missionWindow(current.data, opts.startIndex, opts.missionDays)
  const result = siteViability(current.data, current.vis, weights, window)

  const bestDate = bestStartDate(current, opts.missionDays, weights)
  const dateGain = bestDate ? bestDate.score - result.score : 0
  const betterDate = bestDate && dateGain >= minGain ? { ...bestDate, gain: dateGain } : null

  const alt = bestAlternativeSite(current, all, window, weights)
  const siteGain = alt ? alt.score - result.score : 0
  const betterSite =
    alt && siteGain >= minGain
      ? { siteId: alt.ctx.data.site.id, name: alt.ctx.data.site.name, score: alt.score, gain: siteGain }
      : null

  const pts = (v: number) => `+${Math.round(v)}`
  const dateMessage = betterDate
    ? `Empezando el ${formatDateTime(sampleTime(current.data, betterDate.startIndex))}, la viabilidad sube a ${Math.round(betterDate.score)} % (${pts(betterDate.gain)}).`
    : null
  const siteMessage = betterSite
    ? `${betterSite.name} llega a ${Math.round(betterSite.score)} % en las mismas fechas (${pts(betterSite.gain)}).`
    : null
  const message =
    [dateMessage, siteMessage].filter(Boolean).join(' ') ||
    `Para una misión de ${opts.missionDays} días no hay una fecha ni un sitio claramente mejores: esta opción ya está entre las mejores del periodo.`

  return { window, current: result, betterDate, betterSite, dateMessage, siteMessage, message }
}
