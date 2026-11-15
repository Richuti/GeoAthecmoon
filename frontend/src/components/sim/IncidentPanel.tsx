// Imprevisto en el alunizaje (SU7): una corrección de trayectoria atrasa la llegada justo lo suficiente para
// que la misión falle, y el usuario elige cómo salvarla. Cada salida está simulada (src/sim/incident.ts).
import { useMemo, useState } from 'react'
import { formatDateTime, formatDurationLong, sampleTime } from '../../lib/time'
import { planDelayIncident, type Incident, type IncidentOption } from '../../sim/incident'
import type { LanderConfig } from '../../sim/lander'
import { seriesOf } from '../../sim/search'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { Button, cx } from '../ui'

interface IncidentPanelProps {
  data: SiteData
  cfg: LanderConfig
  startIndex: number
  missionDays: number
  onTryStart: (startIndex: number) => void
  onTrySite: (siteId: string) => void
  onCfg: (cfg: LanderConfig) => void
}

export function IncidentPanel({ data, cfg, startIndex, missionDays, onTryStart, onTrySite, onCfg }: IncidentPanelProps) {
  const { state } = useAppState()
  const [active, setActive] = useState(false)
  const incident = useMemo<Incident | null>(() => {
    if (!active) return null
    const sites = Object.values(state.data).map((d) => ({ data: d, series: seriesOf(d) }))
    return planDelayIncident({ data, cfg, startIndex, missionDays, sites, series: sites.find((s) => s.data.site.id === data.site.id)?.series })
  }, [active, state.data, data, cfg, startIndex, missionDays])

  const apply = (o: IncidentOption) => {
    if (o.kind === 'site') onTrySite(o.siteId)
    if (o.kind === 'save') onCfg(o.cfg)
    onTryStart(o.startIndex)
  }

  if (!active) {
    return (
      <section aria-labelledby="incident-title" className="mt-8 border-t border-seam pt-6">
        <p className="instrument-label text-ink-faint">Escenario de imprevisto</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-2xl">
            <h2 id="incident-title" className="text-xl font-bold leading-tight text-ink">¿Y si algo sale mal en el viaje?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Simula una corrección de trayectoria que atrasa la llegada. Buscamos el atraso más corto que pone en riesgo tu misión y las salidas que la salvan.</p>
          </div>
          <Button className="min-h-12" onClick={() => setActive(true)}>Simular el imprevisto</Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="incident-title" className="mt-8 border-t border-seam pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="instrument-label text-ink-faint">Escenario de imprevisto · simulado</p>
        <button type="button" onClick={() => setActive(false)} className="min-h-10 text-sm text-ink-muted underline underline-offset-4 hover:text-ink">Quitar el imprevisto</button>
      </div>
      {!incident ? (
        <p role="status" className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Con este plan la misión ya no sobrevive, así que no hace falta un imprevisto: revisa las fechas y sitios que funcionan, más abajo.</p>
      ) : (
        <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <Consequence data={data} incident={incident} startIndex={startIndex} cfg={cfg} />
          <Options data={data} incident={incident} onApply={apply} />
        </div>
      )}
    </section>
  )
}

function Consequence({ data, incident, startIndex, cfg }: { data: SiteData; incident: Incident; startIndex: number; cfg: LanderConfig }) {
  const { delayed, cause } = incident
  const failDay = delayed.failedAtIndex === null ? null : Math.floor(((delayed.failedAtIndex - incident.delayedStart) * data.stepHours) / 24) + 1
  return (
    <div role="status" aria-live="polite">
      <h2 id="incident-title" className="text-xl font-bold leading-tight text-ink">Una corrección de trayectoria atrasa la llegada.</h2>
      <p className="mt-4 text-4xl font-bold tabular-nums text-ink">+{formatDurationLong(incident.delayHours)}</p>
      <dl className="mt-4 divide-y divide-seam text-sm">
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Llegada prevista</dt><dd className="text-right text-ink-muted line-through decoration-ink-faint">{formatDateTime(sampleTime(data, startIndex))}</dd></div>
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Nueva llegada</dt><dd className="text-right text-ink">{formatDateTime(sampleTime(data, incident.delayedStart))}</dd></div>
      </dl>
      {incident.breaksMission && !delayed.survived ? <>
        <p className="mt-5 text-base font-bold leading-snug text-critical">Con este atraso, la batería se agota el día {failDay} de la misión.</p>
        {cause && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{causeText(data, cause, cfg)}</p>}
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">Sin el atraso, tu plan sobrevivía. Es la pregunta del reto: si la misión se atrasa, ¿todavía funciona?</p>
      </> : (
        <p className="mt-5 text-base font-bold leading-snug text-ink">Aun con este atraso, tu misión sobrevive: en los datos no hay un atraso que la haga fallar.</p>
      )}
    </div>
  )
}

const COMPASS_NAME: Record<string, string> = { N: 'norte', NE: 'noreste', E: 'este', SE: 'sureste', S: 'sur', SO: 'suroeste', O: 'oeste', NO: 'noroeste' }

/** Batería mínima: con un decimal cerca del 20 %, para que "sobrevive con 20 %" no parezca la falla. */
const socLabel = (pct: number) => (pct < 21 ? pct.toFixed(1) : Math.round(pct).toString())

function causeText(data: SiteData, cause: NonNullable<Incident['cause']>, cfg: LanderConfig): string {
  const toward = COMPASS_NAME[cause.compass] ?? cause.compass
  const shade = `siguen ${formatDurationLong(cause.shadowHours)} de sombra`
  const battery = `La batería de ${cfg.batteryKWh} kWh no alcanza para cruzarlas.`
  if (cause.sunsetIndex === null) return `El módulo llega a oscuras y ${shade}. ${battery}`
  const when = formatDateTime(sampleTime(data, cause.sunsetIndex))
  const ridge = cause.ridgeElevationDeg > 0 && cause.ridgeKm !== null
    ? `se oculta tras el relieve, a ${cause.ridgeKm.toFixed(1)} km hacia el ${toward}${cause.ridgeHeightM !== null && cause.ridgeHeightM > 0 ? ` (${cause.ridgeHeightM} m más alto que el sitio)` : ''}`
    : `se pone por el ${toward}`
  return `El ${when}, el Sol ${ridge} y ${shade}. ${battery}`
}

const OPTION_TITLE: Record<IncidentOption['kind'], string> = {
  wait: 'Esperar en órbita',
  site: 'Cambiar de sitio',
  save: 'Ahorrar energía',
}

function optionDetail(data: SiteData, o: IncidentOption): string {
  if (o.kind === 'wait') return `Esperar ${formatDurationLong((o.waitDays ?? 0) * 24)} y alunizar el ${formatDateTime(sampleTime(data, o.startIndex))}.`
  if (o.kind === 'site') return `Alunizar en ${o.siteName} con la misma llegada atrasada.`
  return `Mismo sitio y misma llegada, con el ${Math.round((o.instrumentShare ?? 1) * 100)} % de los instrumentos: menos consumo y menos datos.`
}

function Options({ data, incident, onApply }: { data: SiteData; incident: Incident; onApply: (o: IncidentOption) => void }) {
  if (!incident.breaksMission || incident.delayed.survived) return null
  return (
    <div>
      <h3 className="text-base font-bold text-ink">¿Qué haces?</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">Cada salida está simulada con los mismos datos de luz y comunicación.</p>
      {incident.options.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">Ninguna salida sencilla salva la misión con este módulo. Prueba más batería o más panel en «Modificar mi plan».</p>
      ) : (
        <ol className="mt-4 divide-y divide-seam border-y border-seam">
          {incident.options.map((o) => (
            <li key={o.kind} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-sm font-bold text-ink">{OPTION_TITLE[o.kind]}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{optionDetail(data, o)}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  <span className="text-ok">Sobrevive</span>
                  <span aria-hidden> · </span>batería mínima {socLabel(o.summary.minSocPct)} %
                  <span aria-hidden> · </span><span className="text-earth">{(o.summary.dataSentMb / 1000).toFixed(1)} Gb enviados</span> ({Math.round(o.summary.dataSentPct)} % de lo medido)
                </p>
              </div>
              <Button size="sm" className={cx('min-h-10 shrink-0')} onClick={() => onApply(o)}>Aplicar</Button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">El atraso es un escenario. El Sol, la Tierra y el relieve son los datos reales de JPL Horizons y LOLA.</p>
    </div>
  )
}
