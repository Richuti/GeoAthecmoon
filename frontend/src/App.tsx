import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { HorizonStrip } from './components/HorizonStrip'
import { SiteSelector } from './components/SiteSelector'
import { Story } from './components/Story'
import { ViewerPanel } from './components/ViewerPanel'
import { WindowsBar } from './components/WindowsBar'
import { Badge, Button, EmptyState, InfoTip, Panel, Segmented, Slider, Stat, StatGrid, cx, type Tone } from './components/ui'
import { formatLat, formatLon } from './lib/format'
import { dayNumber, formatDate, formatDateTime, formatDuration, formatShortDate, formatTime, sampleTime, totalDays } from './lib/time'
import { missionWindow, recommend, type Recommendation } from './lib/recommend'
import { storyFacts } from './lib/storyFacts'
import { DEFAULT_WEIGHTS, VERDICT_LABEL, siteViability, type Verdict, type ViabilityResult } from './lib/viability'
import { nextChange, visibility } from './lib/visibility'
import {
  DEFAULT_PRESET,
  PARAMETER_RANGES,
  PRESETS,
  autonomyHours,
  minSunFraction,
  panelPeakW,
  type LanderConfig,
  type PresetId,
} from './sim/lander'
import { useAppState, type Speed } from './state'
import type { SiteData } from './types'

const MODES = [
  { value: 'explore', label: 'Explorar sitio' },
  { value: 'simulate', label: 'Simular misión' },
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

  if (view === 'story') return <Story facts={facts} onOpen={() => (window.location.hash = 'planificador')} />
  return <Planner />
}

function Planner() {
  const { state, actions } = useAppState()
  const { sites, selectedId, index: i, mode } = state

  const { missionDays } = state

  // Visibilidad de cada sitio cargado: se calcula una vez por sitio.
  const contexts = useMemo(() => Object.values(state.data).map((data) => ({ data, vis: visibility(data) })), [state.data])

  // Viabilidad de una misión de `missionDays` días que empieza en la fecha de la línea de tiempo.
  const views = useMemo(() => {
    const out: Record<string, SiteView> = {}
    for (const { data, vis } of contexts) {
      const result = siteViability(data, vis, DEFAULT_WEIGHTS, missionWindow(data, i, missionDays))
      out[data.site.id] = {
        data,
        lit: vis.lit,
        contact: vis.contact,
        lightPct: result.factors.light.score,
        contactPct: result.factors.contact.score,
        result,
        viability: result.score,
      }
    }
    return out
  }, [contexts, i, missionDays])

  const current = contexts.find((c) => c.data.site.id === selectedId)
  const rec = useMemo(
    () => (current ? recommend(current, contexts, { startIndex: i, missionDays }) : null),
    [current, contexts, i, missionDays],
  )
  const p = selectedId ? views[selectedId] : undefined
  const siteError = selectedId ? state.dataErrors[selectedId] : undefined

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
        <Brand />
        <Segmented label="Modo" options={MODES} value={mode} onChange={actions.setMode} />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {p?.data.sources?.ephemeris === 'jpl-horizons' && <Badge>Sol y Tierra: JPL Horizons (NASA)</Badge>}
          {p?.data.sources?.terrain === 'synthetic' && <Badge tone="caution">Terreno de prueba</Badge>}
        </div>
      </header>

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
          <HorizonStrip
            title={`${p.data.site.name} · ${formatLat(p.data.site.lat)}, ${formatLon(p.data.site.lon)}`}
            horizon={p.data.horizon.elevationDeg}
            sun={{ az: p.data.sun.az[i], el: p.data.sun.el[i], visible: p.lit[i] }}
            earth={{ az: p.data.earth.az[i], el: p.data.earth.el[i], visible: p.contact[i] }}
            sunTrack={p.data.sun}
            earthTrack={p.data.earth}
          />

          <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 p-3 pt-5 sm:p-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)_22rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_24rem]">
            <SiteSelector
              sites={sites}
              selectedId={p.data.site.id}
              summaries={views}
              errors={state.dataErrors}
              onSelect={actions.select}
            />

            <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
              <ViewerPanel data={p.data} index={i} contact={p.contact[i]} />
              <Timeline
                p={p}
                index={i}
                playing={state.playing}
                speed={state.speed}
                onIndex={actions.setIndex}
                onTogglePlay={actions.togglePlay}
                onSpeed={actions.setSpeed}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
              {mode === 'explore' ? (
                <>
                  {rec && (
                    <Viability
                      p={p}
                      rec={rec}
                      missionDays={missionDays}
                      onMissionDays={actions.setMissionDays}
                      onSelect={actions.select}
                      onSeek={actions.setIndex}
                    />
                  )}
                  <Now p={p} index={i} />
                </>
              ) : (
                <>
                  <MissionSetup
                    landingDate={sampleTime(p.data, i)}
                    missionDays={missionDays}
                    maxDays={totalDays(p.data, p.data.sun.el.length)}
                    onMissionDays={actions.setMissionDays}
                  />
                  <Panel label="Resultado de la misión">
                    <EmptyState title="Todavía no simulaste esta misión">
                      Elige un módulo, ajusta sus valores y pulsa «Simular misión» para ver si sobrevive hora por hora.
                    </EmptyState>
                  </Panel>
                </>
              )}
            </div>
          </main>
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
        <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.03em]">GeoAthectum</p>
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
}: {
  p: SiteView
  index: number
  playing: boolean
  speed: Speed
  onIndex: (i: number) => void
  onTogglePlay: () => void
  onSpeed: (v: Speed) => void
}) {
  const n = p.data.sun.el.length
  const date = sampleTime(p.data, index)
  const day = dayNumber(p.data, index)
  const days = totalDays(p.data, n)
  const fill = (index / (n - 1)) * 100

  return (
    <Panel label="Línea de tiempo">
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
          Día {day} de {days}
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
        min={0}
        max={n - 1}
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
          onSeek={onIndex}
        />
      </div>
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

// ---------------------------------------------------------------------------
// Simulador: configuración (el motor llega en S2)
// ---------------------------------------------------------------------------

const PRESET_OPTIONS = (Object.keys(PRESETS) as PresetId[]).map((id) => ({ value: id, label: PRESETS[id].label }))

function MissionSetup({
  landingDate,
  missionDays,
  maxDays,
  onMissionDays,
}: {
  landingDate: Date
  missionDays: number
  maxDays: number
  onMissionDays: (days: number) => void
}) {
  const [preset, setPreset] = useState<PresetId>(DEFAULT_PRESET)
  const [cfg, setCfg] = useState<LanderConfig>(PRESETS[DEFAULT_PRESET].config)
  const set = (key: keyof LanderConfig) => (v: number) => setCfg((c) => ({ ...c, [key]: v }))
  const range = (key: keyof LanderConfig) => PARAMETER_RANGES[key]
  const peak = panelPeakW(cfg)
  const minSun = minSunFraction(cfg)

  return (
    <Panel label="Configurar misión">
      <Field label="Módulo">
        <Segmented
          label="Módulo"
          size="sm"
          className="w-full"
          options={PRESET_OPTIONS}
          value={preset}
          onChange={(id) => {
            setPreset(id)
            setCfg(PRESETS[id].config)
          }}
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{PRESETS[preset].description}</p>
      </Field>

      <div className="mt-5 flex flex-col gap-4">
        <p className="instrument-label">Energía</p>
        <Slider label="Área del panel" unit="m²" tone="sun" {...range('panelAreaM2')} value={cfg.panelAreaM2} onChange={set('panelAreaM2')}
          format={(v) => v.toFixed(2)} hint="Superficie de celdas solares. Más área, más energía." />
        <Slider label="Eficiencia del panel" unit="%" tone="sun" {...range('panelEfficiency')} value={cfg.panelEfficiency}
          onChange={set('panelEfficiency')} format={(v) => (v * 100).toFixed(0)} hint="Qué parte de la luz se convierte en electricidad. Las celdas espaciales rondan el 30 %." />
        <Slider label="Batería" unit="kWh" tone="sun" {...range('batteryKWh')} value={cfg.batteryKWh} onChange={set('batteryKWh')}
          format={(v) => v.toFixed(1)} hint="Energía guardada para pasar las horas sin Sol. Nunca baja del 20 %." />
        <Slider label="Consumo de supervivencia" unit="W" {...range('baseLoadW')} value={cfg.baseLoadW} onChange={set('baseLoadW')}
          hint="Lo mínimo para no congelarse: calefactores y computadora. Nunca se apaga." />
        <Slider label="Consumo de instrumentos" unit="W" {...range('instrumentLoadW')} value={cfg.instrumentLoadW} onChange={set('instrumentLoadW')}
          hint="Lo que gastan los instrumentos. Se apagan si la batería baja del umbral de supervivencia." />

        <dl className="grid grid-cols-3 gap-3 border-y border-seam py-3">
          <Derived label="Potencia pico" value={`${Math.round(peak)} W`} tone="text-sun" />
          <Derived label="Autonomía sin Sol" value={formatDuration(autonomyHours(cfg))} />
          <Derived label="Sol necesario" value={Number.isFinite(minSun) ? `${Math.round(minSun * 100)} %` : 'No alcanza'}
            tone={Number.isFinite(minSun) ? undefined : 'text-critical'} />
        </dl>

        <p className="mt-1 instrument-label">Datos</p>
        <Slider label="Datos generados" unit="Mb/día" tone="earth" {...range('dataPerDayMb')} value={cfg.dataPerDayMb}
          onChange={set('dataPerDayMb')} format={(v) => v.toLocaleString('es')} hint="Cuántos datos producen los instrumentos por día." />
        <Slider label="Velocidad de envío" unit="Mb/h" tone="earth" {...range('downlinkMbPerHour')} value={cfg.downlinkMbPerHour}
          onChange={set('downlinkMbPerHour')} format={(v) => v.toLocaleString('es')} hint="Datos que se envían por hora mientras se ve la Tierra." />

        <p className="mt-1 instrument-label">Misión</p>
        <Slider label="Duración" unit="días" min={1} max={maxDays} value={missionDays} onChange={onMissionDays} />
        <p className="text-sm text-ink-muted">
          Alunizaje: <span className="font-mono text-ink">{formatDateTime(landingDate)}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">Cámbialo moviendo la línea de tiempo.</span>
        </p>
      </div>

      <ul className="mt-5 flex flex-col gap-1.5 text-xs leading-relaxed text-ink-faint">
        <Note>Valores ilustrativos: no corresponden a ningún módulo real.</Note>
        <Note>Se asume una estación de la DSN siempre disponible cuando se ve la Tierra.</Note>
        <Note>La batería no baja del 20 % (profundidad de descarga del 80 %).</Note>
      </ul>

      <Button variant="primary" size="lg" className="mt-6 w-full" disabled>
        Simular misión
      </Button>
      <p className="mt-2 text-center text-xs text-ink-faint">Se activa en el paso S2 (motor de simulación).</p>
    </Panel>
  )
}

function Derived({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="instrument-label text-[0.625rem]">{label}</dt>
      <dd className={cx('mt-1 font-mono text-sm text-ink', tone)}>{value}</dd>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-caution" />
      {children}
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 instrument-label">{label}</p>
      {children}
    </div>
  )
}
