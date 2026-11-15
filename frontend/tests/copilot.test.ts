import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { POST, SYSTEM_PROMPT, TOOLS, validMessages } from '../api/copilot.ts'
import {
  bestAttempt, buildBrief, executeTool, leverConfig, MAX_ATTEMPTS, normalizeLevers, runCopilot, seedAttempts,
  type ChatMessage, type CopilotCase, type CopilotRun, type Send, type ToolCall,
} from '../src/sim/copilot.ts'
import { planDelayIncident } from '../src/sim/incident.ts'
import { PRESETS } from '../src/sim/lander.ts'
import { seriesOf } from '../src/sim/search.ts'
import type { SiteData } from '../src/types.ts'

const explorer = PRESETS.explorer.config
const N = 30 * 24

/** Sol siempre, salvo un día de sombra (días 10 a 11): más largo que lo que aguanta la batería del explorador. */
function site(id: string, dark: (i: number) => boolean): SiteData {
  return {
    site: { id, name: id.toUpperCase(), lat: -89, lon: 0, category: 'custom' },
    start: '2027-01-01T00:00:00Z',
    stepHours: 1,
    horizon: { azimuthStepDeg: 1, elevationDeg: Array.from({ length: 360 }, () => 0) },
    slope: { atSiteDeg: 0, max100mDeg: 1 },
    sun: { az: Array(N).fill(0), el: Array.from({ length: N }, (_, i) => (dark(i) ? -2 : 2)) },
    earth: { az: Array(N).fill(0), el: Array(N).fill(5) },
  }
}

function makeCase(): CopilotCase {
  const a = site('a', (i) => i >= 10 * 24 && i < 11 * 24)
  const b = site('b', (i) => i >= 20 * 24 && i < 21 * 24)
  const sites = [a, b].map((data) => ({ data, series: seriesOf(data) }))
  const incident = planDelayIncident({ data: a, cfg: explorer, startIndex: 0, missionDays: 3, sites })
  assert.ok(incident && incident.breaksMission && !incident.delayed.survived, 'el caso de prueba debe fallar con el atraso')
  return { data: a, cfg: explorer, missionDays: 3, incident, sites }
}

let callId = 0
const call = (name: string, args: unknown): ToolCall => ({ id: `c${++callId}`, type: 'function', function: { name, arguments: JSON.stringify(args) } })
const sim = (siteId: string, waitHours: number, instrumentShare = 1, survivalThreshold = 0.4) =>
  call('simulate_plan', { siteId, waitHours, instrumentShare, survivalThreshold, idea: 'probar' })

describe('copiloto: herramientas con el simulador real', () => {
  test('el caso que recibe el modelo trae la misión, el módulo, los sitios y las salidas sencillas', () => {
    const c = makeCase()
    const brief = JSON.parse(buildBrief(c, seedAttempts(c)).split('\n').at(-1)!)
    assert.equal(brief.mision.sitioOriginal, 'a')
    assert.equal(brief.sitios.length, 2)
    assert.equal(brief.modulo.bateriaKWh, explorer.batteryKWh)
    assert.equal(brief.puntoDePartida.length, c.incident.options.length)
    assert.equal(brief.puntoDePartida[0].attemptId, 1)
    assert.equal(brief.limites.simulaciones, MAX_ATTEMPTS)
  })

  test('las salidas sencillas son el punto de partida y dan lo mismo que el imprevisto', () => {
    const c = makeCase()
    const seeds = seedAttempts(c)
    assert.equal(seeds.length, c.incident.options.length)
    seeds.forEach((s, k) => {
      assert.equal(s.seed, true)
      assert.equal(s.id, k + 1)
      assert.equal(s.result.summary.survived, c.incident.options[k].summary.survived)
      assert.ok(Math.abs(s.result.summary.dataSentMb - c.incident.options[k].summary.dataSentMb) < 1e-6)
    })
  })

  test('normaliza las palancas a los rangos del simulador y rechaza sitios desconocidos', () => {
    const c = makeCase()
    const l = normalizeLevers(c, { siteId: 'a', waitHours: -5, instrumentShare: 3, survivalThreshold: 0.9 })
    assert.deepEqual(l, { siteId: 'a', waitHours: 0, instrumentShare: 1, survivalThreshold: 0.55 })
    assert.match(normalizeLevers(c, { siteId: 'zz' }) as string, /desconocido/)
  })

  test('menos instrumentos = menos consumo y menos datos en la misma proporción', () => {
    const cfg = leverConfig(explorer, { instrumentShare: 0.5, survivalThreshold: 0.3 })
    assert.equal(cfg.instrumentLoadW, explorer.instrumentLoadW / 2)
    assert.equal(cfg.dataPerDayMb, explorer.dataPerDayMb / 2)
    assert.equal(cfg.survivalThreshold, 0.3)
    assert.equal(cfg.batteryKWh, explorer.batteryKWh)
  })

  test('simulate_plan corre el simulador y no repite intentos iguales', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    const r1 = JSON.parse(executeTool(c, run, sim('a', 0)))
    assert.equal(r1.sobrevive, false)
    assert.equal(r1.attemptId, 1)
    const r2 = JSON.parse(executeTool(c, run, sim('a', 0)))
    assert.equal(r2.attemptId, 1)
    assert.equal(run.attempts.length, 1)
    const r3 = JSON.parse(executeTool(c, run, sim('b', 0)))
    assert.equal(r3.sobrevive, true)
  })

  test('propose_plan exige un intento que sobreviva y una explicación sin cifras', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    executeTool(c, run, sim('a', 0))
    executeTool(c, run, sim('b', 0))
    assert.match(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 1, rationale: 'x' }))).error, /no sobrevive/)
    assert.match(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 9, rationale: 'x' }))).error, /no existe/)
    assert.match(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 2, rationale: 'Envía 3 Gb' }))).error, /cifras/)
    assert.equal(run.plan, null)
    assert.deepEqual(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 2, rationale: 'En ese sitio no hay sombra durante la misión.' }))), { ok: true })
    assert.equal((run.plan as CopilotRun['plan'])?.attempt.siteId, 'b')
  })

  test('no acepta un plan claramente peor que otro ya simulado', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    executeTool(c, run, sim('b', 0, 0.3))
    executeTool(c, run, sim('b', 0, 1))
    assert.match(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 1, rationale: 'Menos consumo.' }))).error, /intento 2/)
    assert.deepEqual(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 2, rationale: 'Todo encendido y sin sombra.' }))), { ok: true })
  })

  test('con los datos reales de Malapert, la espera larga (más de 21 días) no se recorta', () => {
    const ids = ['malapert-massif', 'connecting-ridge', 'de-gerlache-rim', 'shackleton-rim', 'mons-mouton', 'nobile-rim']
    const sites = ids.map((id) => {
      const data = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'data', 'sites', `${id}.json`), 'utf8')) as SiteData
      return { data, series: seriesOf(data) }
    })
    const incident = planDelayIncident({ data: sites[0].data, cfg: explorer, startIndex: 0, missionDays: 14, sites })
    assert.ok(incident)
    const seeds = seedAttempts({ data: sites[0].data, cfg: explorer, missionDays: 14, incident, sites })
    seeds.forEach((s, k) => {
      assert.equal(s.result.summary.survived, incident.options[k].summary.survived, s.idea)
      assert.ok(Math.abs(s.result.summary.dataSentMb - incident.options[k].summary.dataSentMb) < 1e-6, s.idea)
    })
  })

  test('no acepta un plan que envía lo mismo con más espera que otro', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    executeTool(c, run, sim('b', 0))
    executeTool(c, run, sim('b', 6))
    assert.match(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 2, rationale: 'Esperar un poco.' }))).error, /menos espera/)
    assert.deepEqual(JSON.parse(executeTool(c, run, call('propose_plan', { attemptId: 1, rationale: 'Sin esperar.' }))), { ok: true })
  })

  test('respeta el presupuesto de simulaciones', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    for (let w = 0; w < MAX_ATTEMPTS; w++) executeTool(c, run, sim('a', w))
    assert.match(JSON.parse(executeTool(c, run, sim('b', 0))).error, /presupuesto/)
    assert.equal(run.attempts.length, MAX_ATTEMPTS)
  })

  test('el mejor intento: sobrevive, más datos y, a igualdad, menos espera', () => {
    const c = makeCase()
    const run: CopilotRun = { attempts: [], plan: null }
    executeTool(c, run, sim('a', 0))
    executeTool(c, run, sim('b', 6))
    executeTool(c, run, sim('b', 0))
    const best = bestAttempt(run.attempts)
    assert.equal(best?.siteId, 'b')
    assert.ok(best!.result.summary.survived)
  })
})

describe('copiloto: la conversación', () => {
  test('el modelo prueba, se corrige y entrega un plan válido', async () => {
    const c = makeCase()
    const k = seedAttempts(c).length
    const seen: ChatMessage[][] = []
    // Dos ideas nuevas (k + 1 y k + 2); la segunda combina el sitio «b» con un umbral de ahorro distinto.
    const replies = [
      { content: null, tool_calls: [sim('a', 0, 0.25), sim('b', 0, 1, 0.3)] },
      { content: null, tool_calls: [call('propose_plan', { attemptId: k + 2, rationale: 'Son 2 días mejores' })] },
      { content: null, tool_calls: [call('propose_plan', { attemptId: k + 2, rationale: 'En ese sitio el Sol no se oculta durante la misión.' })] },
    ]
    const send: Send = async (messages) => { seen.push(structuredClone(messages)); return replies[seen.length - 1] }
    const updates: number[] = []
    const run = await runCopilot(c, { send, onUpdate: (r) => updates.push(r.attempts.length) })
    assert.equal(run.attempts.length, k + 2)
    assert.equal(run.attempts.filter((a) => a.seed).length, k)
    assert.equal(run.plan?.attempt.id, k + 2)
    assert.equal(run.plan?.rationale, 'En ese sitio el Sol no se oculta durante la misión.')
    assert.deepEqual(updates, [k, k + 2, k + 2, k + 2])
    // El caso que recibe el modelo trae las salidas sencillas como punto de partida.
    assert.match(seen[0][0].content ?? '', /puntoDePartida/)
    // Cada llamada de herramienta tiene su respuesta, con el mismo id.
    const last = seen.at(-1)!
    const ids = last.filter((m) => m.role === 'assistant').flatMap((m) => m.tool_calls?.map((t) => t.id) ?? [])
    assert.deepEqual(last.filter((m) => m.role === 'tool').map((m) => m.tool_call_id), ids)
  })

  test('si el modelo no cierra, el simulador elige el mejor intento (sin explicación)', async () => {
    const c = makeCase()
    let n = 0
    const send: Send = async () => ({ content: null, tool_calls: [sim('b', n++ * 6)] })
    const run = await runCopilot(c, { send, maxTurns: 3 })
    // El primer intento (sitio «b» sin espera) ya era una salida sencilla: no cuenta como nuevo.
    assert.equal(run.attempts.filter((a) => !a.seed).length, 2)
    assert.equal(run.plan?.rationale, null)
    assert.equal(run.plan?.attempt.id, bestAttempt(run.attempts)!.id)
  })
})

describe('api/copilot: la función del servidor', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
  })
  const req = (body: unknown, origin?: string) =>
    new Request('https://geoathectum.vercel.app/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'geoathectum.vercel.app', ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    })

  test('valida la conversación: sin mensajes de sistema y empezando por el usuario', () => {
    assert.equal(validMessages([{ role: 'system', content: 'x' }]), null)
    assert.equal(validMessages([{ role: 'assistant', content: 'x' }]), null)
    assert.equal(validMessages([{ role: 'user', content: 'x' }, { role: 'tool', content: '{}' }]), null)
    assert.equal(validMessages([]), null)
    assert.ok(validMessages([{ role: 'user', content: 'x' }]))
  })

  test('sin clave responde 503 not-configured', async () => {
    const res = await POST(req({ messages: [{ role: 'user', content: 'x' }] }))
    assert.equal(res.status, 503)
    assert.equal(((await res.json()) as { error: string }).error, 'not-configured')
  })

  test('rechaza pedidos sin Origin (no vienen de un navegador)', async () => {
    process.env.OPENAI_API_KEY = 'k'
    const res = await POST(req({ messages: [{ role: 'user', content: 'x' }] }))
    assert.equal(res.status, 403)
  })

  test('rechaza otros orígenes', async () => {
    process.env.OPENAI_API_KEY = 'k'
    const res = await POST(req({ messages: [{ role: 'user', content: 'x' }] }, 'https://otro-sitio.com'))
    assert.equal(res.status, 403)
  })

  test('agrega las instrucciones y las herramientas del servidor, y devuelve el mensaje del modelo', async () => {
    process.env.OPENAI_API_KEY = 'clave-de-prueba'
    let sent: { headers: Headers; body: Record<string, unknown> } | null = null
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent = { headers: new Headers(init.headers), body: JSON.parse(init.body as string) }
      return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [] } }] }), { status: 200 })
    }) as typeof fetch
    const res = await POST(req({ messages: [{ role: 'user', content: 'caso' }] }, 'https://geoathectum.vercel.app'))
    assert.equal(res.status, 200)
    assert.deepEqual(((await res.json()) as { message: unknown }).message, { role: 'assistant', content: null, tool_calls: [] })
    assert.equal(sent!.headers.get('authorization'), 'Bearer clave-de-prueba')
    const messages = sent!.body.messages as Array<{ role: string; content: string }>
    assert.deepEqual(messages[0], { role: 'system', content: SYSTEM_PROMPT })
    assert.equal(messages[1].content, 'caso')
    assert.deepEqual(sent!.body.tools, TOOLS)
  })

  test('con la interfaz en inglés, ni el prompt ni las herramientas piden español', async () => {
    process.env.OPENAI_API_KEY = 'k'
    let body: Record<string, unknown> = {}
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string)
      return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: null } }] }), { status: 200 })
    }) as typeof fetch
    for (const mode of ['rescue', 'plan']) {
      await POST(req({ mode, lang: 'en', messages: [{ role: 'user', content: 'caso' }] }))
      const sent = JSON.stringify(body)
      assert.doesNotMatch(sent, /en español/, mode)
      assert.match(sent, /in English/, mode)
    }
    assert.match(JSON.stringify(TOOLS), /en español/, 'en español no cambia')
  })

  test('si OpenAI falla, no reenvía su detalle al navegador', async () => {
    process.env.OPENAI_API_KEY = 'k'
    globalThis.fetch = (async () => new Response('detalle interno', { status: 429 })) as unknown as typeof fetch
    const orig = console.error
    console.error = () => {}
    const res = await POST(req({ messages: [{ role: 'user', content: 'x' }] }, 'https://geoathectum.vercel.app'))
    console.error = orig
    assert.equal(res.status, 502)
    assert.doesNotMatch(await res.text(), /detalle interno/)
  })
})
