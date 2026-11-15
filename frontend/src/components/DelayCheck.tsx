// «¿Y si la misión se atrasa?»: el plan original junto al mismo plan con un atraso que elige el usuario.
// Sin repetir el viaje ni salir del resultado. Luz, contacto y batería salen de los datos y del módulo.
import { useMemo, useState } from 'react'
import { dayNumber, formatDateTime, formatDurationLong, sampleTime } from '../lib/time'
import type { Visibility } from '../lib/visibility'
import { compareDelay, type PlanOutcome } from '../sim/delay'
import type { LanderConfig } from '../sim/lander'
import { delayTolerance } from '../sim/search'
import type { SiteData } from '../types'
import { PlanStrips } from './PlanStrips'
import { MissionBasics } from './MissionBasics'
import { Button, Segmented } from './ui'
import './delay-check.css'

const DELAYS = [
  { value: '24', label: '+1 día' },
  { value: '72', label: '+3 días' },
  { value: '168', label: '+1 semana' },
  { value: '336', label: '+2 semanas' },
] as const

const when = (data: SiteData, i: number) => formatDateTime(sampleTime(data, i))

export function DelayCheck({ data, vis, cfg, moduleName, startIndex, missionDays, onApply }: {
  data: SiteData
  vis: Visibility
  cfg: LanderConfig
  moduleName: string
  startIndex: number
  missionDays: number
  onApply: (index: number) => void
}) {
  const [delay, setDelay] = useState<(typeof DELAYS)[number]['value']>('72')
  const c = useMemo(() => compareDelay(data, vis, cfg, startIndex, missionDays, Number(delay)), [data, vis, cfg, startIndex, missionDays, delay])
  const tolerance = useMemo(() => delayTolerance(data, cfg, c.original.from, missionDays, vis), [data, cfg, c.original.from, missionDays, vis])
  const label = formatDurationLong(c.appliedHours)
  const failedDay = c.delayed.failedAtIndex === null ? null : dayNumber(data, c.delayed.failedAtIndex, c.delayed.from)
  const verdict = c.appliedHours === 0
    ? { text: 'No queda espacio para atrasar esta misión.', detail: 'Elige una fecha anterior: la misión completa tiene que caber en los datos de 2027.' }
    : c.stillWorks
      ? { text: `Con la nueva fecha, la misión completa los ${missionDays} días.`, detail: c.original.survived ? 'La batería alcanza hasta el final. Abajo puedes ver qué cambia con el atraso.' : 'Tu plan actual no llega al final. Con esta fecha, la batería sí alcanza.' }
      : { text: `Con la nueva fecha, la misión se queda sin energía el día ${failedDay}.`, detail: `La batería llega a su mínimo operativo (20 %) el ${when(data, c.delayed.failedAtIndex!)}.` }
  const hours = (o: PlanOutcome, pct: number) => formatDurationLong((o.to - o.from) * data.stepHours * pct / 100)

  return (
    <section aria-labelledby="delay-title" data-tour="delay" className="delay-check glass-surface p-5 sm:p-6">
      <h2 id="delay-title" className="text-xl font-bold text-ink sm:text-2xl">¿Qué pasa si llegas más tarde?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">Probamos el mismo sitio y módulo durante los mismos días. Solo movemos la fecha de alunizaje.</p>
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-ink">¿Cuánto se atrasa la llegada?</p>
        <Segmented label="Atraso del alunizaje" options={DELAYS} value={delay} onChange={setDelay} className="w-full sm:w-auto [&_button]:min-h-11 [&_button]:px-1.5 [&_button]:text-xs sm:[&_button]:px-3.5 sm:[&_button]:text-sm" />
      </div>

      <div className="delay-dates mt-6 grid gap-4 border-y border-seam py-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <div><p className="text-xs text-ink-muted">Tu llegada actual</p><p className="mt-2 text-base font-bold text-ink">{when(data, c.original.from)}</p></div>
        <p className="text-sm font-bold text-ink">{label} después <span aria-hidden className="hidden sm:inline">→</span></p>
        <div><p className="text-xs text-ink-muted">La fecha que estás probando</p><p className="mt-2 text-base font-bold text-ink">{when(data, c.delayed.from)}</p></div>
      </div>
      {c.cutByPeriod && <p role="status" className="mt-3 text-sm leading-relaxed text-ink-muted">El atraso se limitó para conservar toda la misión dentro de los datos de 2027.</p>}

      <div className="mt-6" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-xl font-bold leading-snug text-ink sm:text-2xl">{verdict.text}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{verdict.detail}</p>
      </div>

      <MissionBasics />
      <table className="delay-comparison mt-6 w-full text-sm">
        <caption className="mb-3 text-left text-base font-bold text-ink">Qué cambia durante tu misión</caption>
        <thead><tr><th scope="col"><span className="sr-only">Condición</span></th><th scope="col">Plan actual</th><th scope="col">Nueva fecha</th></tr></thead>
        <tbody>
          <tr><th scope="row">¿Completa la misión?</th><td className="text-ink">{c.original.survived ? 'Sí' : 'No'}</td><td className="text-ink">{c.delayed.survived ? 'Sí' : 'No'}</td></tr>
          <tr><th scope="row">Luz disponible para producir energía<span className="block text-xs font-normal text-ink-muted">La batería cubre la falta de producción.</span></th><td>{hours(c.original, c.original.lightPct)}</td><td>{hours(c.delayed, c.delayed.lightPct)}</td></tr>
          <tr><th scope="row">Oportunidades para enviar mediciones<span className="block text-xs font-normal text-ink-muted">Sin señal, las guarda a bordo.</span></th><td>{hours(c.original, c.original.contactPct)}</td><td>{hours(c.delayed, c.delayed.contactPct)}</td></tr>
        </tbody>
      </table>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
          {tolerance.survivesNow
            ? <>Tu plan actual admite hasta <strong className="text-ink">{formatDurationLong(tolerance.days * 24)}</strong> de atraso{tolerance.limitedByPeriod ? ' (límite de los datos disponibles)' : ''}.</>
            : 'El plan actual ya necesita otra fecha o configuración.'}
        </p>
        <Button size="lg" onClick={() => onApply(c.delayed.from)} disabled={c.appliedHours === 0}>Cambiar a la nueva fecha</Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">Estás probando una alternativa. Tu plan cambia cuando pulses el botón.</p>

      <details className="delay-detail mt-6 border-t border-seam pt-2">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-sm font-bold text-ink-muted">Explorar los días de cada plan<span aria-hidden>＋</span></summary>
        <p className="mb-5 text-xs leading-relaxed text-ink-muted">Cada día cuenta 24 horas desde el alunizaje. Elige uno para comparar sus condiciones en cada plan.</p>
        <div className="grid gap-5">
          <PlanLine title="Tu plan" when={when(data, c.original.from)} o={c.original} vis={vis} data={data} moduleName={moduleName} />
          <PlanLine title={`Con ${label} de atraso`} when={when(data, c.delayed.from)} o={c.delayed} vis={vis} data={data} moduleName={moduleName} change={Math.round(c.delayed.viability) - Math.round(c.original.viability)} />
        </div>
      </details>
    </section>
  )
}

/** Un plan como franja: cuándo hay Sol y Tierra, dónde se agota la batería y su puntaje. */
function PlanLine({ title, when, o, vis, data, moduleName, change }: {
  title: string; when: string; o: PlanOutcome; vis: Visibility; data: SiteData; moduleName: string; change?: number
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-ink">{title} <span className="font-normal text-ink-faint">· desde {when}</span></p>
        <p className="text-sm tabular-nums text-ink">
          {Math.round(o.viability)}/100
          {change !== undefined && change !== 0 && <span className="ml-2 text-xs font-bold text-ink-muted">{change > 0 ? `+${change}` : `−${-change}`}</span>}
          <span className="ml-3"><Battery o={o} /></span>
        </p>
      </div>
      <PlanStrips lit={vis.lit} contact={vis.contact} from={o.from} to={o.to} stepHours={data.stepHours} failedAt={o.failedAtIndex} startTime={sampleTime(data, o.from).getTime()} />
      <span className="sr-only">Batería: {moduleName}.</span>
    </div>
  )
}

function Battery({ o }: { o: PlanOutcome }) {
  return o.survived
    ? <span className="text-xs font-bold text-ink">Batería: aguanta</span>
    : <span className="text-xs font-bold text-ink">Batería: se agota</span>
}
