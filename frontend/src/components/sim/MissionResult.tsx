import type { KeyboardEvent, MouseEvent } from 'react'
import { dayNumber, formatDateTime, formatDurationLong, formatShortDate, sampleTime } from '../../lib/time'
import type { DelayTolerance, StartResult, ViableStart } from '../../sim/search'
import type { SimResult } from '../../sim/simulate'
import type { SiteData } from '../../types'
import { VERDICT_LABEL, type ViabilityResult } from '../../lib/viability'
import { Button, cx, Disclosure } from '../ui'

export interface MissionResultProps {
  data: SiteData
  result: SimResult
  tolerance: DelayTolerance
  scan: StartResult[]
  best: ViableStart | null
  onTryStart: (startIndex: number) => void
  onTrySite: (siteId: string) => void
  assessment: ViabilityResult
  comparisons: Array<{ siteId: string; name: string; score: number; lightPct: number; contactPct: number; slopeDeg: number; survived?: boolean }>
}

const percentLabel = (value: number) => (value > 0 && value < 1) || (value > 99 && value < 100) ? value.toFixed(1) : Math.round(value).toString()

/** El resultado acompaña al terreno; la evidencia continúa debajo de la reproducción. */
export function MissionResult({ data, result, tolerance, assessment }: MissionResultProps) {
  const s = result.summary
  const failDay = s.failedAtIndex === null ? null : dayNumber(data, s.failedAtIndex, result.from)
  const hours = (result.to - result.from) * data.stepHours
  const slopeWarning = assessment.warnings.find(w => w.includes('pendiente'))
  return (
    <section aria-label="Resultado de la misión" className="order-first flex h-full flex-col px-1 py-2 lg:order-none lg:px-6 lg:py-5">
      <h2 className="text-sm font-bold text-ink-muted">Viabilidad de la misión</h2>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="font-display text-6xl font-extrabold leading-none text-ink">{Math.round(assessment.score)}<span className="ml-1 text-3xl">%</span></p>
        <p className="text-sm text-ink-muted">{VERDICT_LABEL[assessment.verdict]}</p>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Tiempo con luz solar</dt><dd className="font-bold tabular-nums text-sun">{percentLabel(assessment.factors.light.score)} % <span className="text-xs font-normal">· {Math.round(assessment.factors.light.score * hours / 100)} h</span></dd></div>
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Contacto con la Tierra</dt><dd className="font-bold tabular-nums text-earth">{percentLabel(assessment.factors.contact.score)} % <span className="text-xs font-normal">· {Math.round(assessment.factors.contact.score * hours / 100)} h</span></dd></div>
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Pendiente máx. en 100 m</dt><dd className="tabular-nums text-ink">{data.slope.max100mDeg.toFixed(1)}°</dd></div>
      </dl>
      {slopeWarning && <p className="mt-3 text-xs leading-relaxed text-caution">{slopeWarning}</p>}
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">Índice que combina luz, contacto y pendiente regional; no es una probabilidad de éxito.</p>
      <p role="status" className={cx('mt-5 text-base font-bold leading-tight', s.survived ? 'text-ink' : 'text-critical')}>
        {s.survived ? `Sobrevive los ${result.plan.missionDays} días.` : `Sin energía el día ${failDay}.`}
      </p>
      {assessment.cappedByMission && <p className="mt-2 text-xs leading-relaxed text-ink-muted">Con este módulo, la energía insuficiente limita la viabilidad al 40 %.</p>}
      <Disclosure className="mt-5" title="Balance y tolerancia a atrasos" description="Batería, datos enviados y margen si cambia el alunizaje.">
        <dl className="mt-3 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Batería más baja</dt><dd className={cx('font-bold tabular-nums', s.survived ? 'text-sun' : 'text-critical')}>{Math.round(s.minSocPct)} %</dd></div>
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Datos que llegan a la Tierra</dt><dd className="font-bold tabular-nums text-earth">{Math.round(s.dataSentPct)} %</dd></div>
        <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-muted">Instrumentos apagados</dt><dd className="tabular-nums text-ink">{s.hoursInSurvival ? formatDurationLong(s.hoursInSurvival) : 'Nunca'}</dd></div>
      </dl>
      <div className="mt-4">
        <h3 className="text-sm font-bold text-ink">¿Y si el alunizaje se atrasa?</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{toleranceText(tolerance)}</p>
      </div>
      </Disclosure>
      <p className="mt-auto pt-5 text-xs leading-relaxed text-ink-faint">Alunizaje: {formatDateTime(sampleTime(data, result.from))}. Resultado calculado con luz, comunicación y el módulo elegido.</p>
    </section>
  )
}

export function MissionOptions({ data, result, scan, best, onTryStart, onTrySite, assessment, comparisons }: MissionResultProps) {
  const s = result.summary
  const betterStart = best && best.startIndex !== result.from && (!s.survived || best.viability >= assessment.score + 3) ? best : null
  const betterSite = comparisons.find(site => site.siteId !== data.site.id && site.survived && site.score >= assessment.score + 3)
  return (
    <div>
    <div className="grid gap-10 py-6 lg:grid-cols-2">
      <section aria-label="Fechas de alunizaje que funcionan">
        <h2 className="text-base font-bold text-ink">Cuándo puede aterrizar</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">El mismo módulo, en el mismo sitio, empezando en otra fecha.</p>
        <StartsBar data={data} scan={scan} current={result.from} onPick={onTryStart} />
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">Cada franja prueba un inicio cada 6 horas. Haz clic o usa las flechas para simularlo.</p>
      </section>
      <section aria-label="Alternativas para la misión">
        <h2 className="text-base font-bold text-ink">La siguiente opción</h2>
        {betterStart ? <>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">Aterrizando el <span className="text-ink">{formatDateTime(sampleTime(data, betterStart.startIndex))}</span>, la viabilidad es {Math.round(betterStart.viability)} % y el módulo sobrevive con {betterStart.marginKWh.toFixed(1)} kWh de margen.</p>
          <Button size="sm" className="mt-3" onClick={() => onTryStart(betterStart.startIndex)}>Probar esta fecha</Button>
        </> : <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.survived ? 'Esta fecha ya está entre las mejores para el módulo elegido.' : 'No encontramos una fecha posterior viable para este módulo. Prueba más batería, más panel u otro sitio.'}</p>}
        {betterSite && <p className="mt-4 text-sm leading-relaxed text-ink-muted">En <button type="button" className="text-ink underline underline-offset-4 hover:text-earth" onClick={() => onTrySite(betterSite.siteId)}>{betterSite.name}</button>, la viabilidad sube a {Math.round(betterSite.score)} % y el módulo sobrevive en la misma fecha.</p>}
      </section>
    </div>
    <section aria-label="Comparar sitios de alunizaje" className="py-6">
      <h2 className="text-base font-bold text-ink">La misma fecha, en los otros sitios</h2>
      <p className="mt-2 text-sm text-ink-muted">Compara luz, contacto y terreno para la misma duración y el mismo módulo.</p>
      <ul className="mt-4 grid gap-x-10 md:grid-cols-2">
        {comparisons.map(site => <li key={site.siteId}>
          <button type="button" aria-pressed={site.siteId === data.site.id} onClick={() => onTrySite(site.siteId)}
            className={cx('flex min-h-24 w-full items-center justify-between gap-5 px-3 py-4 text-left hover:bg-hull', site.siteId === data.site.id && 'bg-hull')}>
            <span className="min-w-0"><span className="block text-sm font-bold text-ink">{site.name}{site.siteId === data.site.id && <span className="ml-2 text-xs font-normal text-ink-muted">Actual</span>}</span>
              <span className="mt-2 block text-xs leading-relaxed text-ink-muted">Luz {percentLabel(site.lightPct)} % · Contacto {percentLabel(site.contactPct)} % · Pendiente {site.slopeDeg.toFixed(1)}°</span>
              {site.survived !== undefined && <span className={cx('mt-1 block text-xs', site.survived ? 'text-ink-muted' : 'text-critical')}>Módulo: {site.survived ? 'sobrevive' : 'falla'}</span>}
            </span>
            <span className="shrink-0 text-xl font-bold tabular-nums text-ink">{Math.round(site.score)}<span className="ml-0.5 text-xs font-normal text-ink-muted">%</span></span>
          </button>
        </li>)}
      </ul>
    </section>
    </div>
  )
}

function toleranceText(t: DelayTolerance): string {
  if (!t.survivesNow) return 'Con esta fecha no sobrevive. Prueba una de las fechas que funcionan, debajo de la batería.'
  if (t.days === 0 && t.limitedByPeriod) return 'No quedan datos suficientes para comprobar un atraso de 6 horas.'
  if (t.days === 0) return 'Un atraso de 6 horas ya hace fallar la misión.'
  const span = formatDurationLong(t.days * 24)
  return t.limitedByPeriod ? `Tolera al menos ${span} de atraso, hasta donde llegan los datos.` : `Tolera hasta ${span} de atraso. Después, la batería no alcanza.`
}

function StartsBar({ data, scan, current, onPick }: { data: SiteData; scan: StartResult[]; current: number; onPick: (index: number) => void }) {
  const n = data.sun.el.length
  const step = scan.length > 1 ? scan[1].startIndex - scan[0].startIndex : 1
  const selected = scan.reduce((a, b, j) => Math.abs(b.startIndex - current) < Math.abs(scan[a].startIndex - current) ? j : a, 0)
  const pick = (e: MouseEvent<HTMLDivElement>) => {
    if (!scan.length) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const target = ((e.clientX - bounds.left) / bounds.width) * n
    const nearest = scan.reduce((a, b) => Math.abs(b.startIndex - target) < Math.abs(a.startIndex - target) ? b : a)
    onPick(nearest.startIndex)
  }
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!scan.length) return
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? scan.length - 1
      : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? selected + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? selected - 1 : null
    if (next === null) return
    e.preventDefault()
    onPick(scan[Math.max(0, Math.min(scan.length - 1, next))].startIndex)
  }
  return <div className="mt-5">
    <div role="slider" tabIndex={scan.length ? 0 : -1} aria-label="Probar fechas de alunizaje" aria-valuemin={0} aria-valuemax={Math.max(0, scan.length - 1)} aria-valuenow={selected}
      aria-valuetext={scan[selected] ? `${formatDateTime(sampleTime(data, scan[selected].startIndex))}: ${scan[selected].survived ? 'sobrevive' : 'falla'}` : 'Sin fechas disponibles'}
      onClick={pick} onKeyDown={keyboard} className="relative h-9 cursor-pointer bg-hull-raised">
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" aria-hidden>{scan.map(r => <rect key={r.startIndex} x={r.startIndex} y={0} width={step} height={1} className={r.survived ? 'fill-ok/60' : 'fill-critical/30'} />)}</svg>
      <span className="pointer-events-none absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${current / n * 100}%` }} />
    </div>
    <div className="mt-2 flex justify-between text-xs text-ink-faint"><span>{formatShortDate(sampleTime(data, 0))}</span><span>{formatShortDate(sampleTime(data, n - 1))}</span></div>
    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted"><span><span aria-hidden className="mr-2 inline-block h-2 w-3 bg-ok/60" />Sobrevive</span><span><span aria-hidden className="mr-2 inline-block h-2 w-3 bg-critical/60" />Falla</span><span>Sin franja: faltan datos para completar la misión.</span></p>
  </div>
}
