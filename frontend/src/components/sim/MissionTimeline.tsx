// Reproducción de la misión: lo que pasa se ve aquí mismo mientras avanza el tiempo.
// Arriba, los valores del momento (batería, Sol, Tierra, datos) y el último suceso; debajo, la misión entera
// dibujada (Sol, Tierra y batería) con un cursor que avanza. Todo sale de la simulación (`SimResult`).
import { useMemo, type CSSProperties } from 'react'
import { dayNumber, formatDate, formatDateTime, sampleTime } from '../../lib/time'
import { MIN_SOC } from '../../sim/lander'
import type { SimResult } from '../../sim/simulate'
import type { Speed } from '../../state'
import type { SiteData } from '../../types'
import { TimeScale } from '../TimeScale'
import { Button, cx } from '../ui'
import { MissionControl } from './MissionControl'
import type { IncidentOption } from '../../sim/incident'
import './mission-timeline.css'

const W = 1000
const H = 80

/** Tramos seguidos en los que `on` es verdadero, en muestras desde el alunizaje. */
function runs(n: number, on: (k: number) => boolean): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let s = -1
  for (let k = 0; k <= n; k++) {
    const v = k < n && on(k)
    if (v && s < 0) s = k
    if (!v && s >= 0) { out.push([s, k]); s = -1 }
  }
  return out
}

export function MissionTimeline({ data, result, lit, contact, index, playing, speed, survivalThreshold, fix, onToggle, onSeek, onSpeed, onRescue }: {
  data: SiteData
  result: SimResult
  lit: boolean[]
  contact: boolean[]
  index: number
  playing: boolean
  speed: Speed
  survivalThreshold: number
  onToggle: () => void
  onSeek: (index: number) => void
  onSpeed: (speed: Speed) => void
  /** La mejor salida simulada si la misión falla («así lo resolvemos») */
  fix: IncidentOption | null
  onRescue?: () => void
}) {
  const { series, events, summary, from, plan } = result
  const n = series.soc.length
  const end = from + n - 1
  const k = Math.max(0, Math.min(n - 1, index - from))
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W)
  const y = (soc: number) => H - 2 - soc * (H - 6)
  const cursor = x(k)
  const atEnd = index >= end
  const day = Math.min(plan.missionDays, Math.max(1, dayNumber(data, index, from)))

  const drawing = useMemo(() => {
    const step = Math.max(1, Math.ceil(n / 400))
    let line = ''
    for (let i = 0; i < n; i += step) line += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(series.soc[i]).toFixed(1)}`
    line += `L${x(n - 1).toFixed(1)},${y(series.soc[n - 1]).toFixed(1)}`
    return {
      line,
      area: `${line}L${x(n - 1).toFixed(1)},${H}L0,${H}Z`,
      sun: runs(n, (i) => lit[from + i]),
      earth: runs(n, (i) => contact[from + i]),
      marks: events.filter((e) => e.type === 'survival' || e.type === 'failure' || e.type === 'recovered'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `x` e `y` dependen solo de `n`
  }, [series, n, lit, contact, from, events])

  const soc = series.soc[k]
  const gen = series.generatedW[k]
  const load = series.loadW[k]
  const mode = series.mode[k]
  const sunNow = lit[index]
  const earthNow = contact[index]
  const status = mode === 'failed' ? 'La batería llegó al 20 %: la misión falla.'
    : mode === 'survival' ? 'Modo ahorro: los instrumentos se apagan para no gastar batería.'
    : gen <= 0 ? 'Sin Sol: la nave usa su batería.'
    : gen < load ? 'Poco Sol: el panel no alcanza y la batería ayuda.'
    : 'El panel recibe energía del Sol y carga la batería.'
  const control = useMemo(() => ({ data, result, lit, contact, survivalThreshold, fix }), [data, result, lit, contact, survivalThreshold, fix])

  return (
    <section aria-label="Reproducir la misión" className="mission-timeline glass-surface my-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button variant="primary" className="min-h-12" onClick={onToggle}>
          {playing ? 'Pausar' : atEnd ? '↻ Ver de nuevo' : index > from ? '▶ Continuar' : '▶ Reproducir la misión'}
        </Button>
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums text-ink">Día {day} de {plan.missionDays}</p>
          <p className="text-xs tabular-nums text-ink-muted">{formatDateTime(sampleTime(data, index))}</p>
        </div>
        <TimeScale className="lg:ml-auto" speed={speed} onSpeed={onSpeed} spanHours={n * data.stepHours}
          spanLabel={summary.failedAtIndex !== null ? 'hasta la falla' : `la misión de ${plan.missionDays} días`} />
      </div>

      {/* Lo que pasa en este momento */}
      <div className="mission-now mt-5" aria-live="polite">
        <div className={cx('mission-now__tile', mode === 'failed' ? 'is-fail' : soc < survivalThreshold ? 'is-warn' : 'is-ok')}>
          <span>Batería</span><b className="tabular-nums">{Math.round(soc * 100)} %</b>
          <i aria-hidden><i style={{ width: `${soc * 100}%` }} /></i>
        </div>
        <div className={cx('mission-now__tile', sunNow ? 'is-sun' : 'is-off')}>
          <span>Sol</span><b>{sunNow ? 'Ilumina el panel' : 'Oculto'}</b>
          <small className="tabular-nums">{Math.round(gen)} W de {Math.round(load)} W que consume</small>
        </div>
        <div className={cx('mission-now__tile', earthNow ? 'is-earth' : 'is-off')}>
          <span>Tierra</span><b>{earthNow ? 'Con contacto' : 'Sin contacto'}</b>
          <small>{earthNow ? 'Puede enviar datos' : 'Los datos esperan'}</small>
        </div>
        <div className="mission-now__tile">
          <span>Datos enviados</span><b className="tabular-nums">{(series.dataSentMb[k] / 1000).toFixed(1)} Gb</b>
          <small className="tabular-nums">{(series.dataQueuedMb[k] / 1000).toFixed(1)} Gb en espera</small>
        </div>
      </div>
      <p className={cx('mt-4 text-base font-bold leading-snug', mode === 'failed' ? 'text-critical' : mode === 'survival' ? 'text-caution' : 'text-ink')}>{status}</p>
      <MissionControl ctx={control} index={index} playing={playing} onRescue={onRescue} />

      {/* La misión entera: Sol, Tierra y batería, con el cursor del momento */}
      <div className="mission-track mt-5">
        <div className="mission-track__labels" aria-hidden><span>Sol</span><span>Tierra</span><span>Batería</span></div>
        <div className="mission-track__body">
          <svg className="mission-track__strip" viewBox={`0 0 ${W} 1`} preserveAspectRatio="none" aria-hidden>
            {drawing.sun.map(([s, e]) => <rect key={s} x={x(s)} width={Math.max(1, x(e) - x(s))} y={0} height={1} className="fill-sun" />)}
          </svg>
          <svg className="mission-track__strip" viewBox={`0 0 ${W} 1`} preserveAspectRatio="none" aria-hidden>
            {drawing.earth.map(([s, e]) => <rect key={s} x={x(s)} width={Math.max(1, x(e) - x(s))} y={0} height={1} className="fill-earth" />)}
          </svg>
          <svg className="mission-track__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
            <path d={drawing.area} className={cx('mission-track__area', !summary.survived && 'is-fail')} />
            <path d={drawing.line} className={cx('mission-track__line', !summary.survived && 'is-fail')} />
            <line x1={0} x2={W} y1={y(survivalThreshold)} y2={y(survivalThreshold)} className="mission-track__save" />
            <line x1={0} x2={W} y1={y(MIN_SOC)} y2={y(MIN_SOC)} className="mission-track__floor" />
            {drawing.marks.map((e) => <circle key={`${e.type}${e.index}`} cx={x(e.index - from)} cy={y(series.soc[e.index - from] ?? MIN_SOC)} r={4} className={`mission-track__mark is-${e.type}`} />)}
          </svg>
          {/* Lo que falta por reproducir queda atenuado */}
          <span aria-hidden className="mission-track__future" style={{ left: `${(cursor / W) * 100}%` }} />
          <span aria-hidden className="mission-track__cursor" style={{ left: `${(cursor / W) * 100}%` }} />
          <input type="range" className="mission-track__input" min={from} max={end} value={index} onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Momento de la misión" aria-valuetext={`Día ${day} de ${plan.missionDays}, ${formatDateTime(sampleTime(data, index))}. Batería ${Math.round(soc * 100)} %.`}
            style={{ '--fill': `${(cursor / W) * 100}%` } as CSSProperties} />
        </div>
        <div aria-hidden />
        <div className="mission-track__ends">
          <span>Alunizaje · {formatDate(sampleTime(data, from))}</span>
          {summary.failedAtIndex !== null
            ? <span className="text-critical">Sin energía · {formatDateTime(sampleTime(data, summary.failedAtIndex))}</span>
            : <span>Fin · {formatDate(sampleTime(data, result.to))}</span>}
        </div>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
        <span><i aria-hidden className="mission-key is-sun" />Sol sobre el horizonte</span>
        <span><i aria-hidden className="mission-key is-earth" />Contacto con la Tierra</span>
        <span><i aria-hidden className="mission-key is-save" />Modo ahorro ({Math.round(survivalThreshold * 100)} %)</span>
        <span><i aria-hidden className="mission-key is-floor" />Falla (20 %)</span>
        <span>Haz clic o arrastra sobre la línea para ir a cualquier momento.</span>
      </p>
    </section>
  )
}
