// Copiloto de rescate: función de Vercel (POST /api/copilot) que habla con OpenAI.
//
// La clave vive solo aquí (variable OPENAI_API_KEY, sin prefijo VITE_, así que nunca llega al navegador).
// El servidor fija el modelo, las instrucciones y las herramientas: el navegador solo manda la conversación
// (el caso de la misión y los resultados de las simulaciones). Las herramientas se ejecutan en el navegador,
// con el mismo simulador de la app: ningún número sale del modelo.
//
// Sin dependencias: usa la firma web de Vercel (`export function POST(request: Request)`).

export const maxDuration = 30

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4.1-mini'
const MAX_BODY_BYTES = 96_000
const MAX_MESSAGES = 48
const OPENAI_TIMEOUT_MS = 25_000

export const SYSTEM_PROMPT = `Eres el copiloto de rescate de GEOATHECMOON, un planificador de misiones al polo sur de la Luna.
Con la fecha de llegada actual (por un atraso o por el plan elegido), la batería del módulo se agota antes del final.
Tu trabajo: encontrar el plan de rescate que salve la misión y devuelva la mayor cantidad de datos a la Tierra.

Cómo trabajas:
- No calculas nada tú. Cada idea se comprueba con la herramienta simulate_plan, que ejecuta el simulador real
  (efemérides de JPL Horizons, relieve LOLA y el modelo de energía del módulo).
- Palancas posibles después del despegue: esperar en órbita (waitHours, el alunizaje se retrasa más), alunizar
  en otro sitio con la misma llegada o con espera, encender solo una parte de los instrumentos (instrumentShare:
  menos consumo y menos datos) y entrar antes en modo supervivencia (survivalThreshold). La batería y el panel
  no se pueden cambiar: la nave ya está en camino.
- Prueba combinaciones, no solo palancas sueltas. Aprende de cada resultado: si un sitio falla en esa fecha,
  pregúntate si una espera corta lo arregla; si sobra batería, sube los instrumentos.
- Lanza varias simulaciones a la vez cuando sean independientes. Tienes un presupuesto limitado de simulaciones.
- Criterio: primero que sobreviva; después más datos enviados a la Tierra; después menos espera.
- Termina siempre con propose_plan, eligiendo el attemptId de una simulación que sobrevivió.
- La explicación de propose_plan va en español, para público general, en dos o tres frases, y SIN CIFRAS:
  la interfaz muestra los números del simulador. Explica el porqué (luz, sombra del relieve, contacto con la
  Tierra, consumo), no repitas los datos.`

/** Herramientas que el navegador sabe ejecutar. Los nombres y campos deben coincidir con src/sim/copilot.ts. */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'simulate_plan',
      description: 'Simula la misión completa en superficie con el simulador real y devuelve el resultado.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['siteId', 'waitHours', 'instrumentShare', 'survivalThreshold', 'idea'],
        properties: {
          siteId: { type: 'string', description: 'Id del sitio de alunizaje (de la lista del caso).' },
          waitHours: { type: 'number', description: 'Horas de espera en órbita después de la llegada atrasada (0 = alunizar al llegar).' },
          instrumentShare: { type: 'number', description: 'Fracción de los instrumentos encendida, de 0.1 a 1.' },
          survivalThreshold: { type: 'number', description: 'Nivel de batería (0.25 a 0.55) bajo el cual se apagan los instrumentos.' },
          idea: { type: 'string', description: 'Qué quieres comprobar con este intento, en pocas palabras y en español.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_plan',
      description: 'Entrega el plan de rescate elegido. Debe ser un intento que sobrevivió.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['attemptId', 'rationale'],
        properties: {
          attemptId: { type: 'integer', description: 'attemptId de la simulación elegida.' },
          rationale: { type: 'string', description: 'Por qué este plan, en español, sin cifras, dos o tres frases.' },
        },
      },
    },
  },
] as const

export const PLAN_PROMPT = `Eres el planificador de GEOATHECMOON, una herramienta para elegir dónde y cuándo alunizar en el polo sur
de la Luna. El usuario ya eligió su módulo, cuántos días quiere en la superficie y una ventana de fechas.
Tu trabajo: encontrar el sitio y la fecha de alunizaje que sobreviven y devuelven más datos a la Tierra.

Cómo trabajas:
- No calculas nada tú. Cada idea se comprueba con la herramienta simulate_plan, que ejecuta el simulador real
  (efemérides de JPL Horizons, relieve LOLA y el modelo de energía del módulo).
- El caso trae "pistas": cuántos horarios de alunizaje sobreviven en cada sitio dentro de la ventana. Úsalas para
  decidir dónde buscar, pero compruébalo siempre simulando.
- Compara sitios distintos y fechas distintas: un sitio muy iluminado puede tener poco contacto con la Tierra y
  enviar menos datos; uno con más contacto puede quedarse sin luz. Busca el equilibrio.
- Lanza varias simulaciones a la vez cuando sean independientes. Tienes un presupuesto limitado de simulaciones.
- Criterio: primero que sobreviva; después más datos enviados a la Tierra; después más batería de margen.
- Termina siempre con propose_plan, eligiendo el attemptId de una simulación que sobrevivió.
- La explicación de propose_plan va en español, para público general, en dos o tres frases, y SIN CIFRAS:
  la interfaz muestra los números del simulador. Explica el porqué (luz, sombra del relieve, contacto con la
  Tierra), no repitas los datos.`

/** Herramientas del planificador (src/sim/aiPlanner.ts). */
export const PLAN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'simulate_plan',
      description: 'Simula la misión completa con el sitio y la fecha de alunizaje indicados y devuelve el resultado.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['siteId', 'date', 'hourUtc', 'idea'],
        properties: {
          siteId: { type: 'string', description: 'Id del sitio de alunizaje (de la lista del caso).' },
          date: { type: 'string', description: 'Día de alunizaje dentro de la ventana, en formato AAAA-MM-DD (UTC).' },
          hourUtc: { type: 'integer', enum: [0, 6, 12, 18], description: 'Hora de alunizaje (UTC).' },
          idea: { type: 'string', description: 'Qué quieres comprobar con este intento, en pocas palabras y en español.' },
        },
      },
    },
  },
  TOOLS[1],
] as const

/** Modos que acepta la función: cada uno con sus instrucciones y herramientas, fijadas aquí. */
export const MODES = {
  rescue: { prompt: SYSTEM_PROMPT, tools: TOOLS },
  plan: { prompt: PLAN_PROMPT, tools: PLAN_TOOLS },
} as const
export type CopilotMode = keyof typeof MODES

type Role = 'user' | 'assistant' | 'tool'
interface Message { role: Role; content?: string | null; tool_calls?: unknown[]; tool_call_id?: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Solo se aceptan pedidos desde la misma app (o desde localhost en desarrollo). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  // Los navegadores siempre mandan Origin en un POST con fetch: sin él, es un script ajeno gastando la clave.
  if (!origin) return false
  try {
    const o = new URL(origin)
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
    return o.host === host || o.hostname === 'localhost' || o.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Revisa la conversación que manda el navegador: solo roles permitidos, sin instrucciones de sistema. */
export function validMessages(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null
  const out: Message[] = []
  for (const m of value) {
    if (typeof m !== 'object' || m === null) return null
    const { role, content, tool_calls, tool_call_id } = m as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant' && role !== 'tool') return null
    if (content !== undefined && content !== null && typeof content !== 'string') return null
    if (role === 'tool' && typeof tool_call_id !== 'string') return null
    if (tool_calls !== undefined && (role !== 'assistant' || !Array.isArray(tool_calls))) return null
    out.push({ role, content: (content as string | null | undefined) ?? null, ...(tool_calls ? { tool_calls } : {}), ...(role === 'tool' ? { tool_call_id: tool_call_id as string } : {}) })
  }
  if (out[0].role !== 'user') return null
  return out
}

/** Con la interfaz en inglés, el texto que lee el usuario (idea y explicación) va en inglés. */
const ENGLISH = '\n\nIMPORTANT: the user interface is in English. Write every natural-language field (idea, rationale and any explanation) in English, not Spanish, even though these instructions are in Spanish. Keep the same rules (no figures in the rationale).'

export async function POST(request: Request): Promise<Response> {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) return json({ error: 'not-configured' }, 503)
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403)

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'too-large' }, 413)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  const messages = validMessages((body as { messages?: unknown })?.messages)
  const requested = (body as { mode?: unknown })?.mode ?? 'rescue'
  if (typeof requested !== 'string' || !(requested in MODES)) return json({ error: 'bad-request' }, 400)
  const mode = MODES[requested as CopilotMode]
  if (!messages) return json({ error: 'bad-request' }, 400)

  let res: Response
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        messages: [{ role: 'system', content: mode.prompt + ((body as { lang?: unknown })?.lang === 'en' ? ENGLISH : '') }, ...messages],
        tools: mode.tools,
        tool_choice: 'required',
        parallel_tool_calls: true,
        max_completion_tokens: 1500,
      }),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    })
  } catch {
    return json({ error: 'upstream-unreachable' }, 502)
  }
  if (!res.ok) {
    // No se reenvía el detalle de OpenAI al navegador; queda en los registros de Vercel.
    console.error('OpenAI', res.status, (await res.text()).slice(0, 500))
    return json({ error: 'upstream', status: res.status }, 502)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: unknown }> }
  const message = data.choices?.[0]?.message
  if (!message) return json({ error: 'upstream-empty' }, 502)
  return json({ message })
}
