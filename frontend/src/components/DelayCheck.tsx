// «¿Y si la misión se atrasa?»: el plan original junto al mismo plan con un atraso que elige el usuario.
// Sin repetir el viaje ni salir del resultado. Luz, contacto y batería salen de los datos y del módulo.
import { useMemo, useState } from 'react'
import { formatDurationLong, formatShortDate, formatTime, sampleTime } from '../lib/time'
import type { Visibility } from '../lib/visibility'
import { compareDelay, type PlanOutcome } from '../sim/delay'
import type { LanderConfig } from '../sim/lander'
import { delayTolerance } from '../sim/search'
import type { SiteData } from '../types'
import { PlanStrips } from './PlanStrips'
import { Button, cx, Segmented } from './ui'

const DELAYS = [
  { value: '24', label: '+1 día' },
  { value: '72', label: '+3 días' },
  { value: '168', label: '+1 semana' },
  { value: '336', label: '+2 semanas' },
] as const

const when = (data: SiteData, i: number) => { const d = sampleTime(data, i); return `${formatShortDate(d)}, ${formatTime(d)}` }

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
  const verdict = !c.original.survived
    ? { tone: 'text-caution', text: `El plan original ya no alcanza con la batería del ${moduleName}.`, detail: 'Prueba otra fecha o simula otro módulo.' }
    : c.stillWorks
      ? { tone: 'text-ok', text: `Sí. Con ${label} de atraso, la misión todavía funciona.`, detail: changeText(Math.round(c.delayed.viability) - Math.round(c.original.viability)) }
      : { tone: 'text-critical', text: `No. Con ${label} de atraso, la batería se agota.`, detail: 'El atraso deja al módulo demasiado tiempo sin Sol.' }

  return (
    <section aria-labelledby="delay-title" data-tour="delay" className="glass-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="delay-title" className="text-xl font-bold text-ink">¿Y si la misión se atrasa?</h2>
          <p className="mt-1 text-sm text-ink-muted">Elige un atraso: ámbar es Sol, azul es la Tierra a la vista y ▲ marca dónde se agota la batería.</p>
        </div>
        <Segmented label="Atraso del alunizaje" options={DELAYS} value={delay} onChange={setDelay} className="w-full sm:w-auto [&_button]:min-h-10 [&_button]:px-1.5 [&_button]:text-xs sm:[&_button]:px-3.5 sm:[&_button]:text-sm" />
      </div>

      <p className={cx('mt-5 text-lg font-bold', verdict.tone)} aria-live="polite">{verdict.text}</p>
      <p className="mt-1 text-sm text-ink-muted">{verdict.detail}</p>

      <div className="mt-5 grid gap-5">
        <PlanLine title="Tu plan" when={when(data, c.original.from)} o={c.original} vis={vis} data={data} moduleName={moduleName} />
        <PlanLine title={`Con ${label} de atraso`} when={when(data, c.delayed.from)} o={c.delayed} vis={vis} data={data} moduleName={moduleName}
          change={Math.round(c.delayed.viability) - Math.round(c.original.viability)} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {tolerance.survivesNow
            ? <>Tu plan tolera atrasos de hasta <strong className="text-ink">{formatDurationLong(tolerance.days * 24)}</strong>{tolerance.limitedByPeriod ? ' (hasta el final de los datos)' : ''}.</>
            : 'Tu plan no tiene margen de atraso con este módulo.'}
          {c.cutByPeriod && <span className="block text-xs text-ink-faint">El atraso se recortó: la misión tiene que terminar dentro de los datos de 2027.</span>}
        </p>
        <Button onClick={() => onApply(c.delayed.from)} disabled={c.appliedHours === 0}>Usar la fecha atrasada</Button>
      </div>
    </section>
  )
}

function changeText(diff: number): string {
  const d = Math.round(diff)
  if (d === 0) return 'La viabilidad no cambia.'
  return d > 0 ? `La viabilidad sube ${d} puntos.` : `La viabilidad baja ${-d} puntos.`
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
          {change !== undefined && change !== 0 && <span className={cx('ml-2 text-xs font-bold', change > 0 ? 'text-ok' : 'text-critical')}>{change > 0 ? `+${change}` : `−${-change}`}</span>}
          <span className="ml-3"><Battery o={o} /></span>
        </p>
      </div>
      <PlanStrips lit={vis.lit} contact={vis.contact} from={o.from} to={o.to} stepHours={data.stepHours} failedAt={o.failedAtIndex} />
      <span className="sr-only">Batería: {moduleName}.</span>
    </div>
  )
}

function Battery({ o }: { o: PlanOutcome }) {
  return o.survived
    ? <span className="text-xs font-bold text-ok">Batería: aguanta</span>
    : <span className="text-xs font-bold text-critical">Batería: se agota ▲</span>
}
