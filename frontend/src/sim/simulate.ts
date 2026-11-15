// Motor de simulación: la misión hora por hora (en pasos de stepHours), con los datos reales de luz y contacto.
//
// No inventa números: la energía sale de la fracción visible del disco solar sobre el relieve (horizonte del
// sitio) y los envíos, de las ventanas de contacto con la Tierra. Todo lo demás son los parámetros del módulo.

import { missionWindow } from '../lib/recommend.ts'
import { blockerPhrase, eclipseFraction, solarFraction, sunBlocker } from '../lib/sky.ts'
import { formatDurationLong, formatMissionClock, hoursBetween } from '../lib/time.ts'
import { contactSeries, litSeries, windowAt } from '../lib/visibility.ts'
import type { SiteData } from '../types'
import {
  CHARGE_EFFICIENCY,
  DISCHARGE_EFFICIENCY,
  MIN_SOC,
  RECOVERY_SOC,
  panelPeakW,
  type LanderConfig,
} from './lander.ts'

/** Radio aparente del Sol visto desde la Luna (grados). */
export const SUN_RADIUS_DEG = 0.2665

export type Mode = 'nominal' | 'survival' | 'failed'

/** Banderas de luz y contacto por muestra (de lib/visibility). Se pueden pasar ya calculadas. */
export interface Series {
  lit: boolean[]
  contact: boolean[]
}

export interface MissionPlan {
  /** Muestra de alunizaje */
  startIndex: number
  /** Duración en días */
  missionDays: number
}

export type EventType =
  | 'landing'
  | 'sun-set'
  | 'sun-rise'
  | 'contact-open'
  | 'contact-close'
  | 'survival'
  | 'recovered'
  | 'failure'
  | 'complete'
  | 'eclipse'

export interface SimEvent {
  /** Muestra del periodo en la que ocurre */
  index: number
  type: EventType
  message: string
}

export interface SimSummary {
  survived: boolean
  /** Muestra en la que la batería llegó al mínimo, o null si sobrevivió */
  failedAtIndex: number | null
  /** Batería más baja de la misión (%) */
  minSocPct: number
  /** Batería al final (o al fallar) (%) */
  endSocPct: number
  hoursInSurvival: number
  hoursSimulated: number
  dataGeneratedMb: number
  dataSentMb: number
  /** % de los datos generados que llegaron a la Tierra */
  dataSentPct: number
  /** Energía por encima del mínimo del 20 % en el peor momento (kWh) */
  energyMarginKWh: number
}

export interface SimResult {
  plan: MissionPlan
  /** Ventana simulada [from, to) del periodo */
  from: number
  to: number
  /** Series por paso, desde `from` (una muestra por paso simulado) */
  series: {
    index: number[]
    /** Carga de la batería (0–1) al final de cada paso */
    soc: number[]
    mode: Mode[]
    generatedW: number[]
    loadW: number[]
    /** Datos esperando ser enviados (Mb) */
    dataQueuedMb: number[]
    /** Datos enviados acumulados (Mb) */
    dataSentMb: number[]
  }
  events: SimEvent[]
  summary: SimSummary
}

/** Fracción visible del disco solar (0–1): lineal mientras el disco cruza el borde del relieve. */
export function sunFraction(clearance: number, radius = SUN_RADIUS_DEG): number {
  return Math.min(1, Math.max(0, (clearance + radius) / (2 * radius)))
}

/** Simula la misión. Función pura: mismos datos y parámetros, mismo resultado. */
export function simulate(data: SiteData, cfg: LanderConfig, plan: MissionPlan, precomputed?: Series): SimResult {
  const { from, to } = missionWindow(data, plan.startIndex, plan.missionDays)
  const dt = data.stepHours
  const capWh = cfg.batteryKWh * 1000
  const minWh = capWh * MIN_SOC
  const peak = panelPeakW(cfg)
  const lit = precomputed?.lit ?? litSeries(data)
  const contact = precomputed?.contact ?? contactSeries(data)
  const clock = (i: number) => formatMissionClock(data, i, from)

  const series: SimResult['series'] = { index: [], soc: [], mode: [], generatedW: [], loadW: [], dataQueuedMb: [], dataSentMb: [] }
  const events: SimEvent[] = []
  const event = (index: number, type: EventType, message: string) => events.push({ index, type, message })

  let energy = capWh
  let mode: Mode = 'nominal'
  let queued = 0
  let sent = 0
  let generated = 0
  let minEnergy = energy
  let survivalHours = 0
  let failedAt: number | null = null

  event(
    from,
    'landing',
    `${clock(from)}: alunizaje. ${lit[from] ? 'El Sol está a la vista' : 'El Sol está tapado por el relieve'} y ${contact[from] ? 'hay contacto con la Tierra' : 'no hay contacto con la Tierra'}.`,
  )

  for (let i = from; i < to; i++) {
    // Cambios de luz y de contacto respecto de la muestra anterior.
    if (i > from) {
      if (lit[i] !== lit[i - 1]) {
        // Dirección del Sol en la muestra con luz: ahí está el relieve que lo tapa o por donde se pone.
        const b = sunBlocker(data, lit[i] ? i : i - 1)
        const where = blockerPhrase(b)
        const ridge = b.elevationDeg > 0 && b.distanceKm !== null
        const text = lit[i] ? (ridge ? `vuelve el Sol: asoma ${where}` : `vuelve el Sol ${where}`) : ridge ? `el Sol se oculta ${where}` : `el Sol se pone ${where}`
        event(i, lit[i] ? 'sun-rise' : 'sun-set', `${clock(i)}: ${text}.`)
      }
      if (contact[i] !== contact[i - 1]) {
        if (contact[i]) {
          const w = windowAt(contact, i)!
          const hours = hoursBetween(data, i, Math.min(w.end, to))
          event(i, 'contact-open', `${clock(i)}: se abre la ventana de comunicación (${formatDurationLong(hours)}${w.end > to ? ' o más' : ''}).`)
        } else {
          event(i, 'contact-close', `${clock(i)}: se pierde el contacto con la Tierra.`)
        }
      }
    }

    // Eclipse: la Tierra empieza a tapar el Sol (solo importa si el Sol está a la vista).
    const ecl = lit[i] ? eclipseFraction(data, i) : 0
    if (ecl > 0 && (i === from || !lit[i - 1] || eclipseFraction(data, i - 1) === 0)) {
      let end = i
      let maxCover = ecl
      while (end < to && lit[end] && eclipseFraction(data, end) > 0) maxCover = Math.max(maxCover, eclipseFraction(data, end++))
      event(i, 'eclipse', `${clock(i)}: eclipse. La Tierra tapa hasta el ${Math.round(maxCover * 100)} % del Sol durante ${formatDurationLong(hoursBetween(data, i, end))}.`)
    }

    // Energía: parte del disco solar sobre el relieve, con su tamaño real y menos lo que tapa la Tierra en un eclipse.
    const frac = solarFraction(data, i)
    const gen = peak * frac
    const load = cfg.baseLoadW + (mode === 'nominal' ? cfg.instrumentLoadW : 0)
    const net = gen - load
    energy += net >= 0 ? net * dt * CHARGE_EFFICIENCY : (net * dt) / DISCHARGE_EFFICIENCY
    energy = Math.min(capWh, energy)

    // Datos: se generan en modo nominal y se envían si se ve la Tierra.
    if (mode === 'nominal') {
      const made = (cfg.dataPerDayMb / 24) * dt
      queued += made
      generated += made
    }
    if (contact[i]) {
      const out = Math.min(queued, cfg.downlinkMbPerHour * dt)
      queued -= out
      sent += out
    }
    if (mode === 'survival') survivalHours += dt

    // Falla o cambio de modo según la batería al final del paso.
    if (energy <= minWh) {
      energy = minWh
      mode = 'failed'
      failedAt = i
      event(i, 'failure', `${clock(i)}: falla. La batería llegó a su mínimo (20 %).`)
    } else if (mode === 'nominal' && energy / capWh < cfg.survivalThreshold) {
      mode = 'survival'
      event(i, 'survival', `${clock(i)}: batería al ${Math.round((100 * energy) / capWh)} %. Modo supervivencia: se apagan los instrumentos.`)
    } else if (mode === 'survival' && energy / capWh > RECOVERY_SOC) {
      mode = 'nominal'
      event(i, 'recovered', `${clock(i)}: batería al ${Math.round((100 * energy) / capWh)} %. Se encienden de nuevo los instrumentos.`)
    }
    minEnergy = Math.min(minEnergy, energy)

    series.index.push(i)
    series.soc.push(energy / capWh)
    series.mode.push(mode)
    series.generatedW.push(gen)
    series.loadW.push(load)
    series.dataQueuedMb.push(queued)
    series.dataSentMb.push(sent)

    if (mode === 'failed') break
  }

  const survived = failedAt === null
  if (survived) {
    event(to - 1, 'complete', `${clock(to - 1)}: misión cumplida. Se enviaron ${Math.round(generated > 0 ? (100 * sent) / generated : 100)} % de los datos.`)
  }

  return {
    plan,
    from,
    to,
    series,
    events,
    summary: {
      survived,
      failedAtIndex: failedAt,
      minSocPct: (100 * minEnergy) / capWh,
      endSocPct: (100 * energy) / capWh,
      hoursInSurvival: survivalHours,
      hoursSimulated: series.index.length * dt,
      dataGeneratedMb: generated,
      dataSentMb: sent,
      dataSentPct: generated > 0 ? (100 * sent) / generated : 100,
      energyMarginKWh: (minEnergy - minWh) / 1000,
    },
  }
}
