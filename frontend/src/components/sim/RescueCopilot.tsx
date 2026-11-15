// Copiloto de rescate: la IA propone combinaciones y el simulador las comprueba con los datos reales.
// Cada intento se ve como una tarjeta con la batería, el Sol y la Tierra de ese plan; el plan final se compara
// con la misión atrasada y con la mejor salida sencilla. Ningún número sale del modelo.
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDateTime, sampleTime } from '../../lib/time'
import {
  bestAttempt, CopilotError, landingLabel, leverLabels, MAX_ATTEMPTS, runCopilot,
  type Attempt, type CopilotCase, type CopilotRun,
} from '../../sim/copilot'
import type { LanderConfig } from '../../sim/lander'
import { MIN_SOC } from '../../sim/lander'
import { Button, cx } from '../ui'
import './copilot.css'

type Status = 'idle' | 'running' | 'done' | 'error'

const gb = (mb: number) => `${(mb / 1000).toFixed(1)} Gb`

export function RescueCopilot({ copilotCase, onApply }: {
  copilotCase: CopilotCase
  onApply: (siteId: string, cfg: LanderConfig, startIndex: number) => void
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
    try {
      const result = await runCopilot(copilotCase, {
        signal: ctrl.signal,
        onUpdate: (r) => { if (!ctrl.signal.aborted) setRun({ attempts: [...r.attempts], plan: r.plan }) },
      })
      if (ctrl.signal.aborted) return
      setRun(result)
      if (result.plan) setStatus('done')
      else {
        setStatus('error')
        setError('El copiloto no encontró un plan que sobreviva con este módulo. Prueba más batería o más panel en «Modificar mi plan».')
      }
    } catch (err) {
      if (ctrl.signal.aborted) return
      setStatus('error')
      setError(err instanceof CopilotError ? err.message : 'El copiloto no respondió. Prueba otra vez.')
    }
  }
  const cancel = () => { abort.current?.abort(); setStatus(run.attempts.length ? 'done' : 'idle'); if (!run.plan) setRun(r => ({ ...r, plan: bestAttempt(r.attempts) ? { attempt: bestAttempt(r.attempts)!, rationale: null } : null })) }

  const leader = useMemo(() => bestAttempt(run.attempts), [run.attempts])
  const explored = run.attempts.filter(a => !a.seed).length
  const chosen = run.plan?.attempt ?? null

  return (
    <section aria-labelledby="copilot-title" className="copilot glass-surface mt-10 p-5 sm:mt-12 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="copilot-eyebrow"><span aria-hidden className="copilot-eyebrow__dot" />Copiloto de rescate · IA que comprueba con el simulador</p>
          <h3 id="copilot-title" className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-3xl">¿Se puede salvar mejor?</h3>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">Cada salida de arriba mueve una sola palanca. El copiloto combina varias: esperar, cambiar de sitio, encender menos instrumentos y ahorrar antes. Busca el plan que sobrevive y envía más datos a la Tierra.</p>
        </div>
        {status === 'running'
          ? <Button size="lg" className="min-h-12" onClick={cancel}>Detener búsqueda</Button>
          : <Button variant="primary" size="lg" className="min-h-12" onClick={start}>{status === 'idle' ? 'Buscar el mejor plan de rescate' : 'Buscar otra vez'}</Button>}
      </div>

      <ol className="copilot-loop mt-6" aria-label="Cómo trabaja el copiloto">
        <li className={cx(status === 'running' && 'is-live')}><span aria-hidden>1</span><div><b>La IA propone</b><small>una combinación de palancas</small></div></li>
        <li className={cx(status === 'running' && 'is-live')}><span aria-hidden>2</span><div><b>El simulador calcula</b><small>con JPL Horizons y el relieve LOLA</small></div></li>
        <li className={cx(status === 'running' && 'is-live')}><span aria-hidden>3</span><div><b>La IA aprende</b><small>y prueba otra idea, o elige el plan</small></div></li>
      </ol>

      {status === 'running' && (
        <p role="status" className="copilot-status mt-6"><span aria-hidden className="copilot-status__pulse" />
          {explored === 0 ? 'El copiloto estudia el caso desde las salidas sencillas…' : `Intento ${explored} de ${MAX_ATTEMPTS} comprobado · decidiendo el siguiente…`}
        </p>
      )}
      {error && <p role="alert" className="mt-6 max-w-3xl text-sm leading-relaxed text-caution">{error}</p>}

      {chosen && status !== 'running' && <RescuePlan copilotCase={copilotCase} attempt={chosen} rationale={run.plan?.rationale ?? null} attempts={run.attempts} onApply={onApply} />}

      {run.attempts.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-bold text-ink">Lo que probó el copiloto</p>
          <p className="mt-1 text-xs text-ink-muted">Cada tarjeta es una simulación completa: <span className="text-sun">Sol</span>, <span className="text-earth">contacto con la Tierra</span> y batería, hora por hora.</p>
          <ol className="copilot-attempts mt-4">
            {run.attempts.map(a => (
              <AttemptCard key={a.id} copilotCase={copilotCase} attempt={a}
                tag={chosen?.id === a.id ? 'Plan elegido' : status === 'running' && leader?.id === a.id ? 'Mejor hasta ahora' : a.seed ? 'Punto de partida' : null} />
            ))}
          </ol>
        </div>
      )}

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-ink-muted">La IA (un modelo de OpenAI) solo decide qué probar y explica su elección. Cada número de este panel sale del simulador de la app, con los mismos datos que el resto de la misión. La espera en órbita cambia la fecha de alunizaje; no se calculan sus maniobras ni su consumo.</p>
    </section>
  )
}

function AttemptCard({ copilotCase, attempt: a, tag }: { copilotCase: CopilotCase; attempt: Attempt; tag: string | null }) {
  const s = a.result.summary
  return (
    <li className={cx('copilot-card', s.survived ? 'is-ok' : 'is-fail', a.seed && 'is-seed', tag && tag !== 'Punto de partida' && 'is-tagged')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-ink-muted">{a.seed ? 'Salida sencilla' : `Intento ${a.id}`}</span>
        {tag ? <span className={cx('copilot-tag', tag === 'Punto de partida' && 'is-quiet')}>{tag}</span> : <span className={cx('text-xs font-bold', s.survived ? 'text-ok' : 'text-critical')}>{s.survived ? 'Sobrevive' : 'Falla'}</span>}
      </div>
      {a.idea && <p className="copilot-card__idea">{a.seed ? a.idea.replace('Salida sencilla: ', '') : `«${a.idea}»`}</p>}
      <ul className="copilot-chips" aria-label="Palancas">{leverLabels(copilotCase, a).map(l => <li key={l}>{l}</li>)}</ul>
      <MissionGlyph attempt={a} />
      <p className="mt-2 text-xs tabular-nums text-ink-muted">
        <span className="text-earth">{gb(s.dataSentMb)} enviados</span><span aria-hidden> · </span>batería mínima {Math.round(s.minSocPct)} %
      </p>
    </li>
  )
}

/** La misión en miniatura: franjas de Sol y de Tierra, y la curva de la batería con el mínimo del 20 %. */
function MissionGlyph({ attempt: a, tall = false }: { attempt: Attempt; tall?: boolean }) {
  const W = 240
  const H = tall ? 96 : 64
  const top = 16
  const soc = a.result.series.soc
  const n = soc.length
  const x = (k: number) => (n <= 1 ? 0 : (k / (n - 1)) * W)
  const y = (v: number) => H - 2 - v * (H - top - 4)
  const runs = (on: (k: number) => boolean) => {
    const out: Array<[number, number]> = []
    let s = -1
    for (let k = 0; k <= n; k++) {
      const v = k < n && on(k)
      if (v && s < 0) s = k
      if (!v && s >= 0) { out.push([s, k]); s = -1 }
    }
    return out
  }
  const from = a.result.from
  const sun = runs(k => a.series.lit[from + k])
  const earth = runs(k => a.series.contact[from + k])
  const stride = Math.max(1, Math.ceil(n / W))
  const pts: string[] = []
  for (let k = 0; k < n; k += stride) pts.push(`${x(k).toFixed(1)},${y(soc[k]).toFixed(1)}`)
  pts.push(`${x(n - 1).toFixed(1)},${y(soc[n - 1]).toFixed(1)}`)
  const failK = a.result.summary.failedAtIndex === null ? null : a.result.summary.failedAtIndex - from
  const ok = a.result.summary.survived
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="copilot-glyph" role="img" preserveAspectRatio="none"
      aria-label={`Batería durante la misión: ${ok ? 'sobrevive' : 'llega al mínimo'}; mínima ${Math.round(a.result.summary.minSocPct)} %.`}>
      {sun.map(([s, e]) => <rect key={`s${s}`} x={x(s)} y={0} width={Math.max(0.6, x(e) - x(s))} height={4} className="fill-sun" />)}
      {earth.map(([s, e]) => <rect key={`e${s}`} x={x(s)} y={7} width={Math.max(0.6, x(e) - x(s))} height={4} className="fill-earth" />)}
      <line x1={0} x2={W} y1={y(MIN_SOC)} y2={y(MIN_SOC)} className="copilot-glyph__floor" />
      <polyline points={pts.join(' ')} fill="none" className={ok ? 'stroke-ok' : 'stroke-critical'} strokeWidth={tall ? 2 : 1.6} vectorEffect="non-scaling-stroke" />
      {failK !== null && failK >= 0 && <circle cx={x(failK)} cy={y(MIN_SOC)} r={3} className="fill-critical" />}
    </svg>
  )
}

function RescuePlan({ copilotCase: c, attempt: a, rationale, attempts, onApply }: {
  copilotCase: CopilotCase; attempt: Attempt; rationale: string | null; attempts: Attempt[]
  onApply: (siteId: string, cfg: LanderConfig, startIndex: number) => void
}) {
  const s = a.result.summary
  // La referencia es la mejor salida sencilla, simulada como punto de partida del copiloto.
  const baseline = bestAttempt(attempts.filter(x => x.seed))
  const explored = attempts.filter(x => !x.seed).length
  const bars = [
    ...(baseline && baseline.id !== a.id ? [{ label: `Mejor salida sencilla · ${baseline.idea.replace('Salida sencilla: ', '')}`, mb: baseline.result.summary.dataSentMb, tone: 'simple' }] : []),
    { label: a.seed ? `Plan elegido · ${a.idea.replace('Salida sencilla: ', '')}` : 'Plan del copiloto', mb: s.dataSentMb, tone: 'plan' },
  ]
  const max = Math.max(...bars.map(b => b.mb), 1)
  const gain = baseline ? s.dataSentMb - baseline.result.summary.dataSentMb : null
  const failedAt = c.incident.delayed.failedAtIndex
  const verdict = !baseline
    ? <>Ninguna salida sencilla salvaba la misión. <b className="text-ok">Este plan sí.</b></>
    : a.seed
      ? <>El copiloto probó {explored} combinaciones y ninguna supera esta salida: <b className="text-ok">es la mejor opción</b>.</>
      : gain !== null && gain > 1
        ? <>El copiloto recupera <b className="text-earth">{gb(gain)} más</b> que la mejor salida sencilla.</>
        : <>Envía casi lo mismo que la mejor salida sencilla, <b className="text-ok">con menos espera</b>.</>
  return (
    <div className="copilot-plan mt-8" aria-live="polite">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">Plan de rescate · {attempts.length} simulaciones comprobadas</p>
          <p className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">Alunizar el {landingLabel(c, a)}</p>
          <ul className="copilot-chips mt-4" aria-label="Palancas del plan">{leverLabels(c, a).map(l => <li key={l}>{l}</li>)}</ul>
          {rationale
            ? <blockquote className="copilot-why mt-5"><p className="text-xs text-ink-muted">Por qué, según el copiloto</p><p className="mt-2 text-base leading-relaxed text-ink">{rationale}</p></blockquote>
            : <p className="mt-5 text-sm leading-relaxed text-ink-muted">El copiloto no terminó a tiempo; este es el intento que mejor resultó en el simulador.</p>}
          <div className="mt-5"><MissionGlyph attempt={a} tall /></div>
          <p className="mt-2 text-xs text-ink-muted">Batería mínima {Math.round(s.minSocPct)} % · sobre el mínimo del 20 % durante toda la misión.</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-ink-muted"><span className="text-critical">Sin rescate</span>, la batería llega al mínimo{failedAt !== null ? ` el ${formatDateTime(sampleTime(c.data, failedAt))}` : ''}.</p>
          <p className="mt-5 text-sm font-bold text-ink">Datos que llegan a la Tierra</p>
          <ul className="copilot-bars mt-4">
            {bars.map(b => (
              <li key={b.label} className={`is-${b.tone}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-ink">{b.label}</span><span className="font-bold tabular-nums text-ink">{gb(b.mb)}</span></div>
                <div className="copilot-bars__track"><span style={{ width: `${Math.max(2, (b.mb / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-base leading-relaxed text-ink">{verdict}</p>
          <Button variant="primary" size="lg" className="mt-6 min-h-12 w-full sm:w-auto" onClick={() => onApply(a.siteId, a.cfg, a.startIndex)}>Aplicar este plan</Button>
        </div>
      </div>
    </div>
  )
}
