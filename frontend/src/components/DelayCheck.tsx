// «¿Y si la misión se atrasa?»: el plan original junto al mismo plan con un atraso que elige el usuario.
// Sin repetir el viaje ni salir del resultado. Luz, contacto y batería salen de los datos y del módulo.
import { useMemo, useState } from 'react'
import { formatDurationLong, formatShortDate, formatTime, sampleTime } from '../lib/time'
import type { Visibility } from '../lib/visibility'
import { compareDelay, type PlanOutcome } from '../sim/delay'
import type { LanderConfig } from '../sim/lander'
import { delayTolerance } from '../sim/search'
import type { SiteData } from '../types'
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
          <p className="mt-1 text-sm text-ink-muted">Elige un atraso y compáralo con tu plan.</p>
        </div>
        <Segmented label="Atraso del alunizaje" options={DELAYS} value={delay} onChange={setDelay} className="max-w-full [&_button]:min-h-10" />
      </div>

      <p className={cx('mt-5 text-lg font-bold', verdict.tone)} aria-live="polite">{verdict.text}</p>
      <p className="mt-1 text-sm text-ink-muted">{verdict.detail}</p>

      <table className="delay-table mt-5 w-full text-sm">
        <caption className="sr-only">Plan original comparado con el plan atrasado</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[34%]"><span className="sr-only">Dato</span></th>
            <th scope="col">Tu plan<span className="block font-normal text-ink-faint">{when(data, c.original.from)}</span></th>
            <th scope="col">Con atraso<span className="block font-normal text-ink-faint">{when(data, c.delayed.from)}</span></th>
          </tr>
        </thead>
        <tbody>
          <Row label="Viabilidad" a={c.original.viability} b={c.delayed.viability} unit="/100" />
          <Row label="Luz solar" tone="text-sun" a={c.original.lightPct} b={c.delayed.lightPct} unit=" %" />
          <Row label="Tierra visible" tone="text-earth" a={c.original.contactPct} b={c.delayed.contactPct} unit=" %" />
          <tr>
            <th scope="row">Batería<span className="block font-normal text-ink-faint">{moduleName}</span></th>
            <td><Battery o={c.original} /></td>
            <td><Battery o={c.delayed} /></td>
          </tr>
        </tbody>
      </table>

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

/** La diferencia se calcula con los valores ya redondeados, para que cuadre con lo que se lee. */
function Row({ label, a, b, unit, tone }: { label: string; a: number; b: number; unit: string; tone?: string }) {
  const d = Math.round(b) - Math.round(a)
  return (
    <tr>
      <th scope="row" className={tone}>{label}</th>
      <td className="tabular-nums">{Math.round(a)}{unit}</td>
      <td className="tabular-nums">
        {Math.round(b)}{unit}
        {d !== 0 && <span className={cx('ml-2 text-xs', d > 0 ? 'text-ok' : 'text-critical')}>{d > 0 ? `+${d}` : `−${-d}`}</span>}
      </td>
    </tr>
  )
}

function Battery({ o }: { o: PlanOutcome }) {
  return o.survived
    ? <span className="text-ok">Aguanta<span className="block text-xs text-ink-faint">mínimo {Math.round(o.minSocPct)} %</span></span>
    : <span className="text-critical">Se agota<span className="block text-xs text-ink-faint">llega al 20 %</span></span>
}
