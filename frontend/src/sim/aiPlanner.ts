// «Planéalo por mí»: la IA elige dónde y cuándo alunizar, y el simulador comprueba cada idea.
//
// El usuario da su módulo, los días en superficie y una ventana de fechas. El modelo (OpenAI, vía
// /api/copilot en modo "plan") propone sitios y fechas; cada propuesta se simula aquí con los datos reales
// (JPL Horizons + LOLA). El plan final tiene que ser un intento simulado que sobrevive, no puede ser claramente
// peor que otro ya probado y su explicación no lleva cifras.

import { missionWindow } from '../lib/recommend.ts'
import { formatDateTime, indexAt, sampleTime, samplesFor } from '../lib/time.ts'
import { DEFAULT_WEIGHTS, siteViability } from '../lib/viability.ts'
import type { SiteData } from '../types'
import { BETTER_MARGIN, makeSend, MAX_RATIONALE_CHARS, type ChatMessage, type Send, type ToolCall } from './copilot.ts'
import type { LanderConfig } from './lander.ts'
import { SCAN_STEP_HOURS } from './search.ts'
import { simulate, type Series, type SimResult } from './simulate.ts'

export const PLAN_MAX_ATTEMPTS = 10
export const PLAN_MAX_TURNS = 7

export interface PlanSite { data: SiteData; series: Series }

export interface PlanRequest {
  /** Sitios con el mismo periodo de datos */
  sites: PlanSite[]
  cfg: LanderConfig
  missionDays: number
  /** Ventana de alunizaje, en muestras del periodo: [from, to] */
  windowFrom: number
  windowTo: number
}

export interface PlanAttempt {
  id: number
  idea: string
  siteId: string
  siteName: string
  startIndex: number
  result: SimResult
  series: Series
  /** Viabilidad de la ventana de la misión (con el tope del 40 % si falla) */
  viability: number
}

export interface PlanRun {
  attempts: PlanAttempt[]
  plan: { attempt: PlanAttempt; rationale: string | null } | null
}

export interface SiteHint { siteId: string; name: string; ok: number; total: number }

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const ref = (req: PlanRequest) => req.sites[0].data
const iso = (data: SiteData, i: number) => sampleTime(data, i).toISOString().slice(0, 16) + 'Z'
const day = (data: SiteData, i: number) => sampleTime(data, i).toISOString().slice(0, 10)

/** Último inicio posible: la misión completa tiene que caber en los datos. */
export function lastStart(req: PlanRequest): number {
  const d = ref(req)
  return Math.min(req.windowTo, d.sun.el.length - samplesFor(d, req.missionDays * 24))
}

/** Pistas para el modelo: cuántos horarios de alunizaje (cada 6 h) sobreviven en cada sitio dentro de la ventana. */
export function planHints(req: PlanRequest): SiteHint[] {
  const step = Math.max(1, samplesFor(ref(req), SCAN_STEP_HOURS))
  const last = lastStart(req)
  return req.sites.map(({ data, series }) => {
    let ok = 0
    let total = 0
    for (let s = req.windowFrom; s <= last; s += step) {
      total++
      if (simulate(data, req.cfg, { startIndex: s, missionDays: req.missionDays }, series).summary.survived) ok++
    }
    return { siteId: data.site.id, name: data.site.name, ok, total }
  })
}

export function buildPlanBrief(req: PlanRequest, hints: SiteHint[]): string {
  const d = ref(req)
  const { cfg } = req
  const brief = {
    pedido: {
      diasEnSuperficie: req.missionDays,
      ventanaDeAlunizaje: { desde: day(d, req.windowFrom), hasta: day(d, lastStart(req)) },
      horasPosiblesUTC: [0, 6, 12, 18],
    },
    modulo: {
      bateriaKWh: cfg.batteryKWh, panelM2: cfg.panelAreaM2, eficienciaPanel: cfg.panelEfficiency,
      consumoSupervivenciaW: cfg.baseLoadW, consumoInstrumentosW: cfg.instrumentLoadW,
      datosPorDiaMb: cfg.dataPerDayMb, envioMbPorHora: cfg.downlinkMbPerHour,
    },
    sitios: req.sites.map(({ data }) => {
      const h = hints.find((x) => x.siteId === data.site.id)
      return {
        id: data.site.id,
        nombre: data.site.name,
        descripcion: data.site.description ?? '',
        pendienteMaxGrados: data.slope.max100mDeg,
        pistas: h ? { horariosQueSobreviven: h.ok, de: h.total } : null,
      }
    }),
    limites: { simulaciones: PLAN_MAX_ATTEMPTS },
  }
  return `Pedido del usuario (datos del simulador). Encuentra el mejor sitio y la mejor fecha dentro de la ventana.\n${JSON.stringify(brief)}`
}

function viabilityOf(site: PlanSite, startIndex: number, missionDays: number, survived: boolean): number {
  return siteViability(site.data, site.series, DEFAULT_WEIGHTS, missionWindow(site.data, startIndex, missionDays), { missionSurvives: survived }).score
}

export function runPlanAttempt(req: PlanRequest, id: number, siteId: string, startIndex: number, idea: string): PlanAttempt | string {
  const site = req.sites.find((s) => s.data.site.id === siteId)
  if (!site) return `siteId desconocido: usa uno de ${req.sites.map((s) => s.data.site.id).join(', ')}.`
  const result = simulate(site.data, req.cfg, { startIndex, missionDays: req.missionDays }, site.series)
  return {
    id, idea: idea.slice(0, 140), siteId, siteName: site.data.site.name, startIndex: result.from, result, series: site.series,
    viability: viabilityOf(site, result.from, req.missionDays, result.summary.survived),
  }
}

export function planReport(req: PlanRequest, a: PlanAttempt) {
  const s = a.result.summary
  return {
    attemptId: a.id,
    sitio: a.siteId,
    alunizajeUTC: iso(ref(req), a.startIndex),
    sobrevive: s.survived,
    bateriaMinimaPct: round(s.minSocPct),
    datosEnviadosGb: round(s.dataSentMb / 1000, 2),
    viabilidad: Math.round(a.viability),
    fallaDiaDeMision: s.failedAtIndex === null ? null : Math.floor(((s.failedAtIndex - a.startIndex) * ref(req).stepHours) / 24) + 1,
  }
}

/** El mejor intento: sobrevive, más datos (por encima del margen) y, si no, más batería de margen. */
export function bestPlanAttempt(attempts: PlanAttempt[]): PlanAttempt | null {
  let best: PlanAttempt | null = null
  for (const a of attempts) {
    if (!a.result.summary.survived) continue
    if (!best) { best = a; continue }
    const da = a.result.summary.dataSentMb
    const db = best.result.summary.dataSentMb
    if (da > db * (1 + BETTER_MARGIN) || (da >= db * (1 - BETTER_MARGIN) && a.result.summary.minSocPct > best.result.summary.minSocPct + 1e-9)) best = a
  }
  return best
}

export function executePlanTool(req: PlanRequest, run: PlanRun, call: ToolCall): string {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
  } catch {
    return JSON.stringify({ error: 'Los argumentos no son JSON válido.' })
  }
  const d = ref(req)

  if (call.function.name === 'simulate_plan') {
    const date = typeof args.date === 'string' ? args.date : ''
    const hour = typeof args.hourUtc === 'number' ? args.hourUtc : 0
    const t = Date.parse(`${date}T00:00:00Z`)
    if (!Number.isFinite(t) || ![0, 6, 12, 18].includes(hour)) return JSON.stringify({ error: 'date debe ser AAAA-MM-DD y hourUtc 0, 6, 12 o 18.' })
    const start = indexAt(d, t + hour * 3_600_000, d.sun.el.length)
    if (start < req.windowFrom || start > lastStart(req)) {
      return JSON.stringify({ error: `La fecha está fuera de la ventana (${day(d, req.windowFrom)} a ${day(d, lastStart(req))}).` })
    }
    const siteId = typeof args.siteId === 'string' ? args.siteId : ''
    const same = run.attempts.find((a) => a.siteId === siteId && a.startIndex === start)
    if (same) return JSON.stringify({ ...planReport(req, same), nota: 'Este intento ya estaba probado.' })
    if (run.attempts.length >= PLAN_MAX_ATTEMPTS) return JSON.stringify({ error: 'Se acabó el presupuesto de simulaciones. Llama a propose_plan.' })
    const a = runPlanAttempt(req, run.attempts.length + 1, siteId, start, typeof args.idea === 'string' ? args.idea : '')
    if (typeof a === 'string') return JSON.stringify({ error: a })
    run.attempts.push(a)
    return JSON.stringify(planReport(req, a))
  }

  if (call.function.name === 'propose_plan') {
    const a = run.attempts.find((x) => x.id === args.attemptId)
    if (!a) return JSON.stringify({ error: 'attemptId no existe. Elige uno de los intentos simulados.' })
    if (!a.result.summary.survived) return JSON.stringify({ error: 'Ese intento no sobrevive. Elige uno que sobreviva o simula otro.' })
    const rationale = typeof args.rationale === 'string' ? args.rationale.trim() : ''
    if (!rationale) return JSON.stringify({ error: 'Falta la explicación.' })
    if (/\d/.test(rationale)) return JSON.stringify({ error: 'La explicación no puede llevar cifras: la interfaz muestra los números. Reescríbela sin números.' })
    const best = bestPlanAttempt(run.attempts)
    if (best && best.id !== a.id && best.result.summary.dataSentMb > a.result.summary.dataSentMb * (1 + BETTER_MARGIN)) {
      return JSON.stringify({ error: `El intento ${best.id} también sobrevive y envía más datos. Elige ese, o simula una opción mejor.` })
    }
    run.plan = { attempt: a, rationale: rationale.slice(0, MAX_RATIONALE_CHARS) }
    return JSON.stringify({ ok: true })
  }

  return JSON.stringify({ error: `Herramienta desconocida: ${call.function.name}` })
}

/** Busca el plan. Si el modelo no cierra a tiempo, elige el simulador (el mejor intento que sobrevivió). */
export async function runPlanner(
  req: PlanRequest,
  { send = makeSend('plan'), onUpdate, signal, maxTurns = PLAN_MAX_TURNS, hints = planHints(req) }:
  { send?: Send; onUpdate?: (run: PlanRun) => void; signal?: AbortSignal; maxTurns?: number; hints?: SiteHint[] } = {},
): Promise<PlanRun> {
  const run: PlanRun = { attempts: [], plan: null }
  const messages: ChatMessage[] = [{ role: 'user', content: buildPlanBrief(req, hints) }]
  for (let turn = 0; turn < maxTurns && !run.plan; turn++) {
    const reply = await send(messages, signal)
    const calls = (reply.tool_calls ?? []).filter((t) => t?.function?.name)
    messages.push({ role: 'assistant', content: reply.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) })
    if (!calls.length) {
      messages.push({ role: 'user', content: 'Usa simulate_plan para comprobar ideas y termina con propose_plan.' })
      continue
    }
    for (const call of calls) {
      signal?.throwIfAborted()
      messages.push({ role: 'tool', tool_call_id: call.id, content: executePlanTool(req, run, call) })
    }
    onUpdate?.({ attempts: [...run.attempts], plan: run.plan })
  }
  if (!run.plan) {
    const best = bestPlanAttempt(run.attempts)
    if (best) run.plan = { attempt: best, rationale: null }
  }
  return run
}

export const planLanding = (req: PlanRequest, a: PlanAttempt) => formatDateTime(sampleTime(ref(req), a.startIndex))
