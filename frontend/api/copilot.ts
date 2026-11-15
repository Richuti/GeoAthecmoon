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
Una corrección de trayectoria atrasó la llegada de un módulo y, con la nueva fecha, la batería se agota.
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

type Role = 'user' | 'assistant' | 'tool'
interface Message { role: Role; content?: string | null; tool_calls?: unknown[]; tool_call_id?: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Solo se aceptan pedidos desde la misma app (o desde localhost en desarrollo). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
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
  if (!messages) return json({ error: 'bad-request' }, 400)

  let res: Response
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
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
