// Resultado de la misión (SU3): veredicto, cifras, tolerancia a atrasos, fechas que funcionan y
// recomendaciones con "Probar esta opción".

import type { KeyboardEvent, MouseEvent } from 'react'
import { dayNumber, formatDateTime, formatDurationLong, formatShortDate, sampleTime } from '../../lib/time'
import type { DelayTolerance, SiteOutcome, StartResult } from '../../sim/search'
import type { SimResult } from '../../sim/simulate'
import type { SiteData } from '../../types'
import { Button, cx, InfoTip, Panel, Stat, StatGrid } from '../ui'

export function MissionResult({
  data,
  result,
  tolerance,
  scan,
  best,
  alternatives,
  onTryStart,
  onTrySite,
}: {
  data: SiteData
  result: SimResult
  tolerance: DelayTolerance
  scan: StartResult[]
  best: StartResult | null
  alternatives: SiteOutcome[]
  onTryStart: (startIndex: number) => void
  onTrySite: (siteId: string) => void
}) {
  const s = result.summary
  const failDay = s.failedAtIndex !== null ? dayNumber(data, s.failedAtIndex, result.from) : null
  const failEvent = result.events.find((e) => e.type === 'failure')
  const okCount = scan.filter((r) => r.survived).length
  const betterStart = best && best.startIndex !== result.from && (!s.survived || best.marginKWh > s.energyMarginKWh + 0.05) ? best : null
  const altBest = alternatives[0]
  const betterSite = altBest && altBest.survived && (!s.survived || altBest.minSocPct > s.minSocPct + 5) ? altBest : null

  return (
    <Panel label="Resultado de la misión">
      <p className="mb-3 text-xs leading-relaxed text-ink-muted">
        {formatDateTime(sampleTime(data, result.from))} · {result.plan.missionDays} días
      </p>
      <p role="status" className={cx('font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl', s.survived ? 'text-ok' : 'text-critical')}>
        {s.survived ? 'Misión cumplida' : `Falló el día ${failDay}`}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {s.survived
          ? s.minSocPct >= 99.5
            ? `La batería se mantuvo llena los ${result.plan.missionDays} días en ${data.site.name}.`
            : `La batería nunca bajó del ${Math.round(s.minSocPct)} % en ${result.plan.missionDays} días en ${data.site.name}.`
          : `${failEvent?.message ?? 'La batería llegó a su mínimo.'} Con este módulo, la energía del Sol no alcanzó para pasar las horas de sombra.`}
      </p>

      <StatGrid className="mt-5">
        <Stat label="Datos enviados" value={`${Math.round(s.dataSentPct)}`} unit="%" tone={s.dataSentPct >= 80 ? 'earth' : 'neutral'}
          detail={`${Math.round(s.dataSentMb).toLocaleString('es')} de ${Math.round(s.dataGeneratedMb).toLocaleString('es')} Mb`}
          hint="Parte de los datos generados que llegaron a la Tierra. Solo se envía cuando la Tierra está a la vista." />
        <Stat label="Batería mínima" value={`${Math.round(s.minSocPct)}`} unit="%"
          tone={s.minSocPct <= 20.5 ? 'critical' : s.minSocPct < 40 ? 'caution' : 'ok'} detail="El 20 % es la falla" />
        <Stat label="En supervivencia" value={s.hoursInSurvival > 0 ? formatDurationLong(s.hoursInSurvival) : 'Nunca'} detail="Instrumentos apagados" />
        <Stat label="Margen de energía" value={s.survived ? s.energyMarginKWh.toFixed(1) : '0'} unit="kWh"
          detail="En el peor momento" />
      </StatGrid>

      <div className="mt-5 border-t border-seam pt-4">
        <p className="flex items-center gap-1.5 instrument-label">
          ¿Y si se atrasa?
          <InfoTip label="Tolerancia a atrasos" align="end">
            Se vuelve a simular la misión empezando 6 h, 12 h, 18 h… más tarde, hasta la primera fecha en que falla.
          </InfoTip>
        </p>
        <p className="mt-2 text-lg leading-snug text-ink">{toleranceText(tolerance)}</p>
      </div>

      <div className="mt-5 border-t border-seam pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="instrument-label">Fechas de alunizaje que funcionan</p>
          <span className="font-mono text-xs text-ink-muted">{okCount} de {scan.length}</span>
        </div>
        <StartsBar data={data} scan={scan} current={result.from} best={best?.startIndex ?? null} onPick={onTryStart} />
        <p className="mt-1.5 text-[0.6875rem] text-ink-faint">Cada franja es un inicio posible, cada 6 h. Haz clic para probarlo.</p>
      </div>

      <div className="mt-5 border-t border-seam pt-4">
        <p className="instrument-label">Recomendación</p>
        {!betterStart && !betterSite ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {s.survived ? 'Esta fecha y este sitio ya están entre las mejores opciones para este módulo.' : 'No encontramos una opción viable entre las fechas y los sitios evaluados. Prueba más batería o más panel.'}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-4">
            {betterStart && (
              <li>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Aterrizando el <span className="text-ink">{formatDateTime(sampleTime(data, betterStart.startIndex))}</span>, la misión
                  sobrevive con <span className="font-mono text-ink">{betterStart.marginKWh.toFixed(1)} kWh</span> de margen.
                </p>
                <Button size="sm" className="mt-2" aria-label={`Probar alunizaje el ${formatDateTime(sampleTime(data, betterStart.startIndex))}`} onClick={() => onTryStart(betterStart.startIndex)}>
                  Probar esta opción
                </Button>
              </li>
            )}
            {betterSite && (
              <li>
                <p className="text-sm leading-relaxed text-ink-muted">
                  En <span className="text-ink">{betterSite.name}</span>, el mismo módulo en la misma fecha sobrevive (batería mínima{' '}
                  <span className="font-mono text-ink">{Math.round(betterSite.minSocPct)} %</span>).
                </p>
                <Button size="sm" className="mt-2" aria-label={`Probar misión en ${betterSite.name}`} onClick={() => onTrySite(betterSite.siteId)}>
                  Probar esta opción
                </Button>
              </li>
            )}
          </ul>
        )}
        <SitesTable alternatives={alternatives} onTrySite={onTrySite} />
      </div>
      <p className="mt-5 border-t border-seam pt-3 text-xs leading-relaxed text-ink-faint">
        Presets ilustrativos. Se supone que el panel sigue al Sol y que hay una estación DSN disponible cuando se ve la Tierra.
      </p>
    </Panel>
  )
}

function toleranceText(t: DelayTolerance): string {
  if (!t.survivesNow) return 'Con esta fecha la misión no sobrevive. Mira abajo las fechas que funcionan.'
  if (t.days === 0 && t.limitedByPeriod) return 'No quedan datos suficientes para comprobar un atraso de 6 horas.'
  if (t.days === 0) return 'No tolera atrasos: si el alunizaje se atrasa 6 horas, la misión falla.'
  const span = formatDurationLong(t.days * 24)
  return t.limitedByPeriod ? `Tolera atrasos de al menos ${span} (hasta donde llegan los datos).` : `Tolera atrasos de hasta ${span}.`
}

function StartsBar({
  data,
  scan,
  current,
  best,
  onPick,
}: {
  data: SiteData
  scan: StartResult[]
  current: number
  best: number | null
  onPick: (startIndex: number) => void
}) {
  const n = data.sun.el.length
  const step = scan.length > 1 ? scan[1].startIndex - scan[0].startIndex : 1
  const pick = (e: MouseEvent<HTMLDivElement>) => {
    if (!scan.length) return
    const r = e.currentTarget.getBoundingClientRect()
    const target = ((e.clientX - r.left) / r.width) * n
    const nearest = scan.reduce((a, b) => (Math.abs(b.startIndex - target) < Math.abs(a.startIndex - target) ? b : a))
    onPick(nearest.startIndex)
  }
  const selected = scan.reduce((a, b, j) => Math.abs(b.startIndex - current) < Math.abs(scan[a].startIndex - current) ? j : a, 0)
  const keyboardPick = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!scan.length) return
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? scan.length - 1
      : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? selected + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? selected - 1 : null
    if (j === null) return
    e.preventDefault()
    onPick(scan[Math.max(0, Math.min(scan.length - 1, j))].startIndex)
  }
  const pct = (i: number) => `${(i / n) * 100}%`
  return (
    <div className="mt-2">
      <div className="relative h-8 cursor-pointer bg-hull-raised" onClick={pick} onKeyDown={keyboardPick} role="slider" tabIndex={scan.length ? 0 : -1}
        aria-label="Probar fechas de alunizaje" aria-valuemin={0} aria-valuemax={Math.max(0, scan.length - 1)} aria-valuenow={selected}
        aria-valuetext={scan[selected] ? `${formatDateTime(sampleTime(data, scan[selected].startIndex))}: ${scan[selected].survived ? 'sobrevive' : 'falla'}` : 'Sin fechas disponibles'}>
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" aria-hidden>
          {scan.map((r) => (
            <rect key={r.startIndex} x={r.startIndex} y={0} width={step} height={1} className={r.survived ? 'fill-ok/70' : 'fill-critical/35'} />
          ))}
        </svg>
        {best !== null && <span className="pointer-events-none absolute -top-1 bottom-0 w-px bg-ok" style={{ left: pct(best) }} title="Mejor fecha" />}
        <span className="pointer-events-none absolute -inset-y-1 w-0.5 bg-ink" style={{ left: pct(current) }} />
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span><span aria-hidden className="mr-1.5 inline-block size-2 bg-ok" />Sobrevive</span>
        <span><span aria-hidden className="mr-1.5 inline-block size-2 bg-critical" />Falla</span>
        <span>Sin franja: la misión no cabe en los datos.</span>
      </p>
      <div className="relative mt-1 h-4">
        {[0, Math.floor(n / 2), n - 1].map((i, k) => (
          <span key={i} className={cx('absolute whitespace-nowrap font-mono text-[0.625rem] text-ink-faint', k === 1 && '-translate-x-1/2', k === 2 && '-translate-x-full')} style={{ left: pct(i) }}>
            {formatShortDate(sampleTime(data, i))}
          </span>
        ))}
      </div>
    </div>
  )
}

function SitesTable({ alternatives, onTrySite }: { alternatives: SiteOutcome[]; onTrySite: (id: string) => void }) {
  if (alternatives.length === 0) return null
  return (
    <details className="mt-5">
      <summary className="cursor-pointer py-2 text-sm text-ink-muted hover:text-ink">Comparar con los otros sitios</summary>
      <p className="mt-2 text-xs text-ink-faint">El mismo módulo y la misma fecha:</p>
      <ul className="mt-2 flex flex-col">
        {alternatives.map((a) => (
          <li key={a.siteId}>
            <button type="button" onClick={() => onTrySite(a.siteId)}
              className="flex w-full items-baseline justify-between gap-3 px-2 py-1.5 text-left text-sm hover:bg-hull-raised">
              <span className="truncate text-ink-muted">{a.name}</span>
              <span className={cx('shrink-0 font-mono text-xs', a.survived ? 'text-ok' : 'text-critical')}>
                {a.survived ? `Sobrevive · ${Math.round(a.minSocPct)} %` : 'Falla'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
