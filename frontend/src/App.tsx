import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { HorizonStrip } from './components/HorizonStrip'
import { SiteSelector } from './components/SiteSelector'
import { Help } from './components/Help'
import { SkyPlot } from './components/SkyPlot'
import { dataNotice } from './api'
import { Sources } from './components/Sources'
import { SimulatorWorkspace } from './components/sim/SimulatorWorkspace'
import { Story } from './components/Story'
import { PlannerGuide } from './components/PlannerGuide'
import { ViewerPanel } from './components/ViewerPanel'
import { WindowsBar } from './components/WindowsBar'
import { TimeScale } from './components/TimeScale'
import { DelayCheck } from './components/DelayCheck'
import { PlanCompare, type SavedPlan } from './components/PlanCompare'
import { SiteConditions } from './components/SiteConditions'
import { VisibilityCalendar } from './components/VisibilityCalendar'
import { Badge, Button, DateTimeField, Disclosure, InfoTip, Panel, Segmented, Stat, StatGrid, cx, transition, type Tone } from './components/ui'
import { formatLat, formatLon } from './lib/format'
import { dayNumber, formatDate, formatDateTime, formatDuration, formatDurationLong, formatShortDate, formatTime, fromInputValue, indexAt, sampleTime, samplesFor, totalDays } from './lib/time'
import { missionWindow, recommend, type Recommendation } from './lib/recommend'
import { storyFacts } from './lib/storyFacts'
import { DEFAULT_WEIGHTS, VERDICT_LABEL, siteViability, type Verdict, type ViabilityResult } from './lib/viability'
import { compassPoint, dsnLinkSeries, dsnStationsAt, eclipseFraction, eclipses, sunBlocker } from './lib/sky'
import { nextChange, visibility } from './lib/visibility'
import { DEFAULT_PRESET, PRESETS, type LanderConfig, type PresetId } from './sim/lander'
import { bestViableStart, delayTolerance, scanStarts } from './sim/search'
import { simulate } from './sim/simulate'
import { useAppState, type Speed } from './state'
import type { SiteData } from './types'

const MODES = [
  { value: 'explore', label: 'Planificador' },
  { value: 'simulate', label: 'Simulador' },
] as const


const MISSION_LENGTHS = [
  { value: '7', label: '7 d' },
  { value: '14', label: '14 d' },
  { value: '28', label: '28 d' },
] as const

/** Lo que la interfaz necesita de cada sitio: datos, visibilidad y viabilidad de la misión elegida. */
interface SiteView {
  data: SiteData
  lit: boolean[]
  contact: boolean[]
  /** % de luz y de contacto dentro de la ventana de la misión */
  lightPct: number
  contactPct: number
  result: ViabilityResult
  viability: number
  missionSurvives?: boolean
}

type View = 'story' | 'planner'

/** Portada o planificador. `#planificador` abre el planificador; un enlace directo `?sitio=` también. */
function viewFromUrl(): View {
  const { hash, search } = window.location
  if (hash === '#planificador') return 'planner'
  if (hash === '' && new URLSearchParams(search).has('sitio')) return 'planner'
  return 'story'
}

export default function App() {
  const [view, setView] = useState<View>(viewFromUrl)
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    // La portada y el planificador se cruzan con una transición: hacia el planificador avanza, hacia la portada vuelve.
    const onHash = () => {
      const next = viewFromUrl()
      if (next !== viewRef.current) transition(() => setView(next), next === 'planner' ? 'forward' : 'back')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useLayoutEffect(() => {
    // La pantalla nueva ya está montada: no hereda el scroll de la anterior.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
    return () => window.cancelAnimationFrame(frame)
  }, [view])

  const { state } = useAppState()
  const facts = useMemo(() => storyFacts(Object.values(state.data)), [state.data])

  if (view === 'story') {
    const reference = facts ? Object.values(state.data).find((d) => d.site.name === facts.refName) : undefined
    return <Story facts={facts} reference={reference} onOpen={() => (window.location.hash = 'planificador')} />
  }
  return <Planner />
}

function Planner() {
  const { state, actions } = useAppState()
  const { sites, selectedId, index: i, mode } = state

  const { missionDays } = state
  /** Cambiar entre Planificador y Simulador con transición (el simulador va «adelante»). */
  const changeMode = (next: typeof mode) => { if (next !== mode) transition(() => actions.setMode(next), next === 'simulate' ? 'forward' : 'back') }

  const [preset, setPreset] = useState<PresetId | null>(DEFAULT_PRESET)
  const [plannerStep, setPlannerStep] = useState(0)
  const [cfg, setCfg] = useState<LanderConfig>(PRESETS[DEFAULT_PRESET].config)
  const [landing, setLanding] = useState<number | null>(null)
  const [draftStart, setDraftStart] = useState<number | null>(null)
  /** Plan de referencia para comparar (tarea 10); se conserva al cambiar sitio, fecha o duración. */
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(null)
  const simCfg = useDeferredValue(cfg)
  const evaluationStart = mode === 'simulate' && landing !== null ? landing : i

  // Visibilidad de cada sitio cargado: se calcula una vez por sitio.
  const contexts = useMemo(() => Object.values(state.data).map((data) => ({ data, vis: visibility(data) })), [state.data])

  // Viabilidad de una misión de `missionDays` días que empieza en la fecha de la línea de tiempo.
  const views = useMemo(() => {
    const out: Record<string, SiteView> = {}
    for (const { data, vis } of contexts) {
      const missionSurvives = mode === 'simulate' && landing !== null
        ? simulate(data, simCfg, { startIndex: evaluationStart, missionDays }, vis).summary.survived : undefined
      const result = siteViability(data, vis, DEFAULT_WEIGHTS, missionWindow(data, evaluationStart, missionDays), { missionSurvives })
      out[data.site.id] = {
        data,
        lit: vis.lit,
        contact: vis.contact,
        lightPct: result.factors.light.score,
        contactPct: result.factors.contact.score,
        result,
        viability: result.score,
        missionSurvives,
      }
    }
    return out
  }, [contexts, evaluationStart, missionDays, mode, landing, simCfg])

  const current = contexts.find((c) => c.data.site.id === selectedId)
  const rec = useMemo(
    () => (current ? recommend(current, contexts, { startIndex: i, missionDays }) : null),
    [current, contexts, i, missionDays],
  )
  const p = selectedId ? views[selectedId] : undefined
  const siteError = selectedId ? state.dataErrors[selectedId] : undefined

  // Simulador: módulo, alunizaje (fijo al pulsar "Simular") y resultados.
  const result = useMemo(
    () => (current && landing !== null ? simulate(current.data, simCfg, { startIndex: landing, missionDays }, current.vis) : null),
    [current, landing, missionDays, simCfg],
  )
  const scan = useMemo(
    () => (current && landing !== null ? scanStarts(current.data, simCfg, missionDays, current.vis) : null),
    [current, landing !== null, missionDays, simCfg], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const bestMissionDate = useMemo(() => {
    if (!current || !scan) return null
    return bestViableStart(current.data, scan, missionDays, current.vis)
  }, [current, scan, missionDays])
  const tolerance = useMemo(
    () => (current && result ? delayTolerance(current.data, simCfg, result.from, missionDays, current.vis) : null),
    [current, result, missionDays, simCfg],
  )
  const tryStart = (s: number) => {
    actions.setPlaying(false)
    setLanding(s)
    setDraftStart(s)
    actions.setIndex(s)
  }
  const missionEnd = result ? result.from + result.series.soc.length : null
  useEffect(() => {
    actions.setPlaybackRange(mode === 'simulate' && result && missionEnd !== null ? { from: result.from, to: missionEnd } : null)
    return () => { actions.setPlaybackRange(null) }
  }, [mode, selectedId, result?.from, missionEnd, actions])
  const seek = (index: number) => {
    actions.setPlaying(false)
    actions.setIndex(index)
  }
  const plannedStart = current ? missionWindow(current.data, draftStart ?? landing ?? i, missionDays).from : 0
  const notice = p ? dataNotice(p.data) : null

  return (
    <div className="flight-console flex min-h-dvh flex-col">
      <header className="flight-header flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
        <Brand />
        <Segmented label="Modo" options={MODES} value={mode} onChange={changeMode} />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {notice && <Badge tone="caution">Datos de prueba</Badge>}
          <Help />
          <Sources data={p?.data} />
        </div>
      </header>
      {notice && (
        <p role="status" className="border-y border-caution/40 px-4 py-2.5 text-sm leading-relaxed text-caution sm:px-5">
          {notice}
        </p>
      )}

      {state.listStatus === 'error' ? (
        <LoadError title="No se pudo cargar la lista de sitios" onRetry={actions.reload}>
          {state.listError}
        </LoadError>
      ) : siteError ? (
        <LoadError title="No se pudieron cargar los datos de este sitio" onRetry={actions.reload}>
          {siteError}
        </LoadError>
      ) : !p || !sites ? (
        <Loading />
      ) : (
        <div className="app-screen">
          {mode === 'simulate' ? (
            <SimulatorWorkspace
              data={p.data} lit={p.lit} contact={p.contact} onSeek={seek} survivalThreshold={simCfg.survivalThreshold}
              setup={{
                preset, cfg,
                onPreset: (id) => { setPreset(id); setCfg(PRESETS[id].config) },
                onCfg: (value) => { setPreset(null); setCfg(value) },
                missionDays,
                maxDays: totalDays(p.data, p.data.sun.el.length),
                onMissionDays: actions.setMissionDays,
                timelineDate: sampleTime(p.data, plannedStart),
                minDate: sampleTime(p.data, 0),
                maxDate: sampleTime(p.data, Math.max(0, p.data.sun.el.length - samplesFor(p.data, missionDays * 24))),
                onDate: (value) => {
                  const date = fromInputValue(value)
                  if (date) setDraftStart(indexAt(p.data, date, p.data.sun.el.length))
                },
                landingDate: result ? sampleTime(p.data, result.from) : null,
                onSimulate: () => tryStart(plannedStart),
              }}
              report={result && tolerance && scan ? {
                data: p.data, result, tolerance, scan,
                best: bestMissionDate, assessment: p.result,
                comparisons: Object.values(views)
                  .filter(v => v.data.start === p.data.start && v.data.stepHours === p.data.stepHours && v.data.sun.el.length === p.data.sun.el.length)
                  .map(v => ({ siteId: v.data.site.id, name: v.data.site.name, score: v.viability, lightPct: v.lightPct, contactPct: v.contactPct, slopeDeg: v.data.slope.max100mDeg, survived: v.missionSurvives }))
                  .sort((a, b) => b.score - a.score),
                onTryStart: tryStart,
                onTrySite: actions.select,
              } : null}
            />
          ) : <PlannerGuide sites={sites} selectedId={p.data.site.id} errors={state.dataErrors} onSelect={actions.select}
            step={plannerStep} onStep={setPlannerStep}
            date={sampleTime(p.data, i)} missionDays={missionDays} schedule={
                <section aria-label="Fecha y duración del plan" className="glass-surface grid grid-cols-1 items-end gap-5 px-5 py-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div data-tour="date" className="min-w-0"><DateTimeField id="explore-date" label="Fecha de alunizaje · UTC" value={sampleTime(p.data, i)}
                    min={sampleTime(p.data, 0)} max={sampleTime(p.data, p.data.sun.el.length - 1)}
                    onChange={date => seek(indexAt(p.data, date, p.data.sun.el.length))} /></div>
                  <div className="min-w-0" data-tour="duration"><p className="mb-2 text-sm text-ink-muted">Días en la superficie</p>
                    <Segmented label="Duración de la misión" options={MISSION_LENGTHS.some(o => o.value === String(missionDays)) ? MISSION_LENGTHS : [...MISSION_LENGTHS, { value: String(missionDays), label: `${missionDays} d` }]} value={String(missionDays)} onChange={v => actions.setMissionDays(Number(v))} className="min-h-12 w-full items-center [&_button]:min-h-10" />
                  </div>
                </section>
            }>
            <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="hidden lg:contents"><SiteSelector sites={sites} selectedId={p.data.site.id} summaries={views} errors={state.dataErrors} onSelect={actions.select} /></div>
              <div className="min-w-0 space-y-7">
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="min-w-0">
                    <div className="terrain-stage h-[27rem] min-w-0 sm:h-[31rem]" data-tour="terrain"><ViewerPanel data={p.data} index={i} contact={p.contact[i]} immersive /></div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-muted">{p.data.site.description}</p>
                  </div>
                  {rec && <Viability p={p} rec={rec} onSimulate={() => { actions.setPlaying(false); setDraftStart(rec.window.from); changeMode('simulate') }} />}
                </div>
                {current && <DelayCheck data={p.data} vis={current.vis} cfg={cfg} moduleName={preset ? PRESETS[preset].label : 'módulo personalizado'}
                  startIndex={i} missionDays={missionDays} onApply={seek} />}
                {rec && <PlanAlternatives p={p} rec={rec} onSelect={actions.select} onSeek={seek} />}
                <PlanCompare contexts={contexts} siteId={p.data.site.id} startIndex={i} missionDays={missionDays} cfg={cfg}
                  moduleName={preset ? PRESETS[preset].label : 'módulo personalizado'} saved={savedPlan} onSave={setSavedPlan}
                  onApply={(plan) => { actions.select(plan.siteId); actions.setMissionDays(plan.missionDays); seek(plan.startIndex) }} />
                <Disclosure title="Ver luz, comunicación y calendario" description="Explora el entorno del módulo y busca otros días para alunizar.">
                  <SiteConditions data={p.data} index={i} lit={p.lit} contact={p.contact} />
                  <div className="mt-7"><Timeline p={p} index={i} playing={state.playing} speed={state.speed} onIndex={seek} onTogglePlay={actions.togglePlay} onSpeed={actions.setSpeed} /></div>
                </Disclosure>
                <Disclosure title="Gráficos técnicos del cielo y el relieve" description="Consulta los ángulos, el horizonte y los recorridos del Sol y la Tierra.">
                  <HorizonStrip title={`${p.data.site.name} · ${formatLat(p.data.site.lat)}, ${formatLon(p.data.site.lon)}`}
                    horizon={p.data.horizon.elevationDeg} sun={{ az: p.data.sun.az[i], el: p.data.sun.el[i], visible: p.lit[i] }}
                    earth={{ az: p.data.earth.az[i], el: p.data.earth.el[i], visible: p.contact[i] }} sunTrack={p.data.sun} earthTrack={p.data.earth} />
                  <div className="mt-7 grid items-start gap-6 xl:grid-cols-2">
                    <SkyPlot horizon={p.data.horizon.elevationDeg} sun={{ az: p.data.sun.az[i], el: p.data.sun.el[i], visible: p.lit[i] }}
                      earth={{ az: p.data.earth.az[i], el: p.data.earth.el[i], visible: p.contact[i] }} sunTrack={p.data.sun} earthTrack={p.data.earth} />
                    <Now p={p} index={i} />
                  </div>
                </Disclosure>
              </div>
            </div>
          </PlannerGuide>}

        </div>
      )}
    </div>
  )
}

/** Error de carga: dice qué pasó y deja reintentar. */
function LoadError({ title, children, onRetry }: { title: string; children: ReactNode; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div role="alert" className="max-w-lg border border-critical/40 p-6">
        <p className="instrument-label text-critical">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{children}</p>
        <Button className="mt-5" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Encabezado
// ---------------------------------------------------------------------------

function Brand() {
  return (
    <a href="#inicio" title="Volver a la portada" className="flex min-w-0 items-center gap-3">
      <img src="/brand/logo-transparent.svg" alt="" width={510} height={355} className="h-auto w-14 shrink-0 sm:w-16" />
      <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.03em]">GEOATHECMOON</p>
    </a>
  )
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-10" role="status">
      <p className="instrument-label motion-safe:animate-pulse">Cargando sitios del polo sur…</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista 3D (los modelos los crea Richard; aquí solo el marco y el estado vacío)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Línea de tiempo
// ---------------------------------------------------------------------------

function Timeline({
  p,
  index,
  playing,
  speed,
  onIndex,
  onTogglePlay,
  onSpeed,
  mission,
}: {
  p: SiteView
  index: number
  playing: boolean
  speed: Speed
  onIndex: (i: number) => void
  onTogglePlay: () => void
  onSpeed: (v: Speed) => void
  /** Ventana de la misión simulada, para marcarla en la barra */
  mission?: { from: number; to: number }
}) {
  const n = p.data.sun.el.length
  const date = sampleTime(p.data, index)
  const day = dayNumber(p.data, index)
  const days = totalDays(p.data, n)
  const min = mission?.from ?? 0
  const max = mission ? mission.to - 1 : n - 1
  const fill = max > min ? ((index - min) / (max - min)) * 100 : 0
  // Datos de D1: enlace real con la DSN (Tierra visible y alguna antena con la Luna sobre 10°) y eclipses.
  const dsn = useMemo(() => dsnLinkSeries(p.data, p.contact), [p.data, p.contact])
  const sunEclipses = useMemo(() => eclipses(p.data).filter((e) => p.lit.slice(e.start, e.end).some(Boolean)), [p.data, p.lit])

  return (
    <Panel label={mission ? 'Reproducir misión' : 'Elige cuándo alunizar'}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button
          variant="primary"
          size="md"
          className="w-10 px-0"
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={onTogglePlay}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-lg tracking-tight text-ink">{formatDate(date)}</span>
          <span className="font-mono text-lg tracking-tight text-ink-muted">{formatTime(date)} UTC</span>
        </div>
        <span className="font-mono text-xs text-ink-faint">
          {mission ? `Día ${dayNumber(p.data, index, mission.from)} de la misión` : `Día ${day} de ${days}`}
        </span>
        <TimeScale className="sm:ml-auto" speed={speed} onSpeed={onSpeed}
          spanHours={(max - min + 1) * p.data.stepHours}
          spanLabel={mission ? `La misión de ${formatDurationLong((max - min + 1) * p.data.stepHours)}` : `El periodo de ${days} días`} />
      </div>
      <input
        type="range"
        aria-label="Fecha y hora"
        aria-valuetext={formatDateTime(date)}
        className="range mt-3"
        style={{ '--fill': `${fill}%` } as CSSProperties}
        min={min}
        max={max}
        value={index}
        onChange={(e) => onIndex(Number(e.target.value))}
      />
      <VisibilityCalendar data={p.data} index={index} lit={p.lit} contact={p.contact} onSeek={onIndex} />
      <Disclosure className="mt-5" title="Líneas de tiempo del año y antenas DSN" description="Vista técnica: cada tramo de color indica cuándo hay luz o contacto.">
      <div className="mt-2">
        <WindowsBar
          lit={p.lit}
          contact={p.contact}
          index={index}
          start={p.data.start}
          stepHours={p.data.stepHours}
          onSeek={(index) => onIndex(Math.max(min, Math.min(max, index)))}
          highlight={mission}
          dsn={dsn}
          eclipses={sunEclipses}
        />
      </div>
      {(dsn || sunEclipses.length > 0) && (
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          {dsn && 'DSN: horas con la Tierra a la vista y alguna antena de Goldstone, Madrid o Canberra con la Luna sobre 10°. '}
          {sunEclipses.length > 0 && `Cortes en la luz: ${sunEclipses.length === 1 ? 'un eclipse' : `${sunEclipses.length} eclipses`} de Sol por la Tierra.`}
        </p>
      )}
      </Disclosure>
    </Panel>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-5" aria-hidden>
      <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-5" aria-hidden>
      <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Viabilidad
// ---------------------------------------------------------------------------

const VERDICT_TONE: Record<Verdict, Tone> = { good: 'ok', fair: 'caution', poor: 'critical' }

function Viability({
  p,
  rec,
  onSimulate,
}: {
  p: SiteView
  rec: Recommendation
  onSimulate: () => void
}) {
  const r = p.result
  const v = Math.round(r.score)
  // Se marca el factor que más resta solo si de verdad pesa (igual que en el resumen).
  const limit = r.factors[r.limiting].lost >= 5 ? r.limiting : null
  const from = sampleTime(p.data, rec.window.from)
  const to = sampleTime(p.data, rec.window.to)

  return (
    <section aria-label="Viabilidad del plan" data-tour="score" className="glass-surface order-first min-w-0 p-5 sm:p-6 xl:order-none">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">¿Conviene alunizar aquí?</h2>
        <InfoTip label="Viabilidad" align="end">
          Combina el % de tiempo con luz solar, el % con contacto directo con la Tierra y la pendiente del terreno
          (hasta 5° es cómoda; desde 10° la mayoría de los módulos no puede alunizar), durante los días de la misión.
          Es un índice de condiciones, no una probabilidad de éxito. Mueve la línea de tiempo para cambiar la fecha de alunizaje.
        </InfoTip>
      </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          <span className="text-ink">{formatShortDateTime(from)}</span> → <span className="text-ink">{formatShortDateTime(to)}</span>
          {rec.window.shifted && <span className="block text-ink-faint">Se adelantó el inicio para que la misión entre en los datos.</span>}
        </p>

      <div className="mt-4 flex items-end gap-3">
        <p className="flex items-baseline">
          <span className="font-display text-8xl font-black leading-[0.8]">{v}</span>
          <span className="ml-1 font-display text-3xl font-bold text-ink-muted">%</span>
        </p>
        <Badge tone={VERDICT_TONE[r.verdict]} className="mb-1">
          {VERDICT_LABEL[r.verdict]}
        </Badge>
      </div>

      <div className="mt-5 flex flex-col gap-3.5" data-tour="factors">
        <Factor
          label="Luz solar"
          weight={r.factors.light.weight}
          value={`${Math.round(r.factors.light.score)} %`}
          valueTone="text-sun"
          limiting={limit === 'light'}
        />
        <Factor
          label="Contacto con la Tierra"
          weight={r.factors.contact.weight}
          value={`${Math.round(r.factors.contact.score)} %`}
          valueTone="text-earth"
          limiting={limit === 'contact'}
        />
        <Factor
          label="Pendiente"
          weight={r.factors.slope.weight}
          value={`${p.data.slope.max100mDeg.toFixed(1)}° máx.`}
          limiting={limit === 'slope'}
        />
        {r.factors.slope.score === 0 && <p className="text-xs leading-relaxed text-caution">Pendiente peligrosa para el alunizaje.</p>}
      </div>
      <Button variant="primary" size="lg" className="mt-5 w-full" data-tour="simulate" onClick={onSimulate}>Simular este plan →</Button>
    </section>
  )
}

function PlanAlternatives({ p, rec, onSelect, onSeek }: { p: SiteView; rec: Recommendation; onSelect: (id: string) => void; onSeek: (index: number) => void }) {
  return <section aria-label="Recomendaciones para el plan" data-tour="improve" className="glass-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold text-ink">Cómo mejorar tu plan.</h2>
        {p.result.warnings.length > 0 && <p className="mt-3 text-sm leading-relaxed text-caution">{p.result.warnings.join(' ')}</p>}
        {rec.betterDate || rec.betterSite ? (
          <ul className="mt-5 grid gap-6 sm:grid-cols-2">
            {rec.betterDate && rec.dateMessage && (
              <li>
                <h3 className="mb-2 text-sm font-bold text-ink">Prueba otra fecha</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{rec.dateMessage}</p>
                <Button className="mt-3 min-h-11" onClick={() => onSeek(rec.betterDate!.startIndex)}>
                  Probar esa fecha
                </Button>
              </li>
            )}
            {rec.betterSite && rec.siteMessage && (
              <li>
                <h3 className="mb-2 text-sm font-bold text-ink">Compara otro sitio</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{rec.siteMessage}</p>
                <Button className="mt-3 min-h-11" onClick={() => onSelect(rec.betterSite!.siteId)}>
                  Ver {rec.betterSite.name}
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rec.message}</p>
        )}
    </section>
}

/** "18 ene, 06:00" para rangos cortos dentro del mismo periodo. */
function formatShortDateTime(d: Date): string {
  return `${formatShortDate(d)}, ${formatTime(d)}`
}

function Factor({
  label,
  weight,
  value,
  valueTone,
  limiting,
}: {
  label: string
  weight: number
  value: string
  valueTone?: string
  /** Es el factor que más baja el puntaje (se marca solo si de verdad resta) */
  limiting?: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">
          {label}
        </span>
        <span className={cx('font-mono text-sm text-ink', valueTone)}>{value}</span>
      </div>
      {limiting && <p className="mt-1 text-xs text-caution">Es lo que más limita este plan</p>}
      <span className="sr-only">Peso en el índice: {Math.round(weight * 100)} %.</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ahora
// ---------------------------------------------------------------------------

function Now({ p, index }: { p: SiteView; index: number }) {
  const d = p.data
  const lit = p.lit[index]
  const contact = p.contact[index]
  const toLight = nextChange(p.lit, index)
  const toContact = nextChange(p.contact, index)
  const date = sampleTime(d, index)
  const maxSlope = d.slope.max100mDeg
  // Relieve en la dirección del Sol (LOLA), antenas de la DSN que ven la Luna y eclipse en curso (datos de D1).
  const ridge = sunBlocker(d, index)
  const ridgeIsCrest = ridge.elevationDeg > 0 && ridge.distanceKm !== null
  const stationIds = dsnStationsAt(d, index)
  const stationNames = d.dsn?.stations.filter((s) => stationIds.includes(s.id)).map((s) => s.name.split(' (')[0]) ?? []
  const eclipsePct = lit ? Math.round(eclipseFraction(d, index) * 100) : 0

  return (
    <Panel label={`Ahora · ${formatDateTime(date)}`}>
      <StatGrid>
        <Stat
          label="Sol"
          value={`${d.sun.el[index].toFixed(2)}°`}
          tone={lit ? 'sun' : 'neutral'}
          detail={lit ? 'Visible' : 'Tapado por el relieve'}
          hint="Altura del Sol sobre el horizonte plano. En el polo sur casi nunca pasa de 2°: por eso un cerro cercano puede taparlo."
        />
        <Stat
          label="Tierra"
          value={`${d.earth.el[index].toFixed(2)}°`}
          tone={contact ? 'earth' : 'neutral'}
          detail={contact ? 'Con contacto' : 'Sin contacto directo'}
          hint="Altura de la Tierra sobre el horizonte. Si el relieve la tapa, no hay comunicación directa."
        />
        <Stat
          label="Relieve hacia el Sol"
          value={`${ridge.elevationDeg.toFixed(2)}°`}
          detail={ridgeIsCrest ? `Cresta a ${ridge.distanceKm!.toFixed(1)} km · ${compassPoint(ridge.azimuthDeg)}` : `Terreno bajo · ${compassPoint(ridge.azimuthDeg)}`}
          hint="Altura del relieve en la dirección del Sol y distancia a la cresta que limita la vista, calculadas con el relieve LOLA. Si el Sol está por debajo de este valor, no hay luz."
        />
        {d.dsn && (
          <Stat
            label="Antenas DSN"
            value={`${stationIds.length} de ${d.dsn.stations.length}`}
            tone={contact && stationIds.length > 0 ? 'earth' : 'neutral'}
            detail={stationNames.length ? stationNames.join(', ') : 'Ninguna ve la Luna'}
            hint={`Antenas de 70 m de la Red de Espacio Profundo de NASA que ven la Luna a más de ${d.dsn.minElevationDeg}° sobre su horizonte (JPL Horizons). El simulador todavía supone que siempre hay una disponible.`}
          />
        )}
        {eclipsePct > 0 && (
          <Stat
            label="Eclipse"
            value={`${eclipsePct} %`}
            tone="sun"
            detail="La Tierra tapa el Sol"
            hint="Vista desde la Luna, la Tierra pasa delante del Sol (en la Tierra se ve un eclipse de Luna). Durante el eclipse, el panel genera menos energía."
          />
        )}
        <Stat
          label={lit ? 'Sombra en' : 'Luz en'}
          value={toLight === null ? '—' : formatDuration(toLight * d.stepHours)}
          detail={toLight === null ? 'Sin cambios en el periodo' : lit ? 'El Sol se oculta' : 'Vuelve el Sol'}
        />
        <Stat
          label={contact ? 'Sin contacto en' : 'Contacto en'}
          value={toContact === null ? '—' : formatDuration(toContact * d.stepHours)}
          detail={toContact === null ? 'Sin cambios en el periodo' : contact ? 'Se pierde la Tierra' : 'Vuelve la Tierra'}
        />
        <Stat
          label="Pendiente"
          value={`${d.slope.atSiteDeg.toFixed(1)}°`}
          detail="En el punto de alunizaje"
          hint="Inclinación del suelo. Los módulos de alunizaje suelen necesitar menos de 8 a 10°."
        />
        <Stat
          label="Pend. máx."
          value={`${maxSlope.toFixed(1)}°`}
          tone={maxSlope > 8 ? 'critical' : maxSlope > 5 ? 'caution' : 'neutral'}
          detail="En 100 m a la redonda"
        />
      </StatGrid>
    </Panel>
  )
}
