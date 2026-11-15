// Un espacio de trabajo lunar: el plan arriba, el terreno en el centro y la evidencia debajo.
// Conserva la tipografía y los colores de vuelo; evita marcos repetidos y columnas con scroll independiente.
import { useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { formatDate, formatDateTime, formatDurationLong, formatMissionClock, sampleTime } from '../../lib/time'
import { PRESETS } from '../../sim/lander'
import { useAppState } from '../../state'
import type { SiteData } from '../../types'
import { Button, cx, Disclosure, Select } from '../ui'
import { TimeScale } from '../TimeScale'
import { ViewerPanel } from '../ViewerPanel'
import { MissionSetup } from './MissionSetup'
import { MissionOptions, MissionResult, type MissionResultProps } from './MissionResult'
import { MissionTrace } from './MissionTrace'
import { EarthMoonJourney } from './EarthMoonJourney'
import { IncidentPanel } from './IncidentPanel'
import { MissionLive } from './MissionLive'

interface WorkspaceProps {
  data: SiteData
  setup: ComponentProps<typeof MissionSetup>
  report: MissionResultProps | null
  lit: boolean[]
  contact: boolean[]
  onSeek: (index: number) => void
  survivalThreshold: number
}

export function SimulatorWorkspace({ data, setup, report, lit, contact, onSeek, survivalThreshold }: WorkspaceProps) {
  const { state, actions } = useAppState()
  const [view, setView] = useState<'plan' | 'journey' | 'surface'>('plan')
  const heading = useRef<HTMLHeadingElement>(null)
  const navigate = (next: typeof view) => {
    actions.setPlaying(false)
    setView(next)
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
        <Select id="mission-site" label="Sitio de alunizaje" value={data.site.id} onChange={actions.select}
          options={state.sites?.map(s => ({ value: s.id, label: s.name, description: s.description })) ?? []} />
      } />
      </div>
      <aside aria-label="Resumen de tu plan" className="min-w-0 lg:border-l lg:border-seam lg:pl-10">
        <img src="/media/i2-borde-crater.jpg" alt="" className="mb-6 aspect-[16/7] w-full object-cover" />
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
      {view === 'surface' && report && <IncidentPanel key={`${data.site.id}:${report.result.from}:${report.result.plan.missionDays}:${JSON.stringify(setup.cfg)}`}
        data={data} cfg={setup.cfg} startIndex={report.result.from} missionDays={report.result.plan.missionDays} originalResult={report.result}
        onTryStart={report.onTryStart} onTrySite={report.onTrySite} onCfg={setup.onCfg}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="terrain-stage h-[34rem] min-w-0 sm:h-[32rem]">
          <ViewerPanel data={data} index={state.index} contact={contact[state.index]} immersive
            missionState={result && sample !== null ? result.series.mode[sample] : undefined}
            missionOverlay={result && <MissionLive key={`${data.site.id}:${result.from}:${JSON.stringify(result.plan)}:${JSON.stringify(setup.cfg)}`}
              data={data} result={result} index={state.index} playing={state.playing}
              onPlay={() => actions.setPlaying(true)} onPause={() => actions.setPlaying(false)} />} />
        </div>
        <MissionResult {...report} />
      </div>
        <MissionTransport data={data} report={report} onSeek={onSeek} />
        <MissionOptions {...report} />
        <Disclosure className="mt-4" title="Batería, datos y eventos de la misión" description="Revisa el resultado hora por hora y localiza los momentos críticos.">
          <MissionTrace data={data} result={report.result} lit={lit} contact={contact} survivalThreshold={survivalThreshold} index={state.index} onSeek={onSeek} />
        </Disclosure>
      </IncidentPanel>}
      </section>
      <Disclosure className="mt-10" title="Fuentes y supuestos de la simulación" description="De dónde vienen los datos y qué incluye este modelo.">
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-muted">Los módulos son configuraciones de referencia. El panel sigue al Sol; se supone una estación DSN disponible cuando la Tierra es visible. La batería falla al llegar al 20 %. Luz y contacto se calculan con JPL Horizons y el horizonte LOLA del sitio. El recorrido Tierra–Luna usa una transferencia orbital idealizada.</p>
      </Disclosure>
    </main>
  )
}

function MissionTransport({ data, report, onSeek }: { data: SiteData; report: MissionResultProps; onSeek: (index: number) => void }) {
  const { state, actions } = useAppState()
  const from = report.result.from
  const end = from + report.result.series.soc.length - 1
  const fill = end > from ? ((state.index - from) / (end - from)) * 100 : 0
  const date = sampleTime(data, state.index)
  return (
    <section aria-label="Reproducir misión" className="glass-surface my-6 flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <Button size="sm" onClick={actions.togglePlay} aria-label={state.playing ? 'Pausar' : 'Reproducir'}>{state.playing ? 'Pausar' : 'Reproducir'}</Button>
      <p className="min-w-0 text-sm tabular-nums text-ink">{formatMissionClock(data, state.index, from)}</p>
      <input type="range" className="range min-w-28 flex-1" aria-label="Fecha y hora" aria-valuetext={formatDateTime(date)}
        min={from} max={end} value={state.index} onChange={(e) => onSeek(Number(e.target.value))} style={{ '--fill': `${fill}%` } as CSSProperties} />
      <TimeScale speed={state.speed} onSpeed={actions.setSpeed} spanHours={report.result.series.soc.length * data.stepHours}
        spanLabel={`La misión de ${formatDurationLong(report.result.series.soc.length * data.stepHours)}`} />
    </section>
  )
}
