// Layout final de GeoAthectum (paso C0). Los datos y cálculos vienen de src/design/preview.ts, que es
// temporal: las tareas 4, 5 y S1 lo reemplazan sin cambiar este layout.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { HorizonStrip } from './components/HorizonStrip'
import { WindowsBar } from './components/WindowsBar'
import { Badge, Button, EmptyState, InfoTip, Panel, Segmented, Slider, Stat, StatGrid, cx, type Tone } from './components/ui'
import {
  PRESETS,
  WEIGHTS,
  firstGoodIndex,
  formatDate,
  formatDuration,
  formatLat,
  formatLon,
  formatTime,
  sampleDate,
  stepsUntilChange,
  usePreviewData,
  type LanderPreview,
  type PresetId,
  type SitePreview,
} from './design/preview'
import type { Site, SiteCategory } from './types'

type Mode = 'explore' | 'simulate'
type Speed = '1' | '6' | '24'

const MODES = [
  { value: 'explore', label: 'Explorar sitio' },
  { value: 'simulate', label: 'Simular misión' },
] as const

const SPEEDS = [
  { value: '1', label: '1 h/s' },
  { value: '6', label: '6 h/s' },
  { value: '24', label: '1 d/s' },
] as const

const CATEGORY_LABEL: Record<SiteCategory, string> = {
  artemis: 'Artemis',
  clps: 'CLPS',
  apollo: 'Apolo',
  international: 'Internacional',
  custom: 'Personalizados',
}

export default function App() {
  const { sites, previews, error } = usePreviewData()
  const [siteId, setSiteId] = useState('shackleton-rim')
  const [mode, setMode] = useState<Mode>('explore')
  const [index, setIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('6')

  const p = previews[siteId]
  const n = p?.data.sun.el.length ?? 0
  const i = Math.min(index ?? (p ? firstGoodIndex(p) : 0), Math.max(0, n - 1))

  // Reproducción: avanza `speed` horas por segundo.
  useEffect(() => {
    if (!playing || !p) return
    const perSecond = Number(speed) / p.data.stepHours
    const id = window.setInterval(() => {
      setIndex((prev) => {
        const next = (prev ?? firstGoodIndex(p)) + 1
        if (next >= n - 1) setPlaying(false)
        return Math.min(next, n - 1)
      })
    }, 1000 / perSecond)
    return () => window.clearInterval(id)
  }, [playing, speed, p, n])

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
        <Brand />
        <Segmented label="Modo" options={MODES} value={mode} onChange={setMode} />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {p?.data.sources?.ephemeris === 'jpl-horizons' && (
            <Badge>Sol y Tierra: JPL Horizons (NASA)</Badge>
          )}
          {p?.data.sources?.terrain === 'synthetic' && <Badge tone="caution">Terreno de prueba</Badge>}
        </div>
      </header>

      {error ? (
        <EmptyState title="No hay datos para mostrar">{error}</EmptyState>
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
            <SiteList
              sites={sites}
              previews={previews}
              selected={siteId}
              onSelect={(id) => {
                setSiteId(id)
                setIndex(null)
                setPlaying(false)
              }}
            />

            <div className="flex min-h-0 min-w-0 flex-col gap-5">
              <Viewer p={p} />
              <Timeline
                p={p}
                index={i}
                playing={playing}
                speed={speed}
                onIndex={(k) => setIndex(k)}
                onPlaying={setPlaying}
                onSpeed={setSpeed}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-5 *:shrink-0 lg:overflow-y-auto lg:pt-2 lg:pr-0.5">
              {mode === 'explore' ? (
                <>
                  <Viability p={p} previews={previews} onSelect={setSiteId} />
                  <Now p={p} index={i} />
                </>
              ) : (
                <>
                  <MissionSetup landingDate={sampleDate(p.data, i)} />
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
// Sitios
// ---------------------------------------------------------------------------

function SiteList({
  sites,
  previews,
  selected,
  onSelect,
}: {
  sites: Site[]
  previews: Record<string, SitePreview>
  selected: string
  onSelect: (id: string) => void
}) {
  const groups: Array<[SiteCategory, Site[]]> = []
  for (const s of sites) {
    const g = groups.find(([c]) => c === s.category)
    if (g) g[1].push(s)
    else groups.push([s.category, [s]])
  }

  return (
    <Panel
      label={`Sitios · ${sites.length}`}
      className="max-lg:max-h-80"
      bodyClassName="overflow-y-auto p-2"
      actions={
        <InfoTip label="Viabilidad de cada sitio" align="end">
          El número es la viabilidad de todo el periodo. Las barras muestran el % del tiempo con luz (ámbar) y con contacto
          con la Tierra (azul).
        </InfoTip>
      }
    >
      <nav aria-label="Sitios de alunizaje" className="flex flex-col gap-3">
        {groups.map(([category, list]) => (
          <div key={category}>
            <h3 className="instrument-label px-3 pb-1 pt-1">
              {CATEGORY_LABEL[category]}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {list.map((s) => {
                const pv = previews[s.id]
                const active = s.id === selected
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => onSelect(s.id)}
                      className={cx(
                        'flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors duration-150',
                        active ? 'bg-hull-raised shadow-[inset_2px_0_0_var(--color-ink)]' : 'hover:bg-hull-raised/60',
                      )}
                    >
                      <span className="flex w-full items-baseline justify-between gap-2">
                        <span className={cx('text-sm font-medium', active ? 'text-ink' : 'text-ink-muted')}>{s.name}</span>
                        {pv && <span className="font-mono text-xs text-ink">{Math.round(pv.viability)}%</span>}
                      </span>
                      <span className="font-mono text-[0.625rem] text-ink-faint">
                        {formatLat(s.lat)} · {formatLon(s.lon)}
                      </span>
                      {pv && (
                        <span className="mt-0.5 grid grid-cols-2 gap-1.5" aria-hidden>
                          <MiniBar pct={pv.lightPct} className="bg-sun" />
                          <MiniBar pct={pv.contactPct} className="bg-earth" />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </Panel>
  )
}

function MiniBar({ pct, className }: { pct: number; className: string }) {
  return (
    <span className="block h-0.5 overflow-hidden bg-seam">
      <span className={cx('block h-full opacity-80', className)} style={{ width: `${pct}%` }} />
    </span>
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
      className="min-h-[19rem] flex-1 lg:min-h-[17rem]"
      bodyClassName="flex flex-col justify-between p-0"
    >
      <div className="p-5 sm:p-6">
        <Badge>{CATEGORY_LABEL[s.category]}</Badge>
        <h1 className="mt-3 max-w-2xl font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-[0.01em] sm:text-6xl">
          {s.name}
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-muted">
          {formatLat(s.lat)} · {formatLon(s.lon)}
        </p>
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
  onPlaying,
  onSpeed,
}: {
  p: SitePreview
  index: number
  playing: boolean
  speed: Speed
  onIndex: (i: number) => void
  onPlaying: (v: boolean) => void
  onSpeed: (v: Speed) => void
}) {
  const n = p.data.sun.el.length
  const date = sampleDate(p.data, index)
  const day = Math.floor((index * p.data.stepHours) / 24) + 1
  const totalDays = Math.round((n * p.data.stepHours) / 24)
  const fill = (index / (n - 1)) * 100

  return (
    <Panel label="Línea de tiempo">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button
          variant="primary"
          size="md"
          className="w-10 px-0"
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={() => onPlaying(!playing)}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-lg tracking-tight text-ink">{formatDate(date)}</span>
          <span className="font-mono text-lg tracking-tight text-ink-muted">{formatTime(date)} UTC</span>
        </div>
        <span className="font-mono text-xs text-ink-faint">
          Día {day} de {totalDays}
        </span>
        <Segmented label="Velocidad" size="sm" className="sm:ml-auto" options={SPEEDS} value={speed} onChange={onSpeed} />
      </div>
      <input
        type="range"
        aria-label="Fecha y hora"
        aria-valuetext={`${formatDate(date)}, ${formatTime(date)} UTC`}
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

function verdict(v: number): { label: string; tone: Tone } {
  if (v >= 70) return { label: 'Buena', tone: 'ok' }
  if (v >= 50) return { label: 'Aceptable', tone: 'caution' }
  return { label: 'Difícil', tone: 'critical' }
}

function explain(p: SitePreview): string {
  const l = Math.round(p.lightPct)
  const c = Math.round(p.contactPct)
  const light = l >= 70 ? 'Mucha luz' : l >= 50 ? 'Luz media' : 'Poca luz'
  const contact = c >= 60 ? 'buen contacto' : c >= 40 ? 'contacto parcial' : 'poco contacto'
  const slope = p.data.slope.max100mDeg <= 5 ? 'terreno suave' : 'pendiente fuerte'
  return `${light} (${l} % del tiempo), ${contact} con la Tierra (${c} %) y ${slope}.`
}

function Viability({
  p,
  previews,
  onSelect,
}: {
  p: SitePreview
  previews: Record<string, SitePreview>
  onSelect: (id: string) => void
}) {
  const v = Math.round(p.viability)
  const vd = verdict(v)
  const best = Object.values(previews)
    .filter((o) => o.data.site.id !== p.data.site.id)
    .sort((a, b) => b.viability - a.viability)[0]
  const better = best && best.viability > p.viability + 0.5

  return (
    <Panel
      label="Viabilidad del periodo"
      actions={
        <InfoTip label="Viabilidad" align="end">
          Combina el % de tiempo con luz solar, el % con contacto directo con la Tierra y la pendiente del terreno. Más
          adelante podrás ajustar cuánto pesa cada uno.
        </InfoTip>
      }
    >
      <div className="flex items-end gap-3">
        <p className="flex items-baseline">
          <span className="font-display text-8xl font-black leading-[0.8]">{v}</span>
          <span className="ml-1 font-display text-3xl font-bold text-ink-muted">%</span>
        </p>
        <Badge tone={vd.tone} className="mb-1">
          {vd.label}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{explain(p)}</p>

      <div className="mt-5 flex flex-col gap-3.5">
        <Factor label="Luz solar" weight={WEIGHTS.light} value={`${Math.round(p.lightPct)} %`} pct={p.lightPct} bar="bg-sun" />
        <Factor
          label="Contacto con la Tierra"
          weight={WEIGHTS.contact}
          value={`${Math.round(p.contactPct)} %`}
          pct={p.contactPct}
          bar="bg-earth"
        />
        <Factor
          label="Pendiente"
          weight={WEIGHTS.slope}
          value={`${p.data.slope.max100mDeg.toFixed(1)}° máx.`}
          pct={p.slopeScore}
          bar="bg-ink-muted"
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

function Factor({ label, weight, value, pct, bar }: { label: string; weight: number; value: string; pct: number; bar: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">
          {label} <span className="font-mono text-[0.625rem] text-ink-faint">×{weight.toFixed(2)}</span>
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
  const toLight = stepsUntilChange(p.lit, index)
  const toContact = stepsUntilChange(p.contact, index)
  const date = sampleDate(d, index)
  const maxSlope = d.slope.max100mDeg

  return (
    <Panel label={`Ahora · ${formatDate(date)}, ${formatTime(date)} UTC`}>
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
          Alunizaje: <span className="font-mono text-ink">{formatDate(landingDate)}, {formatTime(landingDate)} UTC</span>
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
