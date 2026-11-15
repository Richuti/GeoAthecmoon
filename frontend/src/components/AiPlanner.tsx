// «Planéalo por mí»: eliges módulo, mes y días en superficie; la IA prueba sitios y fechas con el simulador
// y te deja el mejor plan listo para usar. Cada número sale del simulador (JPL Horizons + LOLA).
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate, indexAt, sampleTime } from '../lib/time'
import { planHints, planLanding, PLAN_MAX_ATTEMPTS, bestPlanAttempt, runPlanner, type PlanRequest, type PlanRun } from '../sim/aiPlanner'
import { CopilotError } from '../sim/copilot'
import { PRESETS, type LanderConfig, type PresetId } from '../sim/lander'
import { seriesOf } from '../sim/search'
import { useAppState } from '../state'
import type { SiteData } from '../types'
import { AiBadge, AiLog, AiSteps, MissionGlyph, type LogEntry } from './sim/AiParts'
import { Button, cx, Segmented, Select } from './ui'
import './sim/copilot.css'

type Status = 'idle' | 'running' | 'done' | 'error'
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['7', '14', '21', '28'] as const
const gb = (mb: number) => `${(mb / 1000).toFixed(1)} Gb`

export function AiPlanner({ reference, preset, cfg, missionDays, onPreset, onApply }: {
  /** Sitio de referencia: define el periodo de datos (todos los sitios lo comparten) */
  reference: SiteData
  preset: PresetId | null
  cfg: LanderConfig
  missionDays: number
  onPreset: (id: PresetId) => void
  onApply: (siteId: string, startIndex: number, missionDays: number) => void
}) {
  const { state } = useAppState()
  const start = new Date(reference.start)
  const [month, setMonth] = useState(() => String(sampleTime(reference, 0).getUTCMonth()))
  const [days, setDays] = useState(() => (DAYS.includes(String(missionDays) as typeof DAYS[number]) ? String(missionDays) : '14'))
  const [status, setStatus] = useState<Status>('idle')
  const [run, setRun] = useState<PlanRun>({ attempts: [], plan: null })
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  const sites = useMemo(() => (state.sites ?? [])
    .map((s) => state.data[s.id])
    .filter((d): d is SiteData => !!d && d.start === reference.start && d.stepHours === reference.stepHours && d.sun.el.length === reference.sun.el.length)
    .map((data) => ({ data, series: seriesOf(data) })), [state.sites, state.data, reference])

  const request = (): PlanRequest => {
    const m = Number(month)
    const from = indexAt(reference, Date.UTC(start.getUTCFullYear(), m, 1), reference.sun.el.length)
    const to = indexAt(reference, Date.UTC(start.getUTCFullYear(), m + 1, 1) - 3_600_000, reference.sun.el.length)
    return { sites, cfg, missionDays: Number(days), windowFrom: from, windowTo: to }
  }

  const go = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setStatus('running')
    setError(null)
    setRun({ attempts: [], plan: null })
    // Deja pintar el estado «buscando» antes de calcular las pistas (unas 700 simulaciones).
    await new Promise((r) => setTimeout(r, 30))
    try {
      const req = request()
      const result = await runPlanner(req, {
        hints: planHints(req),
        signal: ctrl.signal,
        onUpdate: (r) => { if (!ctrl.signal.aborted) setRun(r) },
      })
      if (ctrl.signal.aborted) return
      setRun(result)
      if (result.plan) setStatus('done')
      else { setStatus('error'); setError(`La IA no encontró un plan que sobreviva en ${MONTHS[Number(month)]} con este módulo. Prueba otro mes, menos días o un módulo con más batería.`) }
    } catch (err) {
      if (ctrl.signal.aborted) return
      setStatus('error')
      setError(err instanceof CopilotError ? err.message : 'La IA no respondió. Prueba otra vez.')
    }
  }
  const stop = () => {
    abort.current?.abort()
    const best = bestPlanAttempt(run.attempts)
    setRun((r) => ({ ...r, plan: r.plan ?? (best ? { attempt: best, rationale: null } : null) }))
    setStatus(run.attempts.length ? 'done' : 'idle')
  }

  const req = { sites, cfg, missionDays: Number(days), windowFrom: 0, windowTo: 0 }
  const leader = bestPlanAttempt(run.attempts)
  const chosen = run.plan?.attempt ?? null
  const entries: LogEntry[] = run.attempts.map((a) => ({
    id: a.id,
    label: `Intento ${a.id} de la IA`,
    idea: a.idea,
    chips: [a.siteName, formatDate(sampleTime(reference, a.startIndex)), `${String(sampleTime(reference, a.startIndex).getUTCHours()).padStart(2, '0')}:00 UTC`],
    result: a.result,
    series: a.series,
    metric: a.result.summary.survived ? `${gb(a.result.summary.dataSentMb)} enviados` : 'batería al 20 %',
    tag: chosen?.id === a.id ? 'Plan elegido' : status === 'running' && leader?.id === a.id ? 'Mejor hasta ahora' : undefined,
  }))

  return (
    <section aria-labelledby="ai-planner-title" data-tour="ai-planner" className="ai-panel glass-surface mb-8 p-5 sm:p-7">
      <div className="relative">
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted"><AiBadge />Planéalo por mí · la IA prueba sitios y fechas con el simulador</p>
        <h2 id="ai-planner-title" className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-3xl">¿No sabes dónde ni cuándo? Deja que la IA lo planee.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">Dinos tu módulo, el mes y cuántos días quieres en la superficie. La IA propone sitios y fechas, el simulador comprueba cada uno con datos reales de NASA, y te quedas con el plan que sobrevive y envía más datos.</p>

        <div className="mt-5 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <Select id="ai-module" label="Módulo" value={preset ?? 'custom'} onChange={(v) => { if (v !== 'custom') onPreset(v as PresetId) }}
            options={[...Object.values(PRESETS).map((p) => ({ value: p.id, label: p.label, description: p.description })), ...(preset ? [] : [{ value: 'custom', label: 'Personalizado', description: 'El módulo que configuraste' }])]} />
          <Select id="ai-month" label={`Mes de alunizaje · ${start.getUTCFullYear()}`} value={month} onChange={setMonth}
            options={MONTHS.map((m, i) => ({ value: String(i), label: m.charAt(0).toUpperCase() + m.slice(1) }))} />
          <div><p className="mb-2 text-sm text-ink-muted">Días en la superficie</p>
            <Segmented label="Días en la superficie" options={DAYS.map((d) => ({ value: d, label: `${d} d` }))} value={days as typeof DAYS[number]} onChange={setDays} className="min-h-12 items-center [&_button]:min-h-10" /></div>
          {status === 'running'
            ? <Button size="lg" className="min-h-12" onClick={stop}>Detener</Button>
            : <Button variant="primary" size="lg" className="min-h-12" onClick={go} disabled={sites.length === 0}>{status === 'idle' ? '✦ Planéalo por mí' : 'Planear otra vez'}</Button>}
        </div>

        {status !== 'idle' && <div className="mt-6"><AiSteps live={status === 'running'} decide="y prueba otra idea, o elige el plan" /></div>}
        {error && <p role="alert" className="mt-5 text-sm leading-relaxed text-caution">{error}</p>}

        {status === 'running' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Bitácora de la IA <span className="ml-2 text-xs font-normal tabular-nums text-ink-muted">{run.attempts.length} de {PLAN_MAX_ATTEMPTS} ideas comprobadas</span></p>
              <div className="mt-3"><AiLog entries={entries} thinking thinkingText={run.attempts.length === 0 ? `La IA revisa los ${sites.length} sitios en ${MONTHS[Number(month)]}…` : 'La IA compara los resultados y decide la siguiente idea…'} /></div>
            </div>
            <aside className="ai-best self-start" aria-label="Mejor plan hasta ahora">
              <p className="text-xs text-ink-muted">Mejor plan hasta ahora</p>
              {leader ? <>
                <p className="mt-2 text-lg font-bold leading-tight text-ink">{leader.siteName}</p>
                <p className="text-sm text-ink-muted">{planLanding(req, leader)}</p>
                <div className="mt-3"><MissionGlyph result={leader.result} series={leader.series} tall /></div>
                <p className="mt-2 text-sm"><b className="text-earth tabular-nums">{gb(leader.result.summary.dataSentMb)}</b> <span className="text-ink-muted">enviados · batería mín. {Math.round(leader.result.summary.minSocPct)} %</span></p>
              </> : <p className="mt-2 text-sm text-ink-muted">Todavía ninguno sobrevive.</p>}
            </aside>
          </div>
        )}

        {status === 'done' && chosen && (
          <div className="copilot-plan mt-6" aria-live="polite">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs text-ink-muted"><AiBadge>Plan de la IA</AiBadge>{run.attempts.length} simulaciones comprobadas</p>
                <p className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">{chosen.siteName}</p>
                <p className="mt-1 text-lg text-ink">Alunizar el {planLanding(req, chosen)} · {days} días</p>
                {run.plan?.rationale
                  ? <blockquote className="copilot-why mt-5"><p className="text-xs text-ink-muted">Por qué, según la IA</p><p className="mt-2 text-base leading-relaxed text-ink">{run.plan.rationale}</p></blockquote>
                  : <p className="mt-5 text-sm text-ink-muted">La IA no terminó a tiempo; este es el intento que mejor resultó en el simulador.</p>}
              </div>
              <div className="min-w-0">
                <MissionGlyph result={chosen.result} series={chosen.series} tall />
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-ink-muted">Viabilidad</dt><dd className="text-2xl font-bold tabular-nums text-ink">{Math.round(chosen.viability)} %</dd></div>
                  <div><dt className="text-xs text-ink-muted">Datos a la Tierra</dt><dd className="text-2xl font-bold tabular-nums text-earth">{gb(chosen.result.summary.dataSentMb)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Batería mínima</dt><dd className="text-2xl font-bold tabular-nums text-ok">{Math.round(chosen.result.summary.minSocPct)} %</dd></div>
                </dl>
                <Button variant="primary" size="lg" className="mt-6 min-h-12 w-full sm:w-auto" onClick={() => onApply(chosen.siteId, chosen.startIndex, Number(days))}>Usar este plan →</Button>
              </div>
            </div>
          </div>
        )}

        {status === 'done' && entries.length > 0 && (
          <details className="mt-6">
            <summary className={cx('cursor-pointer text-sm font-bold text-ink')}>Ver la bitácora de la IA ({entries.length} ideas comprobadas)</summary>
            <div className="mt-3"><AiLog entries={entries} chosenId={chosen?.id} /></div>
          </details>
        )}
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">La IA (un modelo de OpenAI) solo decide qué probar y explica su elección. Cada número sale del simulador, con JPL Horizons y el relieve LOLA.</p>
      </div>
    </section>
  )
}
