import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { HorizonStrip } from './components/HorizonStrip'
import { SiteSelector } from './components/SiteSelector'
import { WindowsBar } from './components/WindowsBar'
import { Badge, Button, EmptyState, InfoTip, Panel, Segmented, Slider, Stat, StatGrid, cx, type Tone } from './components/ui'
import {
  PRESETS,
  buildPreview,
  type LanderPreview,
  type PresetId,
  type SitePreview,
} from './design/preview'
import { formatCoords, formatLat, formatLon } from './lib/format'
import { CATEGORY_LABEL } from './lib/sites'
import { dayNumber, formatDate, formatDateTime, formatDuration, formatTime, sampleTime, totalDays } from './lib/time'
import { VERDICT_LABEL, type Verdict } from './lib/viability'
import { nextChange } from './lib/visibility'
import { useAppState, type Speed } from './state'

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

export default function App() {
  const { state, actions } = useAppState()
  const { sites, selectedId, index: i, mode } = state

  // Un preview por sitio cargado. Se recalcula solo cuando llega un sitio nuevo.
  const previews = useMemo(
    () => Object.fromEntries(Object.values(state.data).map((d) => [d.site.id, buildPreview(d)])) as Record<string, SitePreview>,
    [state.data],
  )
  const p = selectedId ? previews[selectedId] : undefined
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
              summaries={previews}
              errors={state.dataErrors}
              onSelect={actions.select}
            />

            <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
              <Viewer p={p} />
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
                  <Viability p={p} previews={previews} onSelect={actions.select} />
                  <Now p={p} index={i} />
                </>
              ) : (
                <>
                  <MissionSetup landingDate={sampleTime(p.data, i)} />
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
    <div className="flex items-center gap-3">
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
    </div>
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

function Viewer({ p }: { p: SitePreview }) {
  const s = p.data.site
  return (
    <Panel
      label={`Terreno 3D · ${p.data.terrain?.extentKm ?? 20} × ${p.data.terrain?.extentKm ?? 20} km`}
      className="min-h-[19rem] flex-1 lg:min-h-fit"
      bodyClassName="flex flex-col justify-between p-0"
    >
      <div className="p-5 sm:p-6">
        <Badge>{CATEGORY_LABEL[s.category]}</Badge>
        <h1 className="mt-3 max-w-2xl font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-[0.01em] sm:text-6xl lg:text-5xl xl:text-6xl">
          {s.name}
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-muted">{formatCoords(s)}</p>
        {s.description && <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{s.description}</p>}
      </div>
      <div className="flex items-start gap-3 border-t border-dashed border-seam px-5 py-4 sm:px-6">
        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-faint" />
        <p className="text-sm leading-relaxed text-ink-muted">
          <span className="text-ink">El modelo 3D de este sitio todavía no está listo.</span> Mientras tanto, la franja
          de horizonte muestra lo que verías girando 360° desde el sitio.
        </p>
      </div>
    </Panel>
  )
}

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
  p: SitePreview
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
  previews,
  onSelect,
}: {
  p: SitePreview
  previews: Record<string, SitePreview>
  onSelect: (id: string) => void
}) {
  const r = p.result
  const v = Math.round(r.score)
  // Se marca el factor que más resta solo si de verdad pesa (igual que en el resumen).
  const limit = r.factors[r.limiting].lost >= 5 ? r.limiting : null
  const best = Object.values(previews)
    .filter((o) => o.data.site.id !== p.data.site.id)
    .sort((a, b) => b.viability - a.viability)[0]
  const better = best && best.viability > p.viability + 0.5

  return (
    <Panel
      label="Viabilidad del periodo"
      actions={
        <InfoTip label="Viabilidad" align="end">
          Combina el % de tiempo con luz solar, el % con contacto directo con la Tierra y la pendiente del terreno
          (hasta 5° es cómoda; desde 10° la mayoría de los módulos no puede alunizar). El número junto a cada factor es
          cuánto pesa.
        </InfoTip>
      }
    >
      <div className="flex items-end gap-3">
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

      {better && (
        <div className="mt-5 border-t border-seam pt-4">
          <p className="instrument-label">Mejor alternativa</p>
          <p className="mt-1.5 text-sm text-ink-muted">
            <span className="text-ink">{best.data.site.name}</span> llega a{' '}
            <span className="font-mono text-ink">{Math.round(best.viability)} %</span> en el mismo periodo.
          </p>
          <Button size="sm" className="mt-3" onClick={() => onSelect(best.data.site.id)}>
            Ver {best.data.site.name}
          </Button>
        </div>
      )}
    </Panel>
  )
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

function Now({ p, index }: { p: SitePreview; index: number }) {
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

function MissionSetup({ landingDate }: { landingDate: Date }) {
  const [preset, setPreset] = useState<PresetId>('light')
  const [cfg, setCfg] = useState<LanderPreview>(PRESETS.light.config)
  const set = (key: keyof LanderPreview) => (v: number) => setCfg((c) => ({ ...c, [key]: v }))

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
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-caution" />
          Valores ilustrativos: no corresponden a ningún módulo real.
        </p>
      </Field>

      <div className="mt-5 flex flex-col gap-4">
        <p className="instrument-label">Energía</p>
        <Slider label="Panel solar" unit="W" tone="sun" min={50} max={1500} step={10} value={cfg.panelPeakW} onChange={set('panelPeakW')}
          hint="Potencia que entrega el panel con el Sol de frente y sin sombra." />
        <Slider label="Batería" unit="kWh" tone="sun" min={0.5} max={20} step={0.5} value={cfg.batteryKWh} onChange={set('batteryKWh')}
          format={(v) => v.toFixed(1)} hint="Energía guardada para pasar las horas sin Sol." />
        <Slider label="Consumo de supervivencia" unit="W" min={10} max={400} step={5} value={cfg.baseLoadW} onChange={set('baseLoadW')}
          hint="Lo mínimo para no congelarse: calefactores y computadora. Nunca se apaga." />
        <Slider label="Consumo de instrumentos" unit="W" min={0} max={600} step={5} value={cfg.instrumentLoadW} onChange={set('instrumentLoadW')}
          hint="Lo que gastan los instrumentos científicos. Se apagan si la batería baja demasiado." />

        <p className="mt-1 instrument-label">Datos</p>
        <Slider label="Datos generados" unit="Mb/día" tone="earth" min={100} max={10000} step={100} value={cfg.dataPerDayMb}
          onChange={set('dataPerDayMb')} format={(v) => v.toLocaleString('es')} hint="Cuántos datos producen los instrumentos por día." />
        <Slider label="Velocidad de envío" unit="Mb/h" tone="earth" min={50} max={2000} step={50} value={cfg.downlinkMbPerHour}
          onChange={set('downlinkMbPerHour')} format={(v) => v.toLocaleString('es')} hint="Datos que se envían por hora mientras se ve la Tierra." />

        <p className="mt-1 instrument-label">Misión</p>
        <Slider label="Duración" unit="días" min={1} max={30} value={cfg.missionDays} onChange={set('missionDays')} />
        <p className="text-sm text-ink-muted">
          Alunizaje: <span className="font-mono text-ink">{formatDateTime(landingDate)}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">Cámbialo moviendo la línea de tiempo.</span>
        </p>
      </div>

      <Button variant="primary" size="lg" className="mt-6 w-full" disabled>
        Simular misión
      </Button>
      <p className="mt-2 text-center text-xs text-ink-faint">Se activa en el paso S2 (motor de simulación).</p>
    </Panel>
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
