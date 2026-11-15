// Control de misión: cada suceso de la simulación se muestra como «qué pasó» y «qué hacemos», con los números del
// propio simulador. No hay modelo de lenguaje aquí: todo sale de `SimResult`, la luz y el contacto calculados.

import { formatDateTime, formatDurationLong, sampleTime } from '../lib/time.ts'
import type { SiteData } from '../types'
import type { IncidentOption } from './incident.ts'
import type { SimEvent, SimResult } from './simulate.ts'

export type Tone = 'info' | 'warn' | 'fail' | 'ok'

export interface ControlMessage {
  index: number
  tone: Tone
  /** Qué pasó */
  problem: string
  /** Qué hacemos */
  response: string
}

export interface ControlContext {
  data: SiteData
  result: SimResult
  lit: boolean[]
  contact: boolean[]
  /** Umbral del modo ahorro (fracción) */
  survivalThreshold: number
  /** La mejor salida simulada si la misión falla (para «así lo resolvemos») */
  fix: IncidentOption | null
}

const pct = (soc: number) => `${Math.round(soc * 100)} %`
const gb = (mb: number) => `${(mb / 1000).toFixed(1)} Gb`

/** Primera muestra después de `i` en la que `flags` vale `value`, o null. */
function nextWhere(flags: boolean[], i: number, value: boolean): number | null {
  for (let k = i + 1; k < flags.length; k++) if (flags[k] === value) return k
  return null
}

function k(ctx: ControlContext, i: number) {
  return Math.max(0, Math.min(ctx.result.series.soc.length - 1, i - ctx.result.from))
}

/** «Así lo resolvemos»: la mejor salida simulada, en una frase con sus números. */
export function fixText(ctx: ControlContext): string {
  const o = ctx.fix
  if (!o) return 'Con este módulo no hay una salida sencilla: hace falta más batería o más panel, u otra fecha (mira el mapa de supervivencia).'
  const when = formatDateTime(sampleTime(ctx.data, o.startIndex))
  const what = o.kind === 'site' ? `alunizar en ${o.siteName} en la misma fecha`
    : o.kind === 'wait' ? `esperar en órbita ${formatDurationLong((o.waitDays ?? 0) * 24)} y alunizar el ${when}`
    : `encender solo el ${Math.round((o.instrumentShare ?? 1) * 100)} % de los instrumentos`
  return `${what.charAt(0).toUpperCase()}${what.slice(1)}: sobrevive y envía ${gb(o.summary.dataSentMb)} a la Tierra.`
}

export function controlMessage(ctx: ControlContext, e: SimEvent): ControlMessage | null {
  const { data, result, lit, contact } = ctx
  const { series, events, summary } = result
  // Fin planeado de la misión (si falla, la simulación se corta antes)
  const end = result.to - 1
  const date = (i: number) => formatDateTime(sampleTime(data, i))
  const span = (a: number, b: number) => formatDurationLong((b - a) * data.stepHours)
  const i = e.index
  const at = (type: SimEvent['type'], a: number, b: number) => events.find((x) => x.type === type && x.index >= a && x.index <= b)

  switch (e.type) {
    case 'landing': {
      const sun = lit[i] ? 'el panel recibe Sol' : 'llegamos a oscuras y usamos la batería'
      const earth = contact[i] ? 'hay contacto con la Tierra' : 'la Tierra todavía no se ve'
      return { index: i, tone: 'info', problem: `Alunizaje en ${data.site.name}.`, response: `${sun.charAt(0).toUpperCase()}${sun.slice(1)} y ${earth}. Batería al ${pct(series.soc[k(ctx, i)])}.` }
    }
    case 'sun-set': {
      const back = nextWhere(lit, i, true)
      const limit = Math.min(back ?? end, end)
      const shadow = back === null ? 'una sombra que dura más que los datos' : `una sombra de ${span(i, back)}`
      const fail = at('failure', i, limit)
      const save = at('survival', i, limit)
      const response = fail
        ? `Viene ${shadow}. La batería no alcanza: llegaría al 20 % el ${date(fail.index)}. Así lo resolvemos: ${fixText(ctx).replace(/^./, (c) => c.toLowerCase())}`
        : save
          ? `Viene ${shadow}. Pasamos a batería; el ${date(save.index)} entramos en modo ahorro para llegar hasta que vuelva el Sol.`
          : back !== null && back <= end
            ? `Viene ${shadow}. Pasamos a batería: alcanza, y estará al ${pct(series.soc[k(ctx, back)])} cuando vuelva el Sol.`
            : `Viene ${shadow}. Pasamos a batería: alcanza hasta el final de la misión.`
      return { index: i, tone: fail ? 'fail' : 'warn', problem: 'El Sol se oculta tras el relieve.', response }
    }
    case 'sun-rise':
      return { index: i, tone: 'ok', problem: 'Vuelve el Sol.', response: `El panel genera ${Math.round(series.generatedW[k(ctx, i)])} W otra vez y la batería empieza a cargar.` }
    case 'contact-close': {
      const back = nextWhere(contact, i, true)
      const when = back === null || back > end ? 'después del final de la misión' : `en ${span(i, back)} (${date(back)})`
      return { index: i, tone: 'warn', problem: 'Perdemos contacto con la Tierra.', response: `Guardamos los datos a bordo (${gb(series.dataQueuedMb[k(ctx, i)])} en espera). La Tierra vuelve ${when}.` }
    }
    case 'contact-open':
      return { index: i, tone: 'ok', problem: 'Contacto con la Tierra.', response: `Enviamos los datos que esperaban: ${gb(series.dataQueuedMb[Math.max(0, k(ctx, i) - 1)])}.` }
    case 'survival': {
      const back = nextWhere(lit, i, true)
      // El cambio de modo se aplica en la hora siguiente: antes, consumo normal; después, solo supervivencia.
      const nominal = Math.round(series.loadW[k(ctx, i)])
      const base = Math.round(series.loadW[Math.min(series.loadW.length - 1, k(ctx, i) + 1)])
      return {
        index: i, tone: 'warn',
        problem: `Batería al ${pct(ctx.survivalThreshold)}: modo ahorro.`,
        response: `Apagamos los instrumentos: el consumo baja de ${nominal} W a ${base} W.${back !== null && back <= end && !lit[i] ? ` El Sol vuelve en ${span(i, back)}.` : ''}`,
      }
    }
    case 'recovered':
      return { index: i, tone: 'ok', problem: 'Batería recuperada.', response: 'Encendemos de nuevo los instrumentos y seguimos midiendo.' }
    case 'failure':
      return { index: i, tone: 'fail', problem: 'La batería llegó al 20 %: la misión falla.', response: `Así lo resolvemos: ${fixText(ctx).replace(/^./, (c) => c.toLowerCase())}` }
    case 'eclipse':
      return { index: i, tone: 'info', problem: 'Eclipse: la Tierra tapa el Sol.', response: 'El panel pierde potencia mientras dura; la batería cubre la diferencia.' }
    case 'complete':
      return { index: i, tone: 'ok', problem: 'Misión cumplida.', response: `Sobrevivió los ${result.plan.missionDays} días y envió ${gb(summary.dataSentMb)} a la Tierra.` }
  }
  return null
}

/** Mensajes de los sucesos hasta `index`, del más reciente al más antiguo. */
export function controlFeed(ctx: ControlContext, index: number): ControlMessage[] {
  return ctx.result.events
    .filter((e) => e.index <= index)
    .map((e) => controlMessage(ctx, e))
    .filter((m): m is ControlMessage => m !== null)
    .reverse()
}
