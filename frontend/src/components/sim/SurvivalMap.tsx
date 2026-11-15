// Mapa de supervivencia: los sitios en filas y todo el periodo de datos en columnas (un día por columna).
// Cada celda es el resultado del simulador para una misión que aluniza ese día con el módulo elegido.
// Responde de un vistazo la pregunta del reto: una franja verde larga es una misión que tolera atrasos.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatDate, formatDurationLong, sampleTime } from '../../lib/time'
import type { LanderConfig } from '../../sim/lander'
import type { DelayTolerance } from '../../sim/search'
import { dayState, rowSummary, safeRunFrom, stateRuns, type DayCell, type DayState } from '../../sim/survivalMap'
import type { SurvivalJob } from '../../sim/survivalMap.worker'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { cx } from '../ui'
import './survival-map.css'

const STATE_LABEL: Record<DayState, string> = {
  safe: 'sobrevive en todos los horarios',
  partial: 'sobrevive solo en algunos horarios',
  fail: 'la batería se agota',
  none: 'faltan datos para completar la misión',
}
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Simula todos los sitios compatibles en Workers (uno por sitio, en paralelo). */
function useSurvivalRows(sites: SiteData[], cfg: LanderConfig, missionDays: number) {
  const [rows, setRows] = useState<Record<string, DayCell[]>>({})
  const jobs = useRef(0)
  const key = sites.map(s => s.site.id).join(',')
  const cfgKey = JSON.stringify(cfg)
  useEffect(() => {
    const workers: Worker[] = []
    // Pausa corta: mover un control del módulo no lanza una simulación anual por cada paso.
    const timer = window.setTimeout(() => {
      const current = ++jobs.current
      setRows({})
      for (const data of sites) {
        const w = new Worker(new URL('../../sim/survivalMap.worker.ts', import.meta.url), { type: 'module' })
        w.onmessage = (e: MessageEvent<{ job: number; siteId: string; cells: DayCell[] }>) => {
          if (e.data.job !== current) return
          setRows(r => ({ ...r, [e.data.siteId]: e.data.cells }))
          w.terminate()
        }
        w.postMessage({ job: current, data, cfg, missionDays } satisfies SurvivalJob)
        workers.push(w)
      }
    }, 250)
    return () => { window.clearTimeout(timer); workers.forEach(w => w.terminate()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` y `cfgKey` resumen sitios y módulo
  }, [key, cfgKey, missionDays])
  return rows
}

export function SurvivalMap({ data, cfg, missionDays, landing, tolerance, onPick }: {
  data: SiteData
  cfg: LanderConfig
  missionDays: number
  /** Muestra de alunizaje del plan actual */
  landing: number
  tolerance: DelayTolerance
  onPick: (siteId: string, startIndex: number) => void
}) {
  const { state } = useAppState()
  // Solo los sitios con el mismo periodo de datos: así cada columna es el mismo día para todos.
  const sites = useMemo(() => (state.sites ?? [])
    .map(s => state.data[s.id])
    .filter((d): d is SiteData => !!d && d.start === data.start && d.stepHours === data.stepHours && d.sun.el.length === data.sun.el.length),
  [state.sites, state.data, data])
  const rows = useSurvivalRows(sites, cfg, missionDays)

  const perDay = Math.max(1, Math.round(24 / data.stepHours))
  const days = Math.ceil(data.sun.el.length / perDay)
  const pct = (day: number) => `${(day / days) * 100}%`
  const landingDay = landing / perDay
  const summaries = useMemo(() => Object.fromEntries(Object.entries(rows).map(([id, cells]) => [id, rowSummary(cells)])), [rows])
  const done = sites.length > 0 && sites.every(s => rows[s.site.id])
  const leader = done ? sites.reduce((a, b) => (summaries[b.site.id].safeDays > summaries[a.site.id].safeDays ? b : a)) : null

  const currentRow = Math.max(0, sites.findIndex(s => s.site.id === data.site.id))
  const [cursor, setCursor] = useState<{ row: number; day: number } | null>(null)
  const [hover, setHover] = useState(false)
  const focusCursor = cursor ?? { row: currentRow, day: Math.min(days - 1, Math.floor(landingDay)) }
  const mapRef = useRef<HTMLDivElement>(null)

  const months = useMemo(() => {
    const start = new Date(data.start)
    const out: Array<{ day: number; label: string }> = []
    for (let m = 0; m < 13; m++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1))
      const day = Math.round((d.getTime() - start.getTime()) / 86_400_000)
      if (day >= 0 && day < days) out.push({ day, label: MONTHS[d.getUTCMonth()] })
    }
    return out
  }, [data.start, days])

  const cellAt = (row: number, day: number) => rows[sites[row]?.site.id]?.[day]
  const startFor = (row: number, day: number): number | null => {
    const c = cellAt(row, day)
    if (!c || c.total === 0) return null
    return c.starts[0] ?? day * perDay
  }
  const pick = (row: number, day: number) => {
    const s = startFor(row, day)
    if (s !== null) onPick(sites[row].site.id, s)
  }
  const describe = (row: number, day: number) => {
    const site = sites[row]
    const c = cellAt(row, day)
    if (!site) return ''
    const date = formatDate(sampleTime(data, day * perDay))
    if (!c) return `${site.site.name}, ${date}: simulando…`
    const st = dayState(c)
    return `${site.site.name}, ${date}: ${STATE_LABEL[st]}${st === 'partial' ? ` (${c.ok} de ${c.total})` : ''}.`
  }

  const dayFromX = (e: { clientX: number; currentTarget: HTMLElement }) => {
    const b = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(days - 1, Math.floor(((e.clientX - b.left) / b.width) * days)))
  }
  const onMove = (row: number) => (e: PointerEvent<HTMLDivElement>) => {
    setCursor({ row, day: dayFromX(e) })
    setHover(true)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = focusCursor
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], PageUp: [0, -7], PageDown: [0, 7] }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(c.row, c.day); return }
    const m = e.key === 'Home' ? [0, -c.day] : e.key === 'End' ? [0, days - 1 - c.day] : moves[e.key]
    if (!m) return
    e.preventDefault()
    setCursor({ row: Math.max(0, Math.min(sites.length - 1, c.row + m[0])), day: Math.max(0, Math.min(days - 1, c.day + m[1])) })
  }
  const showCursor = cursor !== null && (hover || document.activeElement === mapRef.current)
  const toleranceDays = tolerance.survivesNow ? tolerance.days : 0

  // Respuestas concretas, sacadas del mapa: el plan, la misma fecha en otro sitio y el mismo sitio en otra fecha.
  const today = Math.min(days - 1, Math.floor(landingDay))
  const sameDay = sites
    .map((s, r) => ({ s, r, c: rows[s.site.id]?.[today] }))
    .filter((x) => x.r !== currentRow && x.c && x.c.ok > 0)
    .sort((a, b) => (summaries[b.s.site.id]?.safeDays ?? 0) - (summaries[a.s.site.id]?.safeDays ?? 0))
  const currentCells = rows[data.site.id]
  const nextSafe = (from: number) => {
    if (!currentCells) return null
    for (let d = from; d < days; d++) if (dayState(currentCells[d]) === 'safe') return d
    return null
  }
  // Si el plan sobrevive: último día seguro seguido (la fecha límite) y cuándo vuelve a funcionar después.
  const run = currentCells ? safeRunFrom(currentCells, today) : 0
  const lastSafe = run > 0 ? today + run - 1 : null
  const nextDate = nextSafe(run > 0 ? today + run : today + 1)
  const dateOf = (day: number) => formatDate(sampleTime(data, day * perDay))

  return (
    <section aria-labelledby="survival-title" data-tour="sim-map" className="survival-map glass-surface my-6 p-5 sm:p-7">
      <p className="text-xs text-ink-muted">Mapa de supervivencia</p>
      <h3 id="survival-title" className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-3xl">¿Qué pasa si cambias la fecha o el sitio?</h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">Simulamos tu misión de {missionDays} días con este mismo módulo empezando <b className="text-ink">cada día del año</b>, en <b className="text-ink">los {sites.length} sitios</b>. Así ves al instante qué cambia si el alunizaje se atrasa o si eliges otro lugar.</p>

      <div className="survival-answers mt-6" aria-live="polite">
        <div className={cx('survival-answer', tolerance.survivesNow ? 'is-ok' : 'is-fail')}>
          <p className="survival-answer__k">Tu plan · {data.site.name}, {dateOf(today)}</p>
          <p className="survival-answer__v">{tolerance.survivesNow ? '✓ Sobrevive' : '✗ Se queda sin batería'}</p>
          <p className="survival-answer__d">{tolerance.survivesNow
            ? (toleranceDays > 0 ? <>Aguanta <b>{formatDurationLong(toleranceDays * 24)}</b> de atraso. Más tarde, ya no.</> : 'Pero un atraso de 6 horas ya la hace fallar.')
            : 'Con esta fecha y este sitio la misión no llega al final.'}</p>
        </div>
        <div className="survival-answer">
          <p className="survival-answer__k">La misma fecha, en otro sitio</p>
          {!done ? <p className="survival-answer__d">Simulando…</p> : sameDay.length ? <>
            <p className="survival-answer__v">{sameDay[0].s.site.name}</p>
            <p className="survival-answer__d">{sameDay.length > 1 ? `También sobrevive en ${sameDay.slice(1).map((x) => x.s.site.name).join(', ')}.` : 'Es el único otro sitio donde sobrevive ese día.'}</p>
            <button type="button" className="survival-answer__go" onClick={() => pick(sameDay[0].r, today)}>Probar en {sameDay[0].s.site.name} →</button>
          </> : <><p className="survival-answer__v">Ningún sitio</p><p className="survival-answer__d">Ese día no sobrevive en ningún otro lugar con este módulo.</p></>}
        </div>
        {lastSafe !== null ? <div className="survival-answer">
          <p className="survival-answer__k">Fecha límite en {data.site.name}</p>
          <p className="survival-answer__v">{dateOf(lastSafe)}</p>
          <p className="survival-answer__d">Es el último día seguido en que la misión sobrevive.{nextDate !== null ? ` Después falla, y vuelve a funcionar el ${dateOf(nextDate)}.` : ' Después ya no vuelve a funcionar este año.'}</p>
        </div> : <div className="survival-answer">
          <p className="survival-answer__k">El mismo sitio, otra fecha</p>
          {!currentCells ? <p className="survival-answer__d">Simulando…</p> : nextDate !== null ? <>
            <p className="survival-answer__v">{dateOf(nextDate)}</p>
            <p className="survival-answer__d">La próxima fecha segura en {data.site.name}, {nextDate - today === 1 ? 'un día después' : `${nextDate - today} días después`}.</p>
            <button type="button" className="survival-answer__go" onClick={() => pick(currentRow, nextDate)}>Probar esa fecha →</button>
          </> : <><p className="survival-answer__v">Ninguna</p><p className="survival-answer__d">No hay otra fecha segura en {data.site.name} este año.</p></>}
        </div>}
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-sm font-bold text-ink">Todo el año, sitio por sitio</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span><i aria-hidden className="survival-key is-safe" />Sobrevive</span>
          <span><i aria-hidden className="survival-key is-partial" />Depende de la hora</span>
          <span><i aria-hidden className="survival-key is-fail" />Se queda sin batería</span>
          <span><i aria-hidden className="survival-key is-tol" />Atraso que aguanta tu plan</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-faint">Cada fila es un sitio y cada columna, un día de alunizaje. Pasa el cursor para leer un día; haz clic para simularlo.</p>

      <div className="survival-scroll mt-6">
        <div className="survival-grid">
          <div aria-hidden />
          <div className="survival-landing-label" aria-hidden>
            <span style={{ left: pct(landingDay) }}>▼ Tu alunizaje ({dateOf(today)})</span>
          </div>
          <div aria-hidden />

          <div className="survival-names" aria-hidden>
            {sites.map((s, r) => <p key={s.site.id} className={cx(r === currentRow && 'is-current')}>{s.site.name}{r === currentRow && <small>tu sitio</small>}</p>)}
          </div>

          <div ref={mapRef} className="survival-map__body" tabIndex={0} role="group" aria-roledescription="mapa"
            aria-label={`Mapa de supervivencia. Flechas para moverte por sitios y días, Enter para simular. ${describe(focusCursor.row, focusCursor.day)}`}
            onKeyDown={onKey} onPointerLeave={() => setHover(false)} onFocus={() => setCursor(focusCursor)}>
            {sites.map((s, r) => {
              const cells = rows[s.site.id]
              return (
                <div key={s.site.id} className={cx('survival-row', r === currentRow && 'is-current')} onPointerMove={onMove(r)} onClick={(e) => pick(r, dayFromX(e))}>
                  {cells ? (
                    <svg viewBox={`0 0 ${days} 1`} preserveAspectRatio="none" aria-hidden>
                      {stateRuns(cells).filter(run => run.state !== 'none').map(run => <rect key={run.start} x={run.start} width={run.end - run.start} y={0} height={1} className={`is-${run.state}`} />)}
                    </svg>
                  ) : <span className="survival-loading" aria-hidden />}
                  {r === currentRow && toleranceDays > 0 && <span aria-hidden className="survival-tolerance" style={{ left: pct(landingDay), width: pct(toleranceDays) }} />}
                </div>
              )
            })}
            <span aria-hidden className="survival-marker" style={{ left: pct(landingDay) }} />
            {showCursor && cursor && <>
              <span aria-hidden className="survival-cursor" style={{ left: pct(cursor.day), top: `${(cursor.row / sites.length) * 100}%`, height: `${100 / sites.length}%`, width: `max(3px, ${pct(1)})` }} />
              <p aria-hidden className={cx('survival-tip', cursor.day > days * 0.7 && 'is-left', cursor.row < 2 && 'is-below')} style={{ left: pct(cursor.day), top: `${(cursor.row / sites.length) * 100}%` }}>
                {describe(cursor.row, cursor.day)}<span>Clic o Enter para simularlo</span>
              </p>
            </>}
          </div>

          <div className="survival-stats" aria-hidden>
            {sites.map((s, r) => {
              const sum = summaries[s.site.id]
              return <p key={s.site.id} className={cx(r === currentRow && 'is-current')}>
                {sum ? <><b className="tabular-nums">{sum.safeDays}</b> días seguros{s.site.id === leader?.site.id && <small className="is-best">el más confiable</small>}</> : '…'}
              </p>
            })}
          </div>

          <div aria-hidden />
          <div className="survival-months" aria-hidden>{months.map(m => <span key={m.day} style={{ left: pct(m.day) }}>{m.label}</span>)}</div>
          <div aria-hidden />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">Cada día se prueban cuatro horas de alunizaje (cada 6 horas) con JPL Horizons, el horizonte LOLA y el modelo de energía. Los últimos días del año quedan sin color: la misión ya no cabe en los datos de {new Date(data.start).getUTCFullYear()}.</p>
    </section>
  )
}
