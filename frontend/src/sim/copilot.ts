// Copiloto de rescate: la IA decide qué probar y el simulador calcula.
//
// El modelo (OpenAI, a través de /api/copilot) solo propone combinaciones de palancas que existen después del
// despegue: esperar en órbita, cambiar de sitio, encender menos instrumentos y entrar antes en modo
// supervivencia. Cada propuesta se ejecuta aquí con `simulate()` y los datos reales (Horizons + LOLA). El plan
// final tiene que ser un intento que sobrevivió, y su explicación no puede traer cifras: los números que ve el
// usuario salen siempre del simulador.

import { formatDateTime, sampleTime, samplesFor } from '../lib/time.ts'
import type { SiteData } from '../types'
import type { Incident, IncidentOption } from './incident.ts'
import { PARAMETER_RANGES, type LanderConfig } from './lander.ts'
import { simulate, type Series, type SimResult } from './simulate.ts'

/** Simulaciones que puede pedir el modelo en una búsqueda. */
export const MAX_ATTEMPTS = 12
/** Vueltas de conversación con el modelo antes de cerrar con el mejor intento. */
export const MAX_TURNS = 8
/** Espera en órbita máxima que se permite probar (horas). */
export const MAX_WAIT_HOURS = 45 * 24
/** La explicación del plan no puede traer cifras: los números los pone la interfaz. */
export const MAX_RATIONALE_CHARS = 600
/** Un plan es «mejor» si envía más de un 2 % más de datos (por debajo de eso, decide la espera más corta). */
export const BETTER_MARGIN = 0.02

export interface CopilotSite { data: SiteData; series: Series }

export interface CopilotCase {
  /** Sitio del plan original */
  data: SiteData
  cfg: LanderConfig
  missionDays: number
  incident: Incident
  /** Sitios cargados con el mismo periodo de datos (incluido el original) */
  sites: CopilotSite[]
}

export interface Levers {
  siteId: string
  waitHours: number
  instrumentShare: number
  survivalThreshold: number
}

export interface Attempt extends Levers {
  id: number
  /** Salida sencilla del imprevisto, simulada antes de que empiece la IA: es el punto de partida */
  seed?: boolean
  /** Lo que el modelo quería comprobar */
  idea: string
  siteName: string
  startIndex: number
  cfg: LanderConfig
  result: SimResult
  series: Series
}

export interface CopilotPlan {
  attempt: Attempt
  /** Explicación del modelo, sin cifras; null si el plan lo eligió el simulador porque el modelo no cerró */
  rationale: string | null
}

// ---------------------------------------------------------------------------
// El caso que recibe el modelo
// ---------------------------------------------------------------------------

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const iso = (data: SiteData, i: number) => sampleTime(data, i).toISOString().slice(0, 16) + 'Z'

/** Sitios con el mismo periodo de datos que el original (el simulador los compara hora por hora). */
export function compatibleSites(data: SiteData, sites: CopilotSite[]): CopilotSite[] {
  return sites.filter((s) => s.data.start === data.start && s.data.stepHours === data.stepHours && s.data.sun.el.length === data.sun.el.length)
}

/** Espera máxima que cabe en el periodo de datos con la misión completa (horas). */
export function maxWaitHours(c: CopilotCase): number {
  const n = c.data.sun.el.length
  const len = samplesFor(c.data, c.missionDays * 24)
  const room = Math.max(0, n - len - c.incident.delayedStart) * c.data.stepHours
  return Math.min(MAX_WAIT_HOURS, room)
}

/** Mensaje inicial: el caso completo, en datos. El modelo no recibe nada más que esto y los resultados. */
export function buildBrief(c: CopilotCase, seeds: Attempt[] = []): string {
  const { data, cfg, incident } = c
  const brief = {
    mision: {
      sitioOriginal: data.site.id,
      diasEnSuperficie: c.missionDays,
      alunizajeOriginalUTC: iso(data, incident.delayedStart - samplesFor(data, incident.delayHours)),
      llegadaAtrasadaUTC: iso(data, incident.delayedStart),
      atrasoHoras: incident.delayHours,
      resultadoConAtraso: {
        sobrevive: incident.delayed.survived,
        bateriaMinimaPct: round(incident.delayed.minSocPct),
        fallaUTC: incident.delayed.failedAtIndex === null ? null : iso(data, incident.delayed.failedAtIndex),
        causa: incident.cause
          ? { sombraHoras: incident.cause.shadowHours, solSeOcultaHacia: incident.cause.compass, crestaKm: incident.cause.ridgeKm }
          : null,
      },
    },
    modulo: {
      bateriaKWh: cfg.batteryKWh,
      panelM2: cfg.panelAreaM2,
      eficienciaPanel: cfg.panelEfficiency,
      consumoSupervivenciaW: cfg.baseLoadW,
      consumoInstrumentosW: cfg.instrumentLoadW,
      datosPorDiaMb: cfg.dataPerDayMb,
      envioMbPorHora: cfg.downlinkMbPerHour,
      umbralSupervivencia: cfg.survivalThreshold,
    },
    sitios: compatibleSites(data, c.sites).map((s) => ({
      id: s.data.site.id,
      nombre: s.data.site.name,
      descripcion: s.data.site.description ?? '',
      pendienteMaxGrados: s.data.slope.max100mDeg,
    })),
    puntoDePartida: seeds.map((a) => attemptReport(c, a)),
    limites: {
      simulaciones: MAX_ATTEMPTS,
      esperaMaxHoras: maxWaitHours(c),
      pasoDeTiempoHoras: data.stepHours,
      instrumentos: [0.1, 1],
      umbralSupervivencia: [PARAMETER_RANGES.survivalThreshold.min, PARAMETER_RANGES.survivalThreshold.max],
    },
  }
  const target = bestAttempt(seeds)
  return [
    'Caso de la misión (datos del simulador). En "puntoDePartida" están las salidas sencillas, ya simuladas',
    '(cada una mueve una sola palanca) con su attemptId. Parte de la mejor y busca combinaciones que la mejoren:',
    'más datos enviados, o los mismos datos con menos espera. Si nada la supera, propón ese attemptId.',
    target ? `Meta: más de ${round(target.result.summary.dataSentMb / 1000, 2)} Gb enviados (attemptId ${target.id}).` : 'Ninguna salida sencilla sobrevive: cualquier plan que sobreviva ya es un rescate.',
    JSON.stringify(brief),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Herramientas (las ejecuta el navegador con el simulador real)
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const snap = (v: number, step: number) => Math.round(v / step) * step

/** Ajusta las palancas a lo que el simulador acepta (rangos y pasos). */
export function normalizeLevers(c: CopilotCase, raw: Partial<Record<keyof Levers, unknown>>): Levers | string {
  const sites = compatibleSites(c.data, c.sites)
  const siteId = typeof raw.siteId === 'string' ? raw.siteId : ''
  if (!sites.some((s) => s.data.site.id === siteId)) return `siteId desconocido: usa uno de ${sites.map((s) => s.data.site.id).join(', ')}.`
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  const r = PARAMETER_RANGES.survivalThreshold
  return {
    siteId,
    waitHours: clamp(snap(num(raw.waitHours, 0), c.data.stepHours), 0, maxWaitHours(c)),
    instrumentShare: round(clamp(snap(num(raw.instrumentShare, 1), 0.05), 0.1, 1), 2),
    survivalThreshold: round(clamp(snap(num(raw.survivalThreshold, c.cfg.survivalThreshold), r.step), r.min, r.max), 2),
  }
}

/** Módulo con las palancas aplicadas: menos instrumentos = menos consumo y menos datos, en la misma proporción. */
export function leverConfig(cfg: LanderConfig, l: Pick<Levers, 'instrumentShare' | 'survivalThreshold'>): LanderConfig {
  return {
    ...cfg,
    instrumentLoadW: cfg.instrumentLoadW * l.instrumentShare,
    dataPerDayMb: cfg.dataPerDayMb * l.instrumentShare,
    survivalThreshold: l.survivalThreshold,
  }
}

/** Corre un intento con el simulador real. */
export function runAttempt(c: CopilotCase, id: number, levers: Levers, idea: string): Attempt {
  const site = compatibleSites(c.data, c.sites).find((s) => s.data.site.id === levers.siteId)!
  const startIndex = c.incident.delayedStart + samplesFor(c.data, levers.waitHours)
  const cfg = leverConfig(c.cfg, levers)
  const result = simulate(site.data, cfg, { startIndex, missionDays: c.missionDays }, site.series)
  return { ...levers, id, idea: idea.slice(0, 140), siteName: site.data.site.name, startIndex: result.from, cfg, result, series: site.series }
}

const SEED_IDEA: Record<IncidentOption['kind'], string> = {
  wait: 'Salida sencilla: esperar en órbita',
  site: 'Salida sencilla: cambiar de sitio',
  save: 'Salida sencilla: encender menos instrumentos',
}

/** Las salidas sencillas del imprevisto, como intentos ya simulados: el punto de partida del copiloto. */
export function seedAttempts(c: CopilotCase): Attempt[] {
  return c.incident.options.map((o, k) => {
    // La fecha exacta de la salida, sin recortes: tiene que dar el mismo resultado que el imprevisto.
    const levers: Levers = {
      siteId: o.siteId,
      waitHours: (o.startIndex - c.incident.delayedStart) * c.data.stepHours,
      instrumentShare: o.instrumentShare ?? 1,
      survivalThreshold: c.cfg.survivalThreshold,
    }
    return { ...runAttempt(c, k + 1, levers, SEED_IDEA[o.kind]), seed: true }
  })
}

/** Lo que el modelo ve de un intento: solo resultados del simulador. */
export function attemptReport(c: CopilotCase, a: Attempt) {
  const s = a.result.summary
  return {
    attemptId: a.id,
    aplicado: { siteId: a.siteId, waitHours: a.waitHours, instrumentShare: a.instrumentShare, survivalThreshold: a.survivalThreshold },
    alunizajeUTC: iso(c.data, a.startIndex),
    sobrevive: s.survived,
    bateriaMinimaPct: round(s.minSocPct),
    datosEnviadosGb: round(s.dataSentMb / 1000, 2),
    datosEnviadosPctDeLoMedido: round(s.dataSentPct),
    horasConInstrumentosApagados: s.hoursInSurvival,
    fallaDiaDeMision: s.failedAtIndex === null ? null : Math.floor(((s.failedAtIndex - a.startIndex) * c.data.stepHours) / 24) + 1,
  }
}

/** El mejor intento según el criterio del copiloto: sobrevive, más datos enviados y, a igualdad, menos espera. */
export function bestAttempt(attempts: Attempt[]): Attempt | null {
  let best: Attempt | null = null
  for (const a of attempts) {
    if (!a.result.summary.survived) continue
    const d = best ? a.result.summary.dataSentMb - best.result.summary.dataSentMb : 1
    if (!best || d > 1e-6 || (Math.abs(d) <= 1e-6 && a.waitHours < best.waitHours)) best = a
  }
  return best
}

export interface ToolCall { id: string; type?: string; function: { name: string; arguments: string } }

export interface CopilotRun {
  attempts: Attempt[]
  plan: CopilotPlan | null
}

/**
 * Ejecuta una llamada de herramienta del modelo y devuelve el texto (JSON) de la respuesta.
 * Modifica `run`: agrega intentos o fija el plan.
 */
export function executeTool(c: CopilotCase, run: CopilotRun, call: ToolCall): string {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
  } catch {
    return JSON.stringify({ error: 'Los argumentos no son JSON válido.' })
  }

  if (call.function.name === 'simulate_plan') {
    const levers = normalizeLevers(c, args)
    if (typeof levers === 'string') return JSON.stringify({ error: levers })
    const same = run.attempts.find((a) => a.siteId === levers.siteId && a.waitHours === levers.waitHours && a.instrumentShare === levers.instrumentShare && a.survivalThreshold === levers.survivalThreshold)
    if (same) return JSON.stringify({ ...attemptReport(c, same), nota: 'Este intento ya estaba probado.' })
    if (run.attempts.filter((x) => !x.seed).length >= MAX_ATTEMPTS) return JSON.stringify({ error: 'Se acabó el presupuesto de simulaciones. Llama a propose_plan.' })
    const a = runAttempt(c, run.attempts.length + 1, levers, typeof args.idea === 'string' ? args.idea : '')
    run.attempts.push(a)
    return JSON.stringify(attemptReport(c, a))
  }

  if (call.function.name === 'propose_plan') {
    const a = run.attempts.find((x) => x.id === args.attemptId)
    if (!a) return JSON.stringify({ error: 'attemptId no existe. Elige uno de los intentos simulados.' })
    if (!a.result.summary.survived) return JSON.stringify({ error: 'Ese intento no sobrevive. Elige uno que sobreviva o simula otro.' })
    const rationale = typeof args.rationale === 'string' ? args.rationale.trim() : ''
    if (!rationale) return JSON.stringify({ error: 'Falta la explicación.' })
    if (/\d/.test(rationale)) return JSON.stringify({ error: 'La explicación no puede llevar cifras: la interfaz muestra los números. Reescríbela sin números.' })
    // Coherencia: no se recomienda un plan claramente peor que otro ya simulado (más del 2 % menos de datos).
    const best = bestAttempt(run.attempts)
    if (best && best.id !== a.id && best.result.summary.dataSentMb > a.result.summary.dataSentMb * (1 + BETTER_MARGIN)) {
      return JSON.stringify({ error: `El intento ${best.id} también sobrevive y envía más datos. Elige ese, o simula una combinación mejor.` })
    }
    run.plan = { attempt: a, rationale: rationale.slice(0, MAX_RATIONALE_CHARS) }
    return JSON.stringify({ ok: true })
  }

  return JSON.stringify({ error: `Herramienta desconocida: ${call.function.name}` })
}

// ---------------------------------------------------------------------------
// La conversación con el modelo
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type Send = (messages: ChatMessage[], signal?: AbortSignal) => Promise<{ content?: string | null; tool_calls?: ToolCall[] }>

export class CopilotError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'CopilotError'
    this.code = code
  }
}

/** Envío por defecto: la función de Vercel /api/copilot (la clave de OpenAI nunca llega al navegador). */
export const sendToApi: Send = async (messages, signal) => {
  let res: Response
  try {
    res = await fetch('/api/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new CopilotError('network', 'No hay conexión con el copiloto.')
  }
  const body = (await res.json().catch(() => null)) as { message?: { content?: string | null; tool_calls?: ToolCall[] }; error?: string } | null
  if (res.status === 503 && body?.error === 'not-configured') throw new CopilotError('not-configured', 'El copiloto no tiene configurada su clave en el servidor.')
  if (res.status === 404) throw new CopilotError('not-configured', 'El copiloto no está disponible en este servidor.')
  if (!res.ok || !body?.message) throw new CopilotError(body?.error ?? 'upstream', 'El copiloto no respondió. Prueba otra vez.')
  return body.message
}

/**
 * Busca un plan de rescate. Llama a `onUpdate` cada vez que hay un intento nuevo o un mensaje del modelo.
 * Si el modelo no cierra dentro de las vueltas permitidas, elige el simulador (el mejor intento que sobrevivió).
 */
export async function runCopilot(
  c: CopilotCase,
  { send = sendToApi, onUpdate, signal, maxTurns = MAX_TURNS }: { send?: Send; onUpdate?: (run: CopilotRun, thought: string | null) => void; signal?: AbortSignal; maxTurns?: number } = {},
): Promise<CopilotRun> {
  const run: CopilotRun = { attempts: seedAttempts(c), plan: null }
  onUpdate?.(run, null)
  const messages: ChatMessage[] = [{ role: 'user', content: buildBrief(c, run.attempts) }]
  for (let turn = 0; turn < maxTurns && !run.plan; turn++) {
    const reply = await send(messages, signal)
    const calls = (reply.tool_calls ?? []).filter((t) => t?.function?.name)
    messages.push({ role: 'assistant', content: reply.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) })
    const thought = reply.content?.trim() ? reply.content.trim() : null
    if (!calls.length) {
      messages.push({ role: 'user', content: 'Usa simulate_plan para comprobar ideas y termina con propose_plan.' })
      onUpdate?.(run, thought)
      continue
    }
    for (const call of calls) {
      signal?.throwIfAborted()
      messages.push({ role: 'tool', tool_call_id: call.id, content: executeTool(c, run, call) })
    }
    onUpdate?.(run, thought)
  }
  if (!run.plan) {
    const best = bestAttempt(run.attempts)
    if (best) run.plan = { attempt: best, rationale: null }
  }
  return run
}

/** Texto corto de las palancas de un intento, para la tarjeta. */
export function leverLabels(c: CopilotCase, a: Levers): string[] {
  const out: string[] = []
  if (a.siteId !== c.data.site.id) out.push(compatibleSites(c.data, c.sites).find((s) => s.data.site.id === a.siteId)?.data.site.name ?? a.siteId)
  else out.push('Mismo sitio')
  out.push(a.waitHours > 0 ? `Espera ${a.waitHours >= 48 ? `${round(a.waitHours / 24)} días` : `${a.waitHours} h`}` : 'Sin espera')
  out.push(a.instrumentShare < 1 ? `Instrumentos al ${Math.round(a.instrumentShare * 100)} %` : 'Todos los instrumentos')
  if (a.survivalThreshold !== c.cfg.survivalThreshold) out.push(`Ahorro desde ${Math.round(a.survivalThreshold * 100)} %`)
  return out
}

export const landingLabel = (c: CopilotCase, a: Attempt) => formatDateTime(sampleTime(c.data, a.startIndex))
