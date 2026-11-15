import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { bestPlanAttempt, buildPlanBrief, executePlanTool, lastStart, planHints, PLAN_MAX_ATTEMPTS, runPlanner, type PlanRequest, type PlanRun } from '../src/sim/aiPlanner.ts'
import type { Send, ToolCall } from '../src/sim/copilot.ts'
import { planRescueCase } from '../src/sim/incident.ts'
import { PRESETS } from '../src/sim/lander.ts'
import { seriesOf } from '../src/sim/search.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 30 * 24

/** Sol siempre salvo una noche de un día; la Tierra se ve solo 2 horas al día en «b» y siempre en «a». */
function site(id: string, darkDay: number, earthHalf = false): SiteData {
  return {
    site: { id, name: id.toUpperCase(), lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array(360).fill(0) },
    slope: { atSiteDeg: 0, max100mDeg: 1 },
    sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (i >= darkDay * 24 && i < (darkDay + 1) * 24 ? -2 : 2)) },
    earth: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (earthHalf && i % 24 < 22 ? -5 : 5)) },
  }
}

function request(): PlanRequest {
  const sites = [site('a', 5), site('b', 25, true)].map((data) => ({ data, series: seriesOf(data) }))
  return { sites, cfg: explorer, missionDays: 3, windowFrom: 0, windowTo: 10 * 24 }
}

let id = 0
const call = (name: string, args: unknown): ToolCall => ({ id: `p${++id}`, type: 'function', function: { name, arguments: JSON.stringify(args) } })
const sim = (siteId: string, date: string, hourUtc = 0) => call('simulate_plan', { siteId, date, hourUtc, idea: 'probar' })

describe('planificador con IA', () => {
  test('las pistas cuentan los horarios que sobreviven dentro de la ventana', () => {
    const req = request()
    const hints = planHints(req)
    assert.equal(hints.length, 2)
    const a = hints.find((h) => h.siteId === 'a')!
    const b = hints.find((h) => h.siteId === 'b')!
    assert.equal(a.total, b.total)
    assert.ok(a.ok < a.total, 'la noche del día 5 hace fallar algunos inicios en «a»')
    assert.equal(b.ok, b.total, 'en «b» la noche cae fuera de la ventana')
    const brief = JSON.parse(buildPlanBrief(req, hints).split('\n').at(-1)!)
    assert.equal(brief.sitios[0].pistas.de, a.total)
    assert.equal(brief.pedido.ventanaDeAlunizaje.desde, '2027-01-01')
  })

  test('simula solo dentro de la ventana y con fechas válidas', () => {
    const req = request()
    const run: PlanRun = { attempts: [], plan: null }
    assert.match(JSON.parse(executePlanTool(req, run, sim('a', '2027-03-01'))).error, /fuera de la ventana/)
    assert.match(JSON.parse(executePlanTool(req, run, sim('a', 'mañana'))).error, /AAAA-MM-DD/)
    assert.match(JSON.parse(executePlanTool(req, run, sim('zz', '2027-01-02'))).error, /desconocido/)
    const r = JSON.parse(executePlanTool(req, run, sim('a', '2027-01-04')))
    assert.equal(r.sobrevive, false)
    assert.equal(r.alunizajeUTC, '2027-01-04T00:00Z')
    assert.equal(run.attempts.length, 1)
    assert.ok(lastStart(req) <= req.windowTo)
  })

  test('el plan tiene que sobrevivir, sin cifras y sin ser peor que otro intento', () => {
    const req = request()
    const run: PlanRun = { attempts: [], plan: null }
    executePlanTool(req, run, sim('a', '2027-01-04')) // falla
    executePlanTool(req, run, sim('b', '2027-01-01')) // sobrevive, contacto a medias
    executePlanTool(req, run, sim('a', '2027-01-07')) // sobrevive, contacto completo: más datos
    assert.match(JSON.parse(executePlanTool(req, run, call('propose_plan', { attemptId: 1, rationale: 'x' }))).error, /no sobrevive/)
    assert.match(JSON.parse(executePlanTool(req, run, call('propose_plan', { attemptId: 3, rationale: 'Hay 3 días' }))).error, /cifras/)
    assert.match(JSON.parse(executePlanTool(req, run, call('propose_plan', { attemptId: 2, rationale: 'Mucha luz.' }))).error, /intento 3/)
    assert.deepEqual(JSON.parse(executePlanTool(req, run, call('propose_plan', { attemptId: 3, rationale: 'Luz y Tierra a la vista toda la misión.' }))), { ok: true })
    assert.equal(bestPlanAttempt(run.attempts)?.id, 3)
  })

  test('respeta el presupuesto y, si el modelo no cierra, elige el simulador', async () => {
    const req = request()
    let k = 0
    const send: Send = async () => ({ content: null, tool_calls: [sim(k % 2 ? 'a' : 'b', `2027-01-0${1 + (k++ % 8)}`, 6)] })
    const run = await runPlanner(req, { send, maxTurns: 4 })
    assert.equal(run.attempts.length, 4)
    assert.equal(run.plan?.rationale, null)
    assert.equal(run.plan?.attempt.id, bestPlanAttempt(run.attempts)!.id)
    assert.ok(PLAN_MAX_ATTEMPTS >= 4)
  })
})

describe('rescate de un plan que ya falla', () => {
  test('arma el caso con atraso cero y salidas simuladas', () => {
    const a = site('a', 1)
    const b = site('b', 20)
    const sites = [a, b].map((data) => ({ data, series: seriesOf(data) }))
    const c = planRescueCase({ data: a, cfg: explorer, startIndex: 0, missionDays: 3, sites })
    assert.ok(c)
    assert.equal(c.delayHours, 0)
    assert.equal(c.delayed.survived, false)
    assert.ok(c.options.length > 0)
    assert.ok(c.options.every((o) => o.summary.survived))
    assert.equal(planRescueCase({ data: b, cfg: explorer, startIndex: 0, missionDays: 3, sites }), null, 'si sobrevive no hay rescate')
  })
})
