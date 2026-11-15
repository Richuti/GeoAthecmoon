// Imprevisto en el alunizaje (SU7): "una corrección de trayectoria atrasa la llegada". El escenario es
// simulado, pero su tamaño y sus consecuencias salen de los datos: el atraso es el primero que hace fallar la
// misión (la tolerancia a atrasos más un paso de búsqueda), y cada salida que se propone está simulada.
//
// Responde la pregunta del reto, "si la misión se atrasa, ¿todavía funciona?", y la que sigue: "¿qué hago?".

import { missionWindow } from '../lib/recommend.ts'
import { compassPoint, sunBlocker } from '../lib/sky.ts'
import { samplesFor } from '../lib/time.ts'
import { windowAt } from '../lib/visibility.ts'
import type { SiteData } from '../types'
import type { LanderConfig } from './lander.ts'
import { delayTolerance, SCAN_STEP_HOURS, seriesOf } from './search.ts'
import { simulate, type Series, type SimSummary } from './simulate.ts'

/** Atraso que se muestra si la misión no falla con ningún atraso dentro del periodo (días). */
export const DEFAULT_DELAY_DAYS = 5

/** Fracciones del consumo de instrumentos que se prueban para la salida "ahorrar energía" (con 0 no hay misión). */
export const SAVING_STEPS = [0.75, 0.5, 0.25]

export type OptionKind = 'wait' | 'site' | 'save'

export interface IncidentOption {
  kind: OptionKind
  /** Inicio de la misión con esta salida */
  startIndex: number
  siteId: string
  siteName: string
  /** Módulo con esta salida (igual al original, salvo en "ahorrar energía") */
  cfg: LanderConfig
  summary: SimSummary
  /** Días de espera desde la llegada atrasada (solo "esperar") */
  waitDays?: number
  /** Fracción del consumo de instrumentos que queda encendida (solo "ahorrar energía") */
  instrumentShare?: number
}

export interface FailureCause {
  /** Muestra en la que el Sol se ocultó por última vez antes de la falla, o null si la misión aterrizó a oscuras */
  sunsetIndex: number | null
  /** Horas de sombra que empiezan en esa puesta (o en el alunizaje), dentro del periodo */
  shadowHours: number
  /** Azimut del Sol al ocultarse (grados) y su rumbo (N, NE, ...) */
  sunAzimuthDeg: number
  compass: string
  /**
   * Elevación del relieve en esa dirección (grados). Si es mayor que 0, una cresta tapa el Sol; si no, el Sol
   * se pone bajo el horizonte (el terreno en esa dirección queda por debajo del sitio).
   */
  ridgeElevationDeg: number
  /** Distancia al punto del relieve que limita la vista (km) y su altura sobre el sitio (m), si los datos la traen */
  ridgeKm: number | null
  ridgeHeightM: number | null
}

export interface Incident {
  /** Atraso de la llegada (horas) */
  delayHours: number
  /** true si el atraso es el primero que hace fallar la misión; false si no falla con ningún atraso probado */
  breaksMission: boolean
  /** Resultado del plan original */
  original: SimSummary
  /** Nuevo inicio con el atraso */
  delayedStart: number
  /** Resultado con el atraso */
  delayed: SimSummary
  /** Por qué falla con el atraso (null si sobrevive) */
  cause: FailureCause | null
  /** Salidas comprobadas que sobreviven, en este orden: esperar, cambiar de sitio, ahorrar energía */
  options: IncidentOption[]
}

export interface IncidentInput {
  data: SiteData
  cfg: LanderConfig
  startIndex: number
  missionDays: number
  /** Todos los sitios cargados (incluido el actual), para la salida "cambiar de sitio" */
  sites: Array<{ data: SiteData; series?: Series }>
  series?: Series
}

/** Por qué falló una simulación: la última puesta de Sol antes de la falla y el relieve que lo tapó. */
export function failureCause(data: SiteData, from: number, failedAt: number, series: Series): FailureCause {
  let sunsetIndex: number | null = null
  for (let i = failedAt; i > from; i--) {
    if (series.lit[i - 1] && !series.lit[i]) {
      sunsetIndex = i
      break
    }
  }
  const at = sunsetIndex ?? from
  const shade = series.lit[at] ? null : windowAt(series.lit, at)
  const shadowHours = shade ? (shade.end - shade.start) * data.stepHours : 0
  // Dirección del Sol justo antes de ocultarse: ahí está la cresta que lo tapa.
  const look = sunsetIndex !== null ? sunsetIndex - 1 : at
  const b = sunBlocker(data, look)
  return {
    sunsetIndex,
    shadowHours,
    sunAzimuthDeg: data.sun.az[look],
    compass: compassPoint(data.sun.az[look]),
    ridgeElevationDeg: b.elevationDeg,
    ridgeKm: b.distanceKm,
    ridgeHeightM: b.heightM,
  }
}

/**
 * Arma el imprevisto. Devuelve null si el plan original ya falla (no hace falta un imprevisto para mostrar
 * el problema) o si no cabe ningún atraso en el periodo.
 */
export function planDelayIncident(input: IncidentInput): Incident | null {
  const { data, cfg, missionDays } = input
  const series = input.series ?? seriesOf(data)
  const n = data.sun.el.length
  const { from, to } = missionWindow(data, input.startIndex, missionDays)
  const len = to - from
  const step = Math.max(1, samplesFor(data, SCAN_STEP_HOURS))

  const original = simulate(data, cfg, { startIndex: from, missionDays }, series).summary
  if (!original.survived) return null

  const tol = delayTolerance(data, cfg, from, missionDays, series)
  const breaksMission = !tol.limitedByPeriod
  const delaySamples = breaksMission
    ? samplesFor(data, tol.days * 24) + step
    : Math.min(samplesFor(data, DEFAULT_DELAY_DAYS * 24), n - len - from)
  if (delaySamples <= 0 || from + delaySamples + len > n) return null

  const delayedStart = from + delaySamples
  const delayedRun = simulate(data, cfg, { startIndex: delayedStart, missionDays }, series)
  const delayed = delayedRun.summary
  const cause = delayed.survived || delayed.failedAtIndex === null ? null : failureCause(data, delayedStart, delayed.failedAtIndex, series)

  const options: IncidentOption[] = []
  if (!delayed.survived) {
    // 1. Esperar en órbita: el primer inicio después de la llegada atrasada que sobrevive.
    for (let s = delayedStart + step; s + len <= n; s += step) {
      const r = simulate(data, cfg, { startIndex: s, missionDays }, series).summary
      if (r.survived) {
        options.push({ kind: 'wait', startIndex: s, siteId: data.site.id, siteName: data.site.name, cfg, summary: r, waitDays: ((s - delayedStart) * data.stepHours) / 24 })
        break
      }
    }

    // 2. Cambiar de sitio con la misma llegada: entre los que sobreviven, el que envía más datos.
    let bestSite: IncidentOption | null = null
    for (const s of input.sites) {
      const d = s.data
      if (d.site.id === data.site.id || d.start !== data.start || d.stepHours !== data.stepHours || d.sun.el.length !== n) continue
      const r = simulate(d, cfg, { startIndex: delayedStart, missionDays }, s.series ?? seriesOf(d)).summary
      if (r.survived && (!bestSite || r.dataSentPct > bestSite.summary.dataSentPct + 1e-9)) {
        bestSite = { kind: 'site', startIndex: delayedStart, siteId: d.site.id, siteName: d.site.name, cfg, summary: r }
      }
    }
    if (bestSite) options.push(bestSite)

    // 3. Ahorrar energía en el mismo sitio y la misma llegada: encender menos instrumentos (menos consumo y
    //    menos datos, en la misma proporción). Se elige la mayor parte encendida que todavía sobrevive.
    for (const share of SAVING_STEPS) {
      const saving: LanderConfig = { ...cfg, instrumentLoadW: cfg.instrumentLoadW * share, dataPerDayMb: cfg.dataPerDayMb * share }
      const r = simulate(data, saving, { startIndex: delayedStart, missionDays }, series).summary
      if (r.survived) {
        options.push({ kind: 'save', startIndex: delayedStart, siteId: data.site.id, siteName: data.site.name, cfg: saving, summary: r, instrumentShare: share })
        break
      }
    }
  }

  return { delayHours: delaySamples * data.stepHours, breaksMission, original, delayedStart, delayed, cause, options }
}
