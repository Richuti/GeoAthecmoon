// Copiloto de rescate: la IA propone combinaciones y el simulador las comprueba con los datos reales.
// Mientras busca, la bitácora muestra cada idea y su resultado; al lado, el mejor plan hasta ahora. Al terminar,
// el plan elegido con su explicación y la comparación con la mejor salida sencilla. Ningún número sale del modelo.
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDateTime, sampleTime } from '../../lib/time'
import {
  bestAttempt, CopilotError, landingLabel, leverLabels, MAX_ATTEMPTS, runCopilot,
  type Attempt, type CopilotCase, type CopilotRun,
} from '../../sim/copilot'
import type { LanderConfig } from '../../sim/lander'
import { Button, cx } from '../ui'
import { AiBadge, AiLog, AiSteps, MissionGlyph, type LogEntry } from './AiParts'
import './copilot.css'

type Status = 'idle' | 'running' | 'done' | 'error'

const gb = (mb: number) => `${(mb / 1000).toFixed(1)} Gb`

export function RescueCopilot({ copilotCase, onApply, id = 'copilot', title = '¿Se puede salvar mejor?', intro, startSignal = 0 }: {
  copilotCase: CopilotCase
  onApply: (siteId: string, cfg: LanderConfig, startIndex: number) => void
  id?: string
  title?: string
  intro?: string
  /** Al cambiar, empieza la búsqueda (botón «La IA puede salvarla» del resultado) */
  startSignal?: number
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [run, setRun] = useState<CopilotRun>({ attempts: [], plan: null })
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  const start = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setStatus('running')
    setError(null)
    setRun({ attempts: [], plan: null })
    let latest: Attempt[] = []
    try {
      const result = await runCopilot(copilotCase, {
        signal: ctrl.signal,
        onUpdate: (r) => { latest = [...r.attempts]; if (!ctrl.signal.aborted) setRun({ attempts: latest, plan: r.plan }) },
      })
      if (ctrl.signal.aborted) return
      setRun(result)
      if (result.plan) setStatus('done')
      else {
        setStatus('error')
        setError('La IA no encontró un plan que sobreviva con este módulo. Prueba más batería o más panel en «Modificar mi plan».')
      }
    } catch (err) {
      if (ctrl.signal.aborted) return
      // Sin IA (red caída, OpenAI sin respuesta), la misión no se queda sin plan: las salidas sencillas ya
      // están simuladas y se ofrece la mejor que sobrevive, sin explicación del modelo.
      const best = bestAttempt(latest)
      setRun({ attempts: latest, plan: best ? { attempt: best, rationale: null } : null })
      setStatus(best ? 'done' : 'error')
      const why = err instanceof CopilotError ? err.message.replace(/ Prueba otra vez\.$/, '') : 'La IA no respondió.'
      setError(best ? `${why} Te mostramos el mejor plan ya simulado sin la IA.` : `${why} Prueba otra vez.`)
    }
  }
  const cancel = () => {
    abort.current?.abort()
    setStatus(run.attempts.length ? 'done' : 'idle')
    const best = bestAttempt(run.attempts)
    if (!run.plan) setRun((r) => ({ ...r, plan: best ? { attempt: best, rationale: null } : null }))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando llega una nueva señal
  useEffect(() => { if (startSignal > 0) void start() }, [startSignal])

  const leader = useMemo(() => bestAttempt(run.attempts), [run.attempts])
  const seeds = run.attempts.filter((a) => a.seed).length
  const explored = run.attempts.length - seeds
  const chosen = run.plan?.attempt ?? null
  const entries: LogEntry[] = run.attempts.map((a) => ({
    id: a.id,
    label: a.seed ? 'Punto de partida · salida sencilla' : `Intento ${a.id - seeds} de la IA`,
    idea: a.seed ? a.idea.replace('Salida sencilla: ', '').replace(/^./, (c) => c.toUpperCase()) : a.idea,
    chips: leverLabels(copilotCase, a),
    result: a.result,
    series: a.series,
    metric: a.result.summary.survived ? `${gb(a.result.summary.dataSentMb)} enviados` : `batería al 20 %`,
    tag: chosen?.id === a.id ? 'Plan elegido' : status === 'running' && leader?.id === a.id ? 'Mejor hasta ahora' : undefined,
    quiet: a.seed,
  }))

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="ai-panel glass-surface mt-10 scroll-mt-6 p-5 sm:mt-12 sm:p-8">
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted"><AiBadge />Copiloto de rescate · comprueba cada idea con el simulador</p>
          <h3 id={`${id}-title`} className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h3>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">{intro ?? 'La IA combina las palancas que existen con la nave en camino: esperar en órbita, cambiar de sitio, encender menos instrumentos y ahorrar antes. Busca el plan que sobrevive y envía más datos a la Tierra.'}</p>
        </div>
        {status === 'running'
          ? <Button size="lg" className="min-h-12" onClick={cancel}>Detener búsqueda</Button>
          : <Button variant="primary" size="lg" className="min-h-12" onClick={start}>{status === 'idle' ? '✦ Buscar el plan de rescate' : 'Buscar otra vez'}</Button>}
      </div>

      <div className="relative mt-6"><AiSteps live={status === 'running'} /></div>
      {error && <p role="alert" className="relative mt-6 max-w-3xl text-sm leading-relaxed text-caution">{error}</p>}

      {status === 'running' && (
        <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Bitácora de la IA <span className="ml-2 text-xs font-normal tabular-nums text-ink-muted">{explored} de {MAX_ATTEMPTS} ideas comprobadas</span></p>
            <div className="mt-3"><AiLog entries={entries} thinking thinkingText={explored === 0 ? 'La IA estudia el caso y las salidas sencillas…' : 'La IA analiza los resultados y decide la siguiente idea…'} /></div>
          </div>
          <aside className="ai-best self-start" aria-label="Mejor plan hasta ahora">
            <p className="text-xs text-ink-muted">Mejor plan hasta ahora</p>
            {leader ? <>
              <p className="mt-2 text-lg font-bold leading-tight text-ink">{leader.siteName}</p>
              <p className="text-sm text-ink-muted">{landingLabel(copilotCase, leader)}</p>
              <div className="mt-3"><MissionGlyph result={leader.result} series={leader.series} tall /></div>
              <p className="mt-2 text-sm"><b className="text-earth tabular-nums">{gb(leader.result.summary.dataSentMb)}</b> <span className="text-ink-muted">enviados · batería mín. {Math.round(leader.result.summary.minSocPct)} %</span></p>
            </> : <p className="mt-2 text-sm text-ink-muted">Todavía ninguno sobrevive.</p>}
          </aside>
        </div>
      )}

      {chosen && status !== 'running' && <RescuePlan copilotCase={copilotCase} attempt={chosen} rationale={run.plan?.rationale ?? null} attempts={run.attempts} onApply={onApply} />}

      {status !== 'running' && entries.length > 0 && (
        <div className="relative mt-8">
          <p className="text-sm font-bold text-ink">Bitácora de la IA <span className="ml-2 text-xs font-normal text-ink-muted">qué probó y qué salió, en orden</span></p>
          <div className="mt-3"><AiLog entries={entries} chosenId={chosen?.id} /></div>
        </div>
      )}

      <p className="relative mt-6 max-w-3xl text-xs leading-relaxed text-ink-muted">La IA (un modelo de OpenAI) solo decide qué probar y explica su elección. Cada número sale del simulador de la app, con los mismos datos que el resto de la misión. La espera en órbita cambia la fecha de alunizaje; no se calculan sus maniobras ni su consumo.</p>
    </section>
  )
}

function RescuePlan({ copilotCase: c, attempt: a, rationale, attempts, onApply }: {
  copilotCase: CopilotCase; attempt: Attempt; rationale: string | null; attempts: Attempt[]
  onApply: (siteId: string, cfg: LanderConfig, startIndex: number) => void
}) {
  const s = a.result.summary
  // La referencia es la mejor salida sencilla, simulada como punto de partida del copiloto.
  const baseline = bestAttempt(attempts.filter((x) => x.seed))
  const explored = attempts.filter((x) => !x.seed).length
  const bars = [
    ...(baseline && baseline.id !== a.id ? [{ label: `Mejor salida sencilla · ${baseline.idea.replace('Salida sencilla: ', '')}`, mb: baseline.result.summary.dataSentMb, tone: 'simple' }] : []),
    { label: a.seed ? `Plan elegido · ${a.idea.replace('Salida sencilla: ', '')}` : 'Plan de la IA', mb: s.dataSentMb, tone: 'plan' },
  ]
  const max = Math.max(...bars.map((b) => b.mb), 1)
  const gain = baseline ? s.dataSentMb - baseline.result.summary.dataSentMb : null
  const failedAt = c.incident.delayed.failedAtIndex
  const verdict = !baseline
    ? <>Ninguna salida sencilla salvaba la misión. <b className="text-ok">Este plan sí.</b></>
    : a.seed
      ? <>La IA probó {explored} combinaciones y ninguna supera esta salida: <b className="text-ok">es la mejor opción</b>.</>
      : gain !== null && gain > 1
        ? <>La IA recupera <b className="text-earth">{gb(gain)} más</b> que la mejor salida sencilla.</>
        : baseline && a.waitHours < baseline.waitHours
          ? <>Envía casi lo mismo que la mejor salida sencilla, <b className="text-ok">con menos espera</b>.</>
          : <>Iguala a la mejor salida sencilla: <b className="text-ok">la IA confirmó que no hay una combinación mejor</b>.</>
  return (
    <div className="copilot-plan relative mt-8" aria-live="polite">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-ink-muted"><AiBadge>Plan de la IA</AiBadge>{attempts.length} simulaciones comprobadas</p>
          <p className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">Alunizar el {landingLabel(c, a)}</p>
          <ul className="ai-chips is-large mt-4" aria-label="Qué cambia en el plan">{leverLabels(c, a).map((l) => <li key={l}>{l}</li>)}</ul>
          {rationale
            ? <blockquote className="copilot-why mt-5"><p className="text-xs text-ink-muted">Por qué, según la IA</p><p className="mt-2 text-base leading-relaxed text-ink">{rationale}</p></blockquote>
            : <p className="mt-5 text-sm leading-relaxed text-ink-muted">La IA no terminó a tiempo; este es el intento que mejor resultó en el simulador.</p>}
          <div className="mt-5"><MissionGlyph result={a.result} series={a.series} tall /></div>
          <p className="mt-2 text-xs text-ink-muted">Batería mínima {Math.round(s.minSocPct)} % · sobre el mínimo del 20 % durante toda la misión.</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-ink-muted"><span className="text-critical">Sin rescate</span>, la batería llega al mínimo{failedAt !== null ? ` el ${formatDateTime(sampleTime(c.data, failedAt))}` : ''}.</p>
          <p className="mt-5 text-sm font-bold text-ink">Datos que llegan a la Tierra</p>
          <ul className="copilot-bars mt-4">
            {bars.map((b) => (
              <li key={b.label} className={`is-${b.tone}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-ink">{b.label}</span><span className="font-bold tabular-nums text-ink">{gb(b.mb)}</span></div>
                <div className="copilot-bars__track"><span style={{ width: `${Math.max(2, (b.mb / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className={cx('mt-4 text-base leading-relaxed text-ink')}>{verdict}</p>
          <Button variant="primary" size="lg" className="mt-6 min-h-12 w-full sm:w-auto" onClick={() => onApply(a.siteId, a.cfg, a.startIndex)}>Aplicar este plan</Button>
        </div>
      </div>
    </div>
  )
}
