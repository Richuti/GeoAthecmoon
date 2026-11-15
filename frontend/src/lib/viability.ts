// Viabilidad de un sitio: un puntaje de 0 a 100 que combina la luz solar, el contacto con la Tierra y la
// pendiente del terreno, con pesos ajustables. Además explica el resultado en lenguaje simple.

import type { SiteData } from '../types'
import { percent, type Visibility } from './visibility.ts'

export interface Weights {
  light: number
  contact: number
  slope: number
}

/** Pesos por defecto: la energía pesa más, luego la comunicación y luego el terreno. */
export const DEFAULT_WEIGHTS: Weights = { light: 0.45, contact: 0.35, slope: 0.2 }

/**
 * Pendiente: hasta 5° es cómoda (puntaje 100); desde 10° la mayoría de los módulos no puede alunizar (0).
 * Entre ambos baja en línea recta.
 */
export const SLOPE_LIMITS = { comfortableDeg: 5, maxDeg: 10 }

/** Si la simulación dice que la misión no sobrevive, la viabilidad no puede pasar de este valor (S3). */
export const MAX_SCORE_IF_MISSION_FAILS = 40

export type Factor = keyof Weights
export type Verdict = 'good' | 'fair' | 'poor'

export const VERDICT_LABEL: Record<Verdict, string> = { good: 'Buena', fair: 'Aceptable', poor: 'Difícil' }

const FACTOR_NAME: Record<Factor, string> = {
  light: 'la luz solar',
  contact: 'el contacto con la Tierra',
  slope: 'la pendiente',
}

export interface ViabilityInput {
  /** % del tiempo con luz (0–100) */
  lightPct: number
  /** % del tiempo con contacto con la Tierra (0–100) */
  contactPct: number
  /** Pendiente máxima en 100 m, en grados */
  maxSlopeDeg: number
}

export interface FactorScore {
  /** Puntaje del factor, 0–100 */
  score: number
  /** Peso normalizado (los tres suman 1) */
  weight: number
  /** Puntos que aporta al total: score × weight */
  points: number
  /** Puntos que pierde respecto del máximo: (100 − score) × weight */
  lost: number
}

export interface ViabilityResult {
  /** Puntaje total, 0–100 */
  score: number
  verdict: Verdict
  factors: Record<Factor, FactorScore>
  /** El factor que más puntos le quita al total */
  limiting: Factor
  /** Una frase con el resumen, en lenguaje simple */
  summary: string
  /** Avisos concretos (pendiente peligrosa, mucha noche, poco contacto, misión que no sobrevive) */
  warnings: string[]
  /** true si se aplicó el tope por misión fallida */
  cappedByMission: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Pesos no negativos que suman 1. Si todos son 0 (o inválidos), vuelve a los de por defecto. */
export function normalizeWeights(w: Weights): Weights {
  const safe = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)
  const light = safe(w.light)
  const contact = safe(w.contact)
  const slope = safe(w.slope)
  const sum = light + contact + slope
  if (sum === 0) return { ...DEFAULT_WEIGHTS }
  return { light: light / sum, contact: contact / sum, slope: slope / sum }
}

/** Puntaje de pendiente, 0–100. */
export function slopeScore(maxSlopeDeg: number): number {
  const { comfortableDeg, maxDeg } = SLOPE_LIMITS
  if (maxSlopeDeg <= comfortableDeg) return 100
  if (maxSlopeDeg >= maxDeg) return 0
  return (100 * (maxDeg - maxSlopeDeg)) / (maxDeg - comfortableDeg)
}

export function verdictOf(score: number): Verdict {
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

// Las frases usan el mismo valor redondeado que se muestra: si dice "40 %", la frase es la de 40 %.
function lightPhrase(value: number): string {
  const pct = Math.round(value)
  if (pct >= 70) return 'Mucha luz'
  if (pct >= 50) return 'Luz media'
  return 'Poca luz'
}

function contactPhrase(value: number): string {
  const pct = Math.round(value)
  if (pct >= 60) return 'buen contacto con la Tierra'
  if (pct >= 40) return 'contacto parcial con la Tierra'
  return 'poco contacto con la Tierra'
}

function slopePhrase(value: number): string {
  const deg = Math.round(value * 10) / 10
  if (deg <= SLOPE_LIMITS.comfortableDeg) return 'terreno suave'
  if (deg < SLOPE_LIMITS.maxDeg) return 'pendiente moderada'
  return 'pendiente peligrosa'
}

const fmtPct = (v: number) => `${Math.round(v)} %`
const fmtDeg = (v: number) => `${v.toFixed(1)}°`

/**
 * Viabilidad a partir de los porcentajes y la pendiente.
 * `missionSurvives`: resultado de la simulación (S3). Si es false, el puntaje queda en 40 como máximo.
 */
export function viability(
  input: ViabilityInput,
  weights: Weights = DEFAULT_WEIGHTS,
  options: { missionSurvives?: boolean } = {},
): ViabilityResult {
  const w = normalizeWeights(weights)
  const scores: Record<Factor, number> = {
    light: clamp(input.lightPct, 0, 100),
    contact: clamp(input.contactPct, 0, 100),
    slope: slopeScore(input.maxSlopeDeg),
  }
  const factors = Object.fromEntries(
    (Object.keys(scores) as Factor[]).map((f) => [
      f,
      { score: scores[f], weight: w[f], points: scores[f] * w[f], lost: (100 - scores[f]) * w[f] },
    ]),
  ) as Record<Factor, FactorScore>

  const raw = factors.light.points + factors.contact.points + factors.slope.points
  const cappedByMission = options.missionSurvives === false && raw > MAX_SCORE_IF_MISSION_FAILS
  const score = cappedByMission ? MAX_SCORE_IF_MISSION_FAILS : raw

  // El factor que más resta (a igualdad, el primero en el orden luz → contacto → pendiente).
  const limiting = (Object.keys(factors) as Factor[]).reduce((a, b) => (factors[b].lost > factors[a].lost ? b : a))

  let summary =
    `${lightPhrase(input.lightPct)} (${fmtPct(input.lightPct)} del tiempo), ` +
    `${contactPhrase(input.contactPct)} (${fmtPct(input.contactPct)}) ` +
    `y ${slopePhrase(input.maxSlopeDeg)} (${fmtDeg(input.maxSlopeDeg)} como máximo).`
  if (factors[limiting].lost >= 5) summary += ` Lo que más baja el puntaje es ${FACTOR_NAME[limiting]}.`

  const warnings: string[] = []
  if (options.missionSurvives === false) {
    warnings.push(`La misión no sobrevive con este módulo y esta fecha: la viabilidad queda en ${MAX_SCORE_IF_MISSION_FAILS} % como máximo.`)
  }
  if (input.maxSlopeDeg >= SLOPE_LIMITS.maxDeg) {
    warnings.push(`La pendiente llega a ${fmtDeg(input.maxSlopeDeg)}: la mayoría de los módulos no pueden alunizar con más de ${SLOPE_LIMITS.maxDeg}°.`)
  } else if (input.maxSlopeDeg > SLOPE_LIMITS.comfortableDeg) {
    warnings.push(`La pendiente llega a ${fmtDeg(input.maxSlopeDeg)}: algunos módulos podrían tener problemas al alunizar.`)
  }
  if (input.lightPct < 50) {
    warnings.push('Más de la mitad del tiempo sin Sol: hace falta batería para pasar las horas de sombra.')
  }
  if (input.contactPct < 30) {
    warnings.push('Poco contacto directo con la Tierra: los datos tendrán que esperar a las ventanas de comunicación.')
  }

  return { score, verdict: verdictOf(score), factors, limiting, summary, warnings, cappedByMission }
}

/**
 * Viabilidad de un sitio en todo el periodo o en un rango de muestras [from, to)
 * (por ejemplo, los días de una misión).
 */
export function siteViability(
  data: SiteData,
  vis: Pick<Visibility, 'lit' | 'contact'>,
  weights: Weights = DEFAULT_WEIGHTS,
  range?: { from: number; to: number },
  options: { missionSurvives?: boolean } = {},
): ViabilityResult {
  const from = range?.from ?? 0
  const to = range?.to ?? vis.lit.length
  return viability(
    { lightPct: percent(vis.lit, from, to), contactPct: percent(vis.contact, from, to), maxSlopeDeg: data.slope.max100mDeg },
    weights,
    options,
  )
}
