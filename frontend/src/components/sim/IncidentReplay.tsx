// Reproducción independiente: explorar el atraso nunca mueve el reloj ni cambia el plan original.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { dayNumber, formatDateTime, formatMissionClock, sampleTime } from '../../lib/time'
import { hasContact } from '../../lib/visibility'
import type { Incident } from '../../sim/incident'
import type { LanderConfig } from '../../sim/lander'
import { simulate } from '../../sim/simulate'
import type { Speed } from '../../state'
import type { SiteData } from '../../types'
import { TimeScale } from '../TimeScale'
import { ViewerPanel } from '../ViewerPanel'
import { Button, cx } from '../ui'
import { MissionLive } from './MissionLive'

export function IncidentReplay({ data, cfg, incident, missionDays, explanation }: {
  data: SiteData; cfg: LanderConfig; incident: Incident; missionDays: number; explanation: string | null
}) {
  const result = useMemo(() => simulate(data, cfg, { startIndex: incident.delayedStart, missionDays }), [data, cfg, incident.delayedStart, missionDays])
  const [index, setIndex] = useState(result.from)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(6)
  const end = result.from + result.series.soc.length - 1
  const k = index - result.from
  const mode = result.series.mode[k]
  const pause = useCallback(() => setPlaying(false), [])
  const play = () => { if (end === result.from) return; if (index >= end) setIndex(result.from); setPlaying(true) }
  const seek = (i: number) => { pause(); setIndex(Math.max(result.from, Math.min(end, i))) }
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setIndex(i => Math.min(end, i + 1)), 1000 * data.stepHours / speed)
    return () => window.clearInterval(timer)
  }, [playing, end, data.stepHours, speed])
  useEffect(() => { if (index >= end) pause() }, [index, end, pause])
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [pause])
  const sunset = incident.cause?.sunsetIndex
  const failed = result.summary.failedAtIndex
  const moments = [
    { index: result.from, label: 'Alunizaje' },
    ...(sunset !== null && sunset !== undefined && sunset > result.from && sunset <= end ? [{ index: sunset, label: 'El Sol se oculta' }] : []),
    { index: failed ?? end, label: failed !== null ? 'Batería al 20 %' : 'Misión cumplida' },
  ]
  const currentMoment = moments.findLast(m => index >= m.index)
  const gen = result.series.generatedW[k]
  const load = result.series.loadW[k]
  const phase = mode === 'failed' ? 'La batería llegó al mínimo.' : mode === 'survival' ? 'Los instrumentos se apagan para ahorrar.' : gen <= 0 ? 'La nave depende de su batería.' : gen < load ? 'El panel ya no cubre el consumo.' : 'El panel recibe energía del Sol.'
  return <>
    <div className="incident-replay grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="incident-terrain terrain-stage h-[36rem] min-w-0 sm:h-[34rem]">
        <ViewerPanel data={data} index={index} contact={hasContact(data, index)} immersive missionState={mode} showShipStatus
          missionOverlay={<MissionLive data={data} result={result} index={index} playing={playing} onPlay={play} onPause={pause} playLabel="Ver el escenario" />} />
      </div>
      <aside aria-label="Qué cambia con el atraso" className="incident-story order-3 px-1 py-2 lg:order-2 lg:row-span-2 lg:px-3 lg:py-5">
        <p className="text-xs text-ink-muted">Con la llegada atrasada</p>
        <h3 className={cx('mt-2 text-2xl font-bold leading-tight sm:text-3xl', failed !== null ? 'text-critical' : 'text-ink')}>
          {failed !== null ? `Sin energía el día ${dayNumber(data, failed, result.from)}.` : 'La misión resiste el atraso.'}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-ink">{explanation ?? 'En el periodo de datos disponible no encontramos un atraso que haga fallar este plan. Puedes recorrer este caso y comprobar su energía y comunicación.'}</p>
        <div className="mt-6 border-t border-seam pt-5">
          <p className="text-xs text-ink-muted">Ahora, en la nave</p>
          <p aria-live="polite" className="mt-2 text-lg font-bold leading-snug text-ink">{phase}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{mode === 'failed' ? 'La reproducción se detiene. Llegar al 20 % marca la falla operativa; no significa que la carga sea cero.' : mode === 'survival' ? 'Se reduce el consumo, pero también la cantidad de datos que se puede obtener.' : gen <= 0 ? 'El panel no genera potencia en esta hora. La batería alimenta la misión hasta que vuelve la luz o alcanza su mínimo.' : gen < load ? 'Todavía llega algo de luz al panel, pero produce menos de lo que necesita el módulo. La diferencia sale de la batería.' : 'Compara lo que produce el panel con lo que consume el módulo. Puedes saltar directamente a un momento clave.'}</p>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink-muted">El atraso es un supuesto de la prueba. Luz, contacto y batería se calculan con la nueva fecha y los mismos datos.</p>
      </aside>
    <section aria-label="Recorrer el escenario" className="glass-surface order-2 min-w-0 p-4 sm:p-5 lg:order-3">
      <div className="incident-moments flex flex-wrap gap-2" role="group" aria-label="Momentos clave del escenario">
        {moments.map(moment => <button key={`${moment.label}:${moment.index}`} type="button" onClick={() => seek(moment.index)}
          aria-pressed={currentMoment === moment} className="incident-moment">
          <span className="block text-sm font-bold">{moment.label}</span><span className="mt-1 block text-xs text-ink-muted">Día {dayNumber(data, moment.index, result.from)}</span>
        </button>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button size="lg" disabled={end === result.from} onClick={playing ? pause : play} aria-label={playing ? 'Pausar escenario' : 'Reproducir escenario'}>{playing ? 'Pausar' : index >= end ? 'Repetir escenario' : index > result.from ? 'Continuar escenario' : 'Reproducir escenario'}</Button>
        <p className="min-w-0 text-sm tabular-nums text-ink">{formatMissionClock(data, index, result.from)}</p>
        <input type="range" min={result.from} max={end} value={index} onChange={e => seek(Number(e.target.value))}
          className="range min-w-32 flex-1" aria-label="Avance del escenario de imprevisto" aria-valuetext={formatDateTime(sampleTime(data, index))}
          style={{ '--fill': `${end > result.from ? (index - result.from) * 100 / (end - result.from) : 0}%` } as CSSProperties} />
      </div>
      <TimeScale className="mt-4" speed={speed} onSpeed={setSpeed} spanHours={result.series.soc.length * data.stepHours} spanLabel="el escenario" />
    </section>
    </div>
  </>
}
