// Imprevisto en el alunizaje (SU7): una corrección de trayectoria atrasa la llegada justo lo suficiente para
// que la misión falle, y el usuario elige cómo salvarla. Cada salida está simulada (src/sim/incident.ts).
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { formatDateTime, formatDurationLong, sampleTime } from '../../lib/time'
import { planDelayIncident, type Incident, type IncidentOption } from '../../sim/incident'
import type { LanderConfig } from '../../sim/lander'
import { seriesOf } from '../../sim/search'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { Button } from '../ui'
import type { SimResult } from '../../sim/simulate'
import { IncidentReplay } from './IncidentReplay'
import { RescueCopilot } from './RescueCopilot'
import type { CopilotCase } from '../../sim/copilot'
import './incident.css'

interface IncidentPanelProps {
  data: SiteData
  cfg: LanderConfig
  startIndex: number
  missionDays: number
  onTryStart: (startIndex: number) => void
  onTrySite: (siteId: string) => void
  onCfg: (cfg: LanderConfig) => void
  originalResult: SimResult
  children: ReactNode
}

export function IncidentPanel({ data, cfg, startIndex, missionDays, onTryStart, onTrySite, onCfg, originalResult, children }: IncidentPanelProps) {
  const { state, actions } = useAppState()
  const [active, setActive] = useState(false)
  const [pending, startTransition] = useTransition()
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const sites = useMemo(() => (active ? Object.values(state.data).map((d) => ({ data: d, series: seriesOf(d) })) : []), [active, state.data])
  const incident = useMemo<Incident | null>(() => {
    if (!active) return null
    return planDelayIncident({ data, cfg, startIndex, missionDays, sites, series: sites.find((s) => s.data.site.id === data.site.id)?.series })
  }, [active, sites, data, cfg, startIndex, missionDays])
  const copilotCase = useMemo<CopilotCase | null>(() => (incident ? { data, cfg, missionDays, incident, sites } : null), [incident, data, cfg, missionDays, sites])
  useEffect(() => {
    if (!active) return
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active])

  const reset = () => {
    setActive(false)
    requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus({ preventScroll: true }))
  }

  const apply = (o: IncidentOption) => applyPlan(o.siteId, o.cfg, o.startIndex)
  /** Aplica un plan al original: sitio, módulo y fecha. Se evalúa sin repetir el viaje. */
  const applyPlan = (siteId: string, next: LanderConfig, start: number) => {
    setActive(false)
    if (siteId !== data.site.id) onTrySite(siteId)
    if (JSON.stringify(next) !== JSON.stringify(cfg)) onCfg(next)
    onTryStart(start)
    requestAnimationFrame(() => {
      const title = document.getElementById('mission-step-title')
      title?.focus({ preventScroll: true })
      title?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }

  if (!active) {
    return (
      <>
        <section aria-labelledby="incident-title" className="incident-invite glass-surface mb-7 flex flex-wrap items-center justify-between gap-6 p-5 sm:p-7">
          <div className="max-w-2xl">
            <p className="text-xs text-ink-muted">Pon tu misión a prueba · Escenario simulado</p>
            <h2 id="incident-title" className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-3xl">¿Un atraso cambia el final?</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">Prueba una llegada más tarde. Verás qué le ocurre a la nave cuando cambian la luz y la comunicación, y qué opciones pueden salvarla.</p>
            <p className="mt-2 text-xs text-ink-muted">Puedes volver al plan original en cualquier momento.</p>
          </div>
          <div ref={trigger}><Button variant="primary" size="lg" className="min-h-12" disabled={pending}
            onClick={() => { actions.setPlaying(false); startTransition(() => setActive(true)) }}>{pending ? 'Calculando escenario…' : 'Simular el imprevisto'}</Button></div>
        </section>
        {children}
      </>
    )
  }

  return (
    <section aria-labelledby="incident-title" className="incident-experience">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">Escenario simulado · Tu plan original está conservado</p>
          <h2 ref={heading} tabIndex={-1} id="incident-title" className="mt-2 scroll-mt-6 text-3xl font-bold leading-tight text-ink sm:text-4xl">{incident ? 'La llegada se retrasa.' : 'Revisemos este plan.'}</h2>
          {incident && <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">Una corrección de trayectoria retrasa la llegada. Comprueba cómo afecta la nueva fecha al mismo sitio y módulo.</p>}
        </div>
        <Button size="lg" onClick={reset}>Volver al plan original</Button>
      </div>
      {!incident ? (
        <>
          <p role="status" className="glass-surface mb-6 max-w-3xl p-5 text-base leading-relaxed text-ink">{originalResult.summary.survived
            ? 'No queda espacio en los datos de 2027 para probar un atraso con toda la duración de tu misión. Elige una fecha anterior para explorar este escenario.'
            : 'Este plan ya falla sin ningún atraso. Más abajo, la IA busca cómo salvarlo con el simulador.'}</p>
          {children}
        </>
      ) : (
        <>
          <div className="incident-dates glass-surface mb-6 grid gap-5 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-7">
            <div><p className="text-xs text-ink-muted">Tu llegada original · Sobrevive</p><p className="mt-2 text-lg font-bold text-ink">{formatDateTime(sampleTime(data, startIndex))}</p></div>
            <p className="text-xl font-bold tabular-nums text-ink">+{formatDurationLong(incident.delayHours)}<span aria-hidden className="ml-3 hidden sm:inline">→</span></p>
            <div><p className="text-xs text-ink-muted">Llegada del escenario</p><p className="mt-2 text-lg font-bold text-ink">{formatDateTime(sampleTime(data, incident.delayedStart))}</p></div>
          </div>
          <IncidentReplay key={`${data.site.id}:${incident.delayedStart}`} data={data} cfg={cfg} incident={incident} missionDays={missionDays}
            explanation={incident.cause ? causeText(data, incident.cause, cfg) : null} />
          <Options data={data} incident={incident} onApply={apply} />
          {copilotCase && incident.breaksMission && !incident.delayed.survived && <RescueCopilot copilotCase={copilotCase} onApply={applyPlan} />}
        </>
      )}
    </section>
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
    <section aria-label="Opciones para salvar la misión" className="mt-10 sm:mt-12">
      <h3 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">Elige cómo salvar la misión.</h3>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">En la simulación, estas alternativas completan la misión. Compara qué cambia y aplica la que prefieras a tu plan.</p>
      {incident.options.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">Ninguna salida sencilla salva la misión con este módulo. Prueba más batería o más panel en «Modificar mi plan».</p>
      ) : (
        <ol className="incident-options mt-6 divide-y divide-seam border-y border-seam">
          {incident.options.map((o) => (
            <li key={o.kind} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-xl font-bold text-ink">{OPTION_TITLE[o.kind]}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{optionDetail(data, o)}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  <span className="text-ok">Sobrevive</span>
                  <span aria-hidden> · </span>batería mínima {socLabel(o.summary.minSocPct)} %
                  <span aria-hidden> · </span><span className="text-earth">{(o.summary.dataSentMb / 1000).toFixed(1)} Gb enviados</span> ({Math.round(o.summary.dataSentPct)} % de lo medido)
                </p>
              </div>
              <Button size="lg" className="min-h-12 shrink-0" onClick={() => onApply(o)}>{o.kind === 'wait' ? 'Aplicar nueva fecha' : o.kind === 'site' ? 'Aplicar este sitio' : 'Aplicar ahorro'}</Button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-muted">Se calcula la misión en superficie con JPL Horizons y LOLA. La espera en órbita cambia la fecha de alunizaje; no se calculan sus maniobras ni su consumo.</p>
    </section>
  )
}
