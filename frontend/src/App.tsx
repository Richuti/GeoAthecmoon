import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { HorizonStrip } from './components/HorizonStrip'
import { SiteSelector } from './components/SiteSelector'
import { Help } from './components/Help'
import { SkyPlot } from './components/SkyPlot'
import { dataNotice } from './api'
import { Sources } from './components/Sources'
import { SimulatorWorkspace } from './components/sim/SimulatorWorkspace'
import { Story } from './components/Story'
import { ViewerPanel } from './components/ViewerPanel'
import { WindowsBar } from './components/WindowsBar'
import { Badge, Button, InfoTip, Panel, Segmented, Stat, StatGrid, cx, type Tone } from './components/ui'
import { formatLat, formatLon } from './lib/format'
import { dayNumber, formatDate, formatDateTime, formatDuration, formatShortDate, formatTime, fromInputValue, indexAt, sampleTime, samplesFor, totalDays } from './lib/time'
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
  { value: 'explore', label: 'Explorar sitio' },
  { value: 'simulate', label: 'Simulador' },
] as const

type SpeedKey = '1' | '6' | '24'
const SPEEDS = [
  { value: '1', label: '1 h/s' },
  { value: '6', label: '6 h/s' },
  { value: '24', label: '1 d/s' },
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
  useEffect(() => {
    const onHash = () => {
      setView(viewFromUrl())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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

  const [preset, setPreset] = useState<PresetId | null>(DEFAULT_PRESET)
  const [cfg, setCfg] = useState<LanderConfig>(PRESETS[DEFAULT_PRESET].config)
  const [landing, setLanding] = useState<number | null>(null)
  const [draftStart, setDraftStart] = useState<number | null>(null)
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
    <div className={cx('flex min-h-dvh flex-col', mode === 'explore' && 'lg:h-dvh')}>
      <header className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
        <Brand />
        <Segmented label="Modo" options={MODES} value={mode} onChange={actions.setMode} />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {p && !notice && <Badge>Datos reales · JPL Horizons y LOLA (NASA)</Badge>}
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
        <>
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
          ) : <>
            <HorizonStrip
              title={`${p.data.site.name} · ${formatLat(p.data.site.lat)}, ${formatLon(p.data.site.lon)}`}
              horizon={p.data.horizon.elevationDeg}
              sun={{ az: p.data.sun.az[i], el: p.data.sun.el[i], visible: p.lit[i] }}
              earth={{ az: p.data.earth.az[i], el: p.data.earth.el[i], visible: p.contact[i] }}
              sunTrack={p.data.sun} earthTrack={p.data.earth}
            />
            <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 p-3 pt-5 sm:p-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)_22rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_24rem]">
              <SiteSelector sites={sites} selectedId={p.data.site.id} summaries={views} errors={state.dataErrors} onSelect={actions.select} />
              <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
                <ViewerPanel data={p.data} index={i} contact={p.contact[i]} />
                <Timeline p={p} index={i} playing={state.playing} speed={state.speed} onIndex={seek} onTogglePlay={actions.togglePlay} onSpeed={actions.setSpeed} />
              </div>
              <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
                {rec && <Viability p={p} rec={rec} missionDays={missionDays} onMissionDays={actions.setMissionDays} onSelect={actions.select} onSeek={actions.setIndex} />}
                <SkyPlot
                  horizon={p.data.horizon.elevationDeg}
                  sun={{ az: p.data.sun.az[i], el: p.data.sun.el[i], visible: p.lit[i] }}
                  earth={{ az: p.data.earth.az[i], el: p.data.earth.el[i], visible: p.contact[i] }}
                  sunTrack={p.data.sun} earthTrack={p.data.earth}
                />
                <Now p={p} index={i} />
              </div>
            </main>
          </>}

        </>
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
    <a href="#inicio" title="Volver a la portada" className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--color-hull-raised)" />
        <circle cx="21" cy="15.5" r="3" fill="var(--color-sun)" />
        <path d="M3 22.5 L9 17.5 L12.5 20 L17 15.8 L22 19.5 L25.5 17.2 L29 19.8 L29 29 L3 29 Z" fill="var(--color-relief)" />
        <path
          d="M3 22.5 L9 17.5 L12.5 20 L17 15.8 L22 19.5 L25.5 17.2 L29 19.8"
          fill="none"
          stroke="var(--color-ink-faint)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.03em]">GEOATHECMOON</p>
        <p className="mt-0.5 text-[0.6875rem] text-ink-faint">Planificador de alunizaje · Polo sur lunar</p>
      </div>
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
    <Panel label={mission ? 'Reproducir misión' : 'Línea de tiempo'}>
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
        <Segmented
          label="Velocidad"
          size="sm"
          className="sm:ml-auto"
          options={SPEEDS}
          value={String(speed) as SpeedKey}
          onChange={(v) => onSpeed(Number(v) as Speed)}
        />
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
  missionDays,
  onMissionDays,
  onSelect,
  onSeek,
}: {
  p: SiteView
  rec: Recommendation
  missionDays: number
  onMissionDays: (days: number) => void
  onSelect: (id: string) => void
  onSeek: (index: number) => void
}) {
  const r = p.result
  const v = Math.round(r.score)
  // Se marca el factor que más resta solo si de verdad pesa (igual que en el resumen).
  const limit = r.factors[r.limiting].lost >= 5 ? r.limiting : null
  const from = sampleTime(p.data, rec.window.from)
  const to = sampleTime(p.data, rec.window.to)
  const lengthKey = String(missionDays)
  const lengths = MISSION_LENGTHS.some((o) => o.value === lengthKey)
    ? MISSION_LENGTHS
    : [...MISSION_LENGTHS, { value: lengthKey, label: `${missionDays} d` }]

  return (
    <Panel
      label="Viabilidad de la misión"
      actions={
        <InfoTip label="Viabilidad" align="end">
          Combina el % de tiempo con luz solar, el % con contacto directo con la Tierra y la pendiente del terreno
          (hasta 5° es cómoda; desde 10° la mayoría de los módulos no puede alunizar), durante los días de la misión.
          El número junto a cada factor es cuánto pesa. Mueve la línea de tiempo para cambiar la fecha de alunizaje.
        </InfoTip>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-xs leading-relaxed text-ink-muted">
          <span className="text-ink">{formatShortDateTime(from)}</span> → <span className="text-ink">{formatShortDateTime(to)}</span>
          {rec.window.shifted && <span className="block text-ink-faint">Se adelantó el inicio para que la misión entre en los datos.</span>}
        </p>
        <Segmented
          label="Duración de la misión"
          size="sm"
          options={lengths}
          value={lengthKey}
          onChange={(d) => onMissionDays(Number(d))}
        />
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p className="flex items-baseline">
          <span className="font-display text-8xl font-black leading-[0.8]">{v}</span>
          <span className="ml-1 font-display text-3xl font-bold text-ink-muted">%</span>
        </p>
        <Badge tone={VERDICT_TONE[r.verdict]} className="mb-1">
          {VERDICT_LABEL[r.verdict]}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r.summary}</p>
      {r.warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label="Avisos">
          {r.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-caution" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3.5">
        <Factor
          label="Luz solar"
          weight={r.factors.light.weight}
          value={`${Math.round(r.factors.light.score)} %`}
          pct={r.factors.light.score}
          bar="bg-sun"
          limiting={limit === 'light'}
        />
        <Factor
          label="Contacto con la Tierra"
          weight={r.factors.contact.weight}
          value={`${Math.round(r.factors.contact.score)} %`}
          pct={r.factors.contact.score}
          bar="bg-earth"
          limiting={limit === 'contact'}
        />
        <Factor
          label="Pendiente"
          weight={r.factors.slope.weight}
          value={`${p.data.slope.max100mDeg.toFixed(1)}° máx.`}
          pct={r.factors.slope.score}
          bar="bg-ink-muted"
          limiting={limit === 'slope'}
        />
      </div>

      <div className="mt-5 border-t border-seam pt-4">
        <p className="instrument-label">Recomendación</p>
        {rec.betterDate || rec.betterSite ? (
          <ul className="mt-2 flex flex-col gap-4">
            {rec.betterDate && rec.dateMessage && (
              <li>
                <p className="text-sm leading-relaxed text-ink-muted">{rec.dateMessage}</p>
                <Button size="sm" className="mt-2" onClick={() => onSeek(rec.betterDate!.startIndex)}>
                  Probar esa fecha
                </Button>
              </li>
            )}
            {rec.betterSite && rec.siteMessage && (
              <li>
                <p className="text-sm leading-relaxed text-ink-muted">{rec.siteMessage}</p>
                <Button size="sm" className="mt-2" onClick={() => onSelect(rec.betterSite!.siteId)}>
                  Ver {rec.betterSite.name}
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rec.message}</p>
        )}
      </div>
    </Panel>
  )
}

/** "18 ene, 06:00" para rangos cortos dentro del mismo periodo. */
function formatShortDateTime(d: Date): string {
  return `${formatShortDate(d)}, ${formatTime(d)}`
}

function Factor({
  label,
  weight,
  value,
  pct,
  bar,
  limiting,
}: {
  label: string
  weight: number
  value: string
  pct: number
  bar: string
  /** Es el factor que más baja el puntaje (se marca solo si de verdad resta) */
  limiting?: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">
          {label} <span className="font-mono text-[0.625rem] text-ink-faint">×{weight.toFixed(2)}</span>
          {limiting && <span className="ml-2 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-caution">Más resta</span>}
        </span>
        <span className="font-mono text-sm text-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden bg-hull-raised">
        <div className={cx('h-full', bar)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
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
