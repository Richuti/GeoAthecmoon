// Un espacio de trabajo lunar: el plan arriba, el terreno en el centro y la evidencia debajo.
// Conserva la tipografía y los colores de vuelo; evita marcos repetidos y columnas con scroll independiente.
import { useMemo, useRef, useState, type ComponentProps } from 'react'
import { formatDate, formatDateTime, sampleTime } from '../../lib/time'
import { PRESETS, type LanderConfig } from '../../sim/lander'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { Button, cx, Disclosure, Select, SiMark } from '../ui'
import { ViewerPanel } from '../ViewerPanel'
import { MissionSetup } from './MissionSetup'
import { MissionOptions, MissionResult, type MissionResultProps } from './MissionResult'
import { MissionTrace } from './MissionTrace'
import { EarthMoonJourney } from './EarthMoonJourney'
import { IncidentPanel } from './IncidentPanel'
import { PlanRescue } from './PlanRescue'
import { planRescueCase, type IncidentOption } from '../../sim/incident'
import { seriesOf } from '../../sim/search'
import { MissionLive } from './MissionLive'
import { MissionTimeline } from './MissionTimeline'
import { SurvivalMap } from './SurvivalMap'
import { Tour, type TourStep } from '../Tour'

/** Guía de cada paso del simulador: aparece la primera vez y se repite desde «Ayuda → Guía de esta pantalla». */
const TOURS: Record<'plan' | 'journey' | 'surface', TourStep[]> = {
  plan: [
    { target: '[data-tour="sim-site"]', title: 'Elige dónde alunizar', text: 'Seis lugares reales del polo sur de la Luna. Cada uno tiene su propia luz, su contacto con la Tierra y su relieve.' },
    { target: '[data-tour="sim-date"]', title: 'Elige el día de llegada', text: 'Según la fecha, las montañas tapan el Sol o la Tierra. Puedes cambiarla después y volver a probar.' },
    { target: '[data-tour="sim-module"]', title: 'Elige tu módulo', text: 'Cada módulo trae su batería, su panel y su consumo. Con el que viene elegido ya puedes empezar.' },
    { target: '[data-tour="sim-continue"]', title: 'Sigue al viaje', text: 'Con esto basta. En el siguiente paso ves el viaje de la Tierra a la Luna.' },
  ],
  journey: [
    { target: '[data-tour="sim-start"]', title: 'Pulsa «Iniciar viaje»', text: 'Empieza aquí: verás el despegue, el viaje hasta la Luna y el descenso sobre el relieve real del sitio. Puedes pausarlo cuando quieras.' },
    { target: '[data-tour="sim-skip"]', title: '¿Con prisa?', text: '«Ir a la llegada» salta al final del viaje. El viaje no cambia el resultado de la misión en la superficie.' },
    { target: '[data-tour="sim-evaluate"]', title: 'Después, evalúa', text: 'Cuando la nave llegue, aquí comprobamos hora por hora si tu módulo aguanta en la Luna.' },
  ],
  surface: [
    { target: '[data-tour="sim-result"]', title: '¿Sobrevive?', text: 'El veredicto de tu misión: si la batería aguanta todos los días y cuántos datos llegan a la Tierra.' },
    { target: '[data-tour="sim-live"]', title: 'Mírala en el terreno', text: 'El módulo en el relieve real. Las sombras y la Tierra siguen los datos de cada hora.' },
    { target: '[data-tour="sim-timeline"]', title: 'Reproduce la misión', text: 'Pulsa reproducir o arrastra la línea de tiempo. Ámbar es el Sol, azul es la Tierra.' },
    { target: '[data-tour="sim-incident"]', title: '¿Y si algo sale mal?', text: 'Simula un atraso y mira si tu misión todavía funciona y cómo salvarla.' },
    { target: '[data-tour="sim-map"]', title: 'Qué días funcionan', text: 'Cada celda es un día de llegada en un sitio. Toca uno para simularlo.' },
  ],
}

interface WorkspaceProps {
  initialView?: 'plan' | 'journey'
  data: SiteData
  setup: ComponentProps<typeof MissionSetup>
  report: MissionResultProps | null
  lit: boolean[]
  contact: boolean[]
  onSeek: (index: number) => void
  survivalThreshold: number
}

export function SimulatorWorkspace({ data, setup, report, lit, contact, onSeek, survivalThreshold, initialView = 'plan' }: WorkspaceProps) {
  const { state, actions } = useAppState()
  const [view, setView] = useState<'plan' | 'journey' | 'surface'>(initialView)
  const heading = useRef<HTMLHeadingElement>(null)
  const [rescueSignal, setRescueSignal] = useState(0)
  // Aviso después de aplicar un plan (de la IA o de una salida): qué cambió, para que se note que pasó algo.
  const [applied, setApplied] = useState<string[] | null>(null)
  /** Qué cambió respecto al plan anterior, en palabras. El resultado (sobrevive o no) se lee después del recálculo. */
  const announce = (siteId: string, start: number, next: LanderConfig) => {
    const nameOf = (id: string) => state.sites?.find((s) => s.id === id)?.name ?? id
    const changes: string[] = []
    if (siteId !== data.site.id) changes.push(`sitio ${nameOf(data.site.id)} → ${nameOf(siteId)}`)
    const before = report?.result.from
    if (before !== undefined && before !== start) changes.push(`alunizaje ${formatDateTime(sampleTime(data, before))} → ${formatDateTime(sampleTime(data, start))}`)
    const share = setup.cfg.instrumentLoadW > 0 ? next.instrumentLoadW / setup.cfg.instrumentLoadW : 1
    if (Math.abs(share - 1) > 1e-6) changes.push(`instrumentos al ${Math.round(share * 100)} %`)
    if (Math.abs(next.survivalThreshold - setup.cfg.survivalThreshold) > 1e-6) changes.push(`modo ahorro desde el ${Math.round(next.survivalThreshold * 100)} %`)
    setApplied(changes)
    requestAnimationFrame(() => {
      const title = document.getElementById('mission-step-title')
      title?.focus({ preventScroll: true })
      title?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }
  const applyPlan = (siteId: string, cfg: LanderConfig, start: number) => {
    announce(siteId, start, cfg)
    if (siteId !== data.site.id) report?.onTrySite(siteId)
    if (JSON.stringify(cfg) !== JSON.stringify(setup.cfg)) setup.onCfg(cfg)
    report?.onTryStart(start)
  }
  // La mejor salida sencilla si la misión falla: el «así lo resolvemos» del control de misión (simulada).
  const failing = report && !report.result.summary.survived ? report.result : null
  const rescueFix = useMemo(() => {
    if (!failing) return null
    const sites = Object.values(state.data).map((d) => ({ data: d, series: seriesOf(d) }))
    const c = planRescueCase({ data, cfg: setup.cfg, startIndex: failing.from, missionDays: failing.plan.missionDays, sites, series: sites.find((s) => s.data.site.id === data.site.id)?.series })
    return c?.options.reduce<IncidentOption | null>((best, o) => (!best || o.summary.dataSentMb > best.summary.dataSentMb ? o : best), null) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `failing` resume el plan que falla
  }, [failing, state.data, data, setup.cfg])
  const askRescue = () => {
    document.getElementById('rescate-ia')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setRescueSignal((n) => n + 1)
  }
  const navigate = (next: typeof view) => {
    actions.setPlaying(false)
    setView(next)
    setApplied(null)
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }) })
  }
  const result = report?.result
  const sample = result && state.index >= result.from && state.index < result.from + result.series.soc.length ? state.index - result.from : null
  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Tu misión a la Luna.</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">Elige tu destino, recorre el viaje y descubre si tu módulo puede completar la misión.</p>
      </header>
      <nav aria-label="Pasos de la simulación" className="mission-steps mb-9 grid grid-cols-3 border-b border-seam">
        {([
          ['plan', 'Preparar', 'Destino y módulo'],
          ['journey', 'Viajar', 'De la Tierra a la Luna'],
          ['surface', 'Evaluar', 'Resultado y alternativas'],
        ] as const).map(([step, label, description], i) => (
          <button key={step} type="button" aria-current={view === step ? 'step' : undefined} aria-controls="mission-step"
            disabled={step === 'surface' && !report} onClick={() => navigate(step)}
            className={cx('flex min-h-20 items-center gap-3 border-b-2 px-2 py-4 text-left transition-colors sm:px-4', view === step ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:bg-hull hover:text-ink', 'disabled:cursor-not-allowed disabled:text-ink-faint')}>
            <span aria-hidden className={cx('flex size-8 shrink-0 items-center justify-center rounded-hw border text-sm font-bold', view === step ? 'border-ink bg-ink text-void' : 'border-seam-strong')}>{i + 1}</span>
            <span className="min-w-0"><span className="block text-sm font-bold sm:text-base">{label}</span><span className="mt-1 hidden text-xs sm:block">{description}</span></span>
          </button>
        ))}
      </nav>
      {/* La guía del resultado espera a que exista el resultado. */}
      {(view !== 'surface' || report) && <Tour key={view} id={`simulador-${view}`} steps={TOURS[view]} />}
      <section id="mission-step" aria-labelledby="mission-step-title">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 ref={heading} tabIndex={-1} id="mission-step-title" className="scroll-mt-6 text-2xl font-bold leading-tight text-ink sm:text-3xl">
            {view === 'plan' ? 'Primero, prepara tu misión.' : view === 'journey' ? 'Ahora, viaja a la Luna.' : '¿Tu misión sobrevive?'}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
            {view === 'plan' ? 'Solo necesitas elegir un sitio, una fecha y un módulo. Puedes usar la configuración inicial.' : view === 'journey' ? 'Pulsa Iniciar viaje o mueve la línea de tiempo. Después evalúa el alunizaje.' : 'Revisa la energía, la comunicación y las fechas que funcionan para tu módulo.'}
          </p>
        </div>
        {view !== 'plan' && <Button className="min-h-12" onClick={() => navigate('plan')}>Modificar mi plan</Button>}
      </div>
      {view === 'plan' && <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
      <div className="min-w-0">
      <MissionSetup {...setup} actionLabel="Continuar al viaje →" onSimulate={() => navigate('journey')} siteControl={
        <div data-tour="sim-site" className="min-w-0">
          <Select id="mission-site" label="Sitio de alunizaje" value={data.site.id} onChange={actions.select}
            options={state.sites?.map(s => ({ value: s.id, label: s.name, description: s.description })) ?? []} />
        </div>
      } />
      </div>
      <aside aria-label="Resumen de tu plan" className="min-w-0 lg:border-l lg:border-seam lg:pl-10">
        <div className="relative mb-6">
          <img src="/media/i2-borde-crater.jpg" alt="" className="aspect-16/7 w-full object-cover" />
          <SiMark />
        </div>
        <p className="text-sm text-ink-muted">Tu destino · Polo sur lunar</p>
        <h3 className="mt-2 font-display text-4xl font-bold uppercase leading-tight text-ink">{data.site.name}</h3>
        <dl className="mt-5 divide-y divide-seam text-sm">
          <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">Alunizaje</dt><dd className="text-right text-ink">{formatDate(setup.timelineDate)}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">En superficie</dt><dd className="text-ink">{setup.missionDays} días</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">Módulo</dt><dd className="text-right text-ink">{setup.preset ? PRESETS[setup.preset].label : 'Personalizado'}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-ink-muted">Comprobaremos si tiene energía suficiente, cuándo puede enviar datos a la Tierra y cómo influye el terreno.</p>
      </aside>
      </div>}
      {view === 'journey' && <EarthMoonJourney data={data} arrival={setup.timelineDate} destination={data.site.name} onArrive={() => { setup.onSimulate(); navigate('surface') }} />}
      {view === 'surface' && applied && report && (() => {
        const s = report.result.summary
        const failDay = s.failedAtIndex === null ? null : Math.floor((s.failedAtIndex - report.result.from) * data.stepHours / 24) + 1
        return <div role="status" className={cx('applied-note mb-6 flex flex-wrap items-start justify-between gap-3', !s.survived && 'is-fail')}>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-snug text-ink">
              {s.survived
                ? <><span aria-hidden className="mr-2 text-ok">✓</span>Listo, funcionó. La misión ahora sobrevive los {report.result.plan.missionDays} días y envía {(s.dataSentMb / 1000).toFixed(1)} Gb a la Tierra.</>
                : <><span aria-hidden className="mr-2 text-critical">✗</span>Se aplicó el plan, pero la misión todavía se queda sin energía el día {failDay}.</>}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{applied.length ? <>Cambiamos: {applied.join(' · ')}.</> : 'El plan ya era el mismo.'} El resultado de abajo ya está actualizado.</p>
          </div>
          <button type="button" className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink" onClick={() => setApplied(null)}>Cerrar</button>
        </div>
      })()}
      {view === 'surface' && report && <IncidentPanel key={`${data.site.id}:${report.result.from}:${report.result.plan.missionDays}:${JSON.stringify(setup.cfg)}`}
        data={data} cfg={setup.cfg} startIndex={report.result.from} missionDays={report.result.plan.missionDays} originalResult={report.result}
        onTryStart={report.onTryStart} onTrySite={report.onTrySite} onCfg={setup.onCfg} onApplied={announce}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div data-tour="sim-live" className="terrain-stage h-136 min-w-0 sm:h-128">
          <ViewerPanel data={data} index={state.index} contact={contact[state.index]} immersive
            missionState={result && sample !== null ? result.series.mode[sample] : undefined}
            missionOverlay={result && <MissionLive key={`${data.site.id}:${result.from}:${JSON.stringify(result.plan)}:${JSON.stringify(setup.cfg)}`}
              data={data} result={result} index={state.index} playing={state.playing}
              onPlay={() => actions.setPlaying(true)} onPause={() => actions.setPlaying(false)} />} />
        </div>
        <MissionResult {...report} onRescue={askRescue} />
      </div>
        <MissionTimeline data={data} result={report.result} lit={lit} contact={contact} index={state.index} playing={state.playing}
          speed={state.speed} survivalThreshold={survivalThreshold} onToggle={actions.togglePlay} onSeek={onSeek} onSpeed={actions.setSpeed}
          fix={rescueFix} onRescue={report.result.summary.survived ? undefined : askRescue} />
        {!report.result.summary.survived && <PlanRescue key={`${data.site.id}:${report.result.from}:${report.result.plan.missionDays}:${JSON.stringify(setup.cfg)}`}
          data={data} cfg={setup.cfg} startIndex={report.result.from} missionDays={report.result.plan.missionDays} startSignal={rescueSignal}
          onApply={applyPlan} />}
        <SurvivalMap data={data} cfg={setup.cfg} missionDays={report.result.plan.missionDays} landing={report.result.from} tolerance={report.tolerance}
          onPick={(siteId, start) => { if (siteId !== data.site.id) report.onTrySite(siteId); report.onTryStart(start) }} />
        <MissionOptions {...report} />
        <Disclosure className="mt-4" title="Batería, datos y eventos de la misión" description="Revisa el resultado hora por hora y localiza los momentos críticos.">
          <MissionTrace data={data} result={report.result} lit={lit} contact={contact} survivalThreshold={survivalThreshold} index={state.index} onSeek={onSeek} />
        </Disclosure>
      </IncidentPanel>}
      </section>
      <Disclosure className="mt-10" title="Fuentes y supuestos de la simulación" description="De dónde vienen los datos y qué incluye este modelo.">
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-muted">Los módulos son configuraciones de referencia, no naves reales. El panel gira para seguir al Sol. Hay contacto cada vez que la Tierra está a la vista, con una antena de la Red de Espacio Profundo (DSN) disponible para recibir los datos. La misión falla si la batería baja al 20 %. La luz y el contacto se calculan hora por hora con JPL Horizons y el horizonte LOLA de cada sitio. El viaje de la Tierra a la Luna es una transferencia orbital idealizada.</p>
      </Disclosure>
    </main>
  )
}
