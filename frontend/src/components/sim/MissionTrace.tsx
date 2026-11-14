// Batería hora por hora y registro de eventos de la misión simulada (SU2).
// El cursor es el instante de la línea de tiempo: al reproducir, la misión avanza en el gráfico y en el registro.

import { useEffect, useRef, type MouseEvent, type KeyboardEvent } from 'react'
import { formatShortDate, sampleTime } from '../../lib/time'
import { windows } from '../../lib/visibility'
import { MIN_SOC } from '../../sim/lander'
import type { EventType, SimResult } from '../../sim/simulate'
import type { SiteData } from '../../types'
import { cx, Panel, Stat, StatGrid } from '../ui'

const EVENT_COLOR: Record<EventType, string> = {
  landing: 'bg-ink',
  'sun-rise': 'bg-sun',
  'sun-set': 'bg-sun/40',
  'contact-open': 'bg-earth',
  'contact-close': 'bg-earth/40',
  survival: 'bg-caution',
  recovered: 'bg-ok',
  failure: 'bg-critical',
  complete: 'bg-ok',
}

export function MissionTrace({
  data,
  result,
  lit,
  contact,
  survivalThreshold,
  index,
  onSeek,
}: {
  data: SiteData
  result: SimResult
  lit: boolean[]
  contact: boolean[]
  survivalThreshold: number
  index: number
  onSeek: (index: number) => void
}) {
  const { from, to, series, events } = result
  const len = to - from
  const simulated = series.soc.length
  const inMission = index >= from && index < from + simulated
  const k = inMission ? index - from : -1
  const seekEnd = from + simulated - 1
  const keyboardSeek = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = e.key === 'Home' ? from : e.key === 'End' ? seekEnd
      : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? index + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? index - 1 : null
    if (next === null) return
    e.preventDefault()
    onSeek(Math.max(from, Math.min(seekEnd, next)))
  }
  const y = (soc: number) => (1 - soc) * 100

  // Batería: línea y área. Una muestra por paso desde el alunizaje.
  const line = series.soc.map((s, j) => `${j === 0 ? 'M' : 'L'}${j + 0.5},${y(s).toFixed(2)}`).join(' ')
  const area = simulated ? `${line} L${simulated - 0.5},100 L0.5,100 Z` : ''
  const survivalRuns = windows(series.mode.map((m) => m === 'survival'))
  const litRuns = windows(lit.slice(from, to))
  const contactRuns = windows(contact.slice(from, to))
  const days = Math.round((len * data.stepHours) / 24)
  const dayTicks = Array.from({ length: Math.floor(days / (days > 14 ? 7 : 2)) + 1 }, (_, d) => d * (days > 14 ? 7 : 2)).filter((d) => d < days)

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.min(seekEnd, Math.max(from, from + Math.round(((e.clientX - r.left) / r.width) * (len - 1)))))
  }

  return (
    <Panel label={`Batería y eventos · ${data.site.name}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {inMission ? (
            <>
              Batería ahora: <span className="font-mono text-ink">{Math.round(series.soc[k] * 100)} %</span>
              <span className="ml-2 text-ink-faint">{modeLabel(series.mode[k])}</span>
            </>
          ) : index >= from + simulated && !result.summary.survived ? (
            <span className="text-critical">La misión ya terminó por falta de energía.</span>
          ) : (
            <span className="text-ink-faint">La línea de tiempo está fuera de la misión.</span>
          )}
        </p>
        <span className="font-mono text-xs text-ink-faint">{days} días</span>
      </div>

      {inMission && <StatGrid className="mt-4">
        <Stat label="Enviados a la Tierra" value={Math.round(series.dataSentMb[k]).toLocaleString('es')} unit="Mb" tone="earth" />
        <Stat label="Esperando envío" value={Math.round(series.dataQueuedMb[k]).toLocaleString('es')} unit="Mb"
          detail={contact[index] ? 'Hay contacto con la Tierra' : 'A la espera de contacto'} />
      </StatGrid>}

      {/* Gráfico */}
      <div className="mt-3 grid grid-cols-[2.5rem_1fr] gap-x-2">
        <div className="relative h-40">
          {[100, survivalThreshold * 100, MIN_SOC * 100].map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2 font-mono text-[0.625rem] text-ink-faint" style={{ top: `${y(v / 100)}%` }}>
              {Math.round(v)} %
            </span>
          ))}
        </div>
        <div className="relative h-40 cursor-pointer" onClick={seek} onKeyDown={keyboardSeek} role="slider" tabIndex={0}
          aria-label="Recorrer batería de la misión" aria-valuemin={from} aria-valuemax={seekEnd} aria-valuenow={Math.max(from, Math.min(seekEnd, index))}
          aria-valuetext={inMission ? `${Math.round(series.soc[k] * 100)} % de batería, ${modeLabel(series.mode[k])}` : 'Fuera de la misión'}>
          <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${len} 100`} preserveAspectRatio="none" aria-hidden>
            {survivalRuns.map((r) => (
              <rect key={r.start} x={r.start} y={0} width={r.end - r.start} height={100} className="fill-caution/10" />
            ))}
            <line x1={0} x2={len} y1={y(survivalThreshold)} y2={y(survivalThreshold)} className="stroke-caution/70" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={len} y1={y(MIN_SOC)} y2={y(MIN_SOC)} className="stroke-critical/80" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <path d={area} className="fill-ink/6" />
            <path d={line} fill="none" className="stroke-ink" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
            {result.summary.failedAtIndex !== null && (
              <line x1={result.summary.failedAtIndex - from + 0.5} x2={result.summary.failedAtIndex - from + 0.5} y1={0} y2={100}
                className="stroke-critical" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {inMission && (
            <span className="pointer-events-none absolute inset-y-0 w-px bg-ink/80" style={{ left: `${((k + 0.5) / len) * 100}%` }}>
              <span className="absolute -left-1 size-2 rounded-full bg-ink" style={{ top: `calc(${y(series.soc[k])}% - 4px)` }} />
            </span>
          )}
        </div>

        {/* Luz y contacto durante la misión */}
        <span className="instrument-label mt-2 self-center text-right text-[0.625rem]">Sol</span>
        <Strip runs={litRuns} len={len} className="fill-sun" />
        <span className="instrument-label self-center text-right text-[0.625rem]">Tierra</span>
        <Strip runs={contactRuns} len={len} className="fill-earth" />
        <span />
        <div className="relative h-4">
          {dayTicks.map((d) => (
            <span key={d} className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[0.625rem] text-ink-faint first:translate-x-0"
              style={{ left: `${((d * 24) / data.stepHours / len) * 100}%` }}>
              {formatShortDate(sampleTime(data, from + (d * 24) / data.stepHours))}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-ink-faint">
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-px w-4 border-t border-dashed border-caution" /> Modo supervivencia ({Math.round(survivalThreshold * 100)} %)</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-px w-4 border-t border-dashed border-critical" /> Mínimo: falla (20 %)</span>
      </div>

      <EventLog events={events} index={index} onSeek={onSeek} />
    </Panel>
  )
}

function modeLabel(mode: 'nominal' | 'survival' | 'failed'): string {
  return mode === 'nominal' ? 'Modo nominal' : mode === 'survival' ? 'Modo supervivencia' : 'Sin energía'
}

function Strip({ runs, len, className }: { runs: Array<{ start: number; end: number }>; len: number; className: string }) {
  return (
    <div className="relative mt-2 h-2 bg-hull-raised">
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${len} 1`} preserveAspectRatio="none" aria-hidden>
        {runs.map((r) => (
          <rect key={r.start} x={r.start} y={0} width={r.end - r.start} height={1} className={className} />
        ))}
      </svg>
    </div>
  )
}

function EventLog({ events, index, onSeek }: { events: SimResult['events']; index: number; onSeek: (i: number) => void }) {
  const list = useRef<HTMLOListElement>(null)
  // El último evento ya ocurrido queda a la vista mientras avanza la reproducción.
  const lastPast = events.reduce((acc, e, j) => (e.index <= index ? j : acc), -1)
  useEffect(() => {
    // Solo se desplaza el registro (no la página ni la columna).
    const ol = list.current
    const el = ol?.children[lastPast] as HTMLElement | undefined
    if (!ol || !el) return
    const top = el.offsetTop
    if (top < ol.scrollTop || top + el.offsetHeight > ol.scrollTop + ol.clientHeight) {
      ol.scrollTop = Math.max(0, top - ol.clientHeight / 2)
    }
  }, [lastPast])

  return (
    <div className="mt-5 border-t border-seam pt-4">
      <p className="instrument-label">Registro de la misión · {events.length} eventos</p>
      <ol ref={list} className="relative mt-2 max-h-56 overflow-y-auto pr-1">
        {events.map((e, j) => {
          const past = e.index <= index
          return (
            <li key={`${e.index}-${e.type}-${j}`}>
              <button
                type="button"
                onClick={() => onSeek(e.index)}
                className={cx(
                  'flex w-full items-start gap-2.5 px-2 py-1.5 text-left text-xs leading-relaxed transition-colors hover:bg-hull-raised',
                  j === lastPast && 'bg-hull-raised',
                  past ? 'text-ink' : 'text-ink-faint',
                )}
              >
                <span aria-hidden className={cx('mt-1.5 size-1.5 shrink-0', EVENT_COLOR[e.type])} />
                {e.message}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
