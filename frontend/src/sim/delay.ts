// «Si la misión se atrasa, ¿todavía funciona?»: compara el plan original con el mismo plan atrasado.
// Todo sale de los datos (luz y contacto por hora) y del módulo elegido; no se inventa ningún número.

import { missionWindow } from '../lib/recommend.ts'
import { samplesFor } from '../lib/time.ts'
import { DEFAULT_WEIGHTS, siteViability } from '../lib/viability.ts'
import type { Visibility } from '../lib/visibility.ts'
import type { SiteData } from '../types'
import type { LanderConfig } from './lander.ts'
import { simulate } from './simulate.ts'

/** Lo que importa de un plan para compararlo. */
export interface PlanOutcome {
  /** Muestra de alunizaje (ajustada para que la misión quepa en los datos) */
  from: number
  viability: number
  lightPct: number
  contactPct: number
  /** El módulo llega al final sin bajar del 20 % de batería */
  survived: boolean
  minSocPct: number
  dataSentPct: number
  /** Muestra en la que la batería llegó al 20 %, o null si aguantó */
  failedAtIndex: number | null
  /** Fin de la ventana de la misión [from, to) */
  to: number
}

export function planOutcome(data: SiteData, vis: Visibility, cfg: LanderConfig, startIndex: number, missionDays: number): PlanOutcome {
  const w = missionWindow(data, startIndex, missionDays)
  const s = simulate(data, cfg, { startIndex: w.from, missionDays }, vis).summary
  // Mismo tope que el resultado de la misión: si el módulo no sobrevive, la viabilidad no pasa del 40 %.
  const v = siteViability(data, vis, DEFAULT_WEIGHTS, w, { missionSurvives: s.survived })
  return {
    from: w.from,
    viability: v.score,
    lightPct: v.factors.light.score,
    contactPct: v.factors.contact.score,
    survived: s.survived,
    minSocPct: s.minSocPct,
    dataSentPct: s.dataSentPct,
    failedAtIndex: s.failedAtIndex,
    to: w.to,
  }
}

export interface DelayComparison {
  original: PlanOutcome
  delayed: PlanOutcome
  /** Atraso que de verdad se pudo aplicar, en horas (puede ser menor si el periodo de datos se acaba) */
  appliedHours: number
  /** El atraso pedido no cabe entero en el periodo de datos */
  cutByPeriod: boolean
  /** Con el atraso, el módulo sigue sobreviviendo */
  stillWorks: boolean
  /** Puntos de viabilidad que gana (+) o pierde (−) */
  viabilityChange: number
}

export function compareDelay(
  data: SiteData,
  vis: Visibility,
  cfg: LanderConfig,
  startIndex: number,
  missionDays: number,
  delayHours: number,
): DelayComparison {
  const original = planOutcome(data, vis, cfg, startIndex, missionDays)
  const wanted = original.from + samplesFor(data, Math.max(0, delayHours))
  const delayed = planOutcome(data, vis, cfg, wanted, missionDays)
  return {
    original,
    delayed,
    appliedHours: (delayed.from - original.from) * data.stepHours,
    cutByPeriod: delayed.from < wanted,
    stillWorks: delayed.survived,
    viabilityChange: delayed.viability - original.viability,
  }
}
