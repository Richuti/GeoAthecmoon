import type { ReactNode } from 'react'
import { formatDateTime, formatDuration, toInputValue } from '../../lib/time'
import {
  PARAMETER_RANGES,
  PRESETS,
  autonomyHours,
  minSunFraction,
  panelPeakW,
  type LanderConfig,
  type PresetId,
} from '../../sim/lander'
import { Button, cx, Panel, Slider } from '../ui'

const PRESET_OPTIONS = (Object.keys(PRESETS) as PresetId[]).map((id) => ({ value: id, label: PRESETS[id].label }))

export function MissionSetup({
  preset,
  cfg,
  onPreset,
  onCfg,
  missionDays,
  maxDays,
  onMissionDays,
  timelineDate,
  landingDate,
  minDate,
  maxDate,
  onDate,
  onSimulate,
}: {
  /** null si se cambió algún valor a mano */
  preset: PresetId | null
  cfg: LanderConfig
  onPreset: (id: PresetId) => void
  onCfg: (cfg: LanderConfig) => void
  missionDays: number
  maxDays: number
  onMissionDays: (days: number) => void
  /** Fecha de alunizaje elegida; es independiente del cursor de reproducción. */
  timelineDate: Date
  /** Alunizaje de la simulación actual, o null si todavía no se simuló */
  landingDate: Date | null
  minDate: Date
  maxDate: Date
  onDate: (value: string) => void
  onSimulate: () => void
}) {
  const set = (key: keyof LanderConfig) => (v: number) => onCfg({ ...cfg, [key]: v })
  const range = (key: keyof LanderConfig) => PARAMETER_RANGES[key]
  const peak = panelPeakW(cfg)
  const minSun = minSunFraction(cfg)

  return (
    <Panel label="Configurar misión">
      <details key={landingDate?.getTime() ?? 'initial'} open={landingDate === null}>
        <summary className="cursor-pointer text-sm leading-relaxed text-ink">
          {landingDate ? `${preset ? PRESETS[preset].label : 'Módulo personalizado'} · ${missionDays} días` : 'Elige tu módulo y la fecha'}
          {landingDate && <span className="mt-1 block text-xs text-ink-muted">{formatDateTime(timelineDate)} · Cambiar configuración</span>}
        </summary>
        <div className="mt-4">
          <label htmlFor="mission-module" className="mb-2 block text-sm text-ink-muted">Módulo</label>
          <select id="mission-module" value={preset ?? 'custom'}
            onChange={(e) => onPreset(e.target.value as PresetId)}
            className="min-h-11 w-full rounded-hw border border-seam-strong bg-hull px-3 text-sm text-ink">
            {!preset && <option value="custom" disabled>Personalizado</option>}
            {PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {preset ? PRESETS[preset].description : 'Valores ajustados a mano a partir de un preset.'}
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="mission-date" className="mb-2 block text-sm text-ink-muted">Fecha de alunizaje · UTC</label>
              <input id="mission-date" type="datetime-local" value={toInputValue(timelineDate)}
                min={toInputValue(minDate)} max={toInputValue(maxDate)} step={3600}
                onChange={(e) => { if (e.target.validity.valid && e.target.value) onDate(e.target.value) }}
                className="min-h-11 w-full min-w-0 rounded-hw border border-seam-strong bg-hull px-3 text-sm text-ink" />
            </div>
            <Slider label="Duración" unit="días" min={1} max={maxDays} value={missionDays} onChange={onMissionDays} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-seam py-3">
            <Derived label="Potencia solar" value={`${Math.round(peak)} W`} tone="text-sun" />
            <Derived label="Autonomía sin Sol" value={formatDuration(autonomyHours(cfg))} />
          </dl>

          <details className="mt-4 border-b border-seam pb-4">
            <summary className="cursor-pointer py-2 text-sm text-ink-muted hover:text-ink">Ajustar módulo · opciones avanzadas</summary>
            <div className="mt-4 flex flex-col gap-4">
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
              <Slider label="Entrar en supervivencia al" unit="%" {...range('survivalThreshold')} value={cfg.survivalThreshold}
                onChange={set('survivalThreshold')} format={(v) => Math.round(v * 100).toString()}
                hint="Al bajar de este nivel se apagan los instrumentos para ahorrar batería. Vuelven al superar el 60 %." />

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

            </div>
          </details>

          <ul className="mt-5 flex flex-col gap-1.5 text-xs leading-relaxed text-ink-faint">
            <Note>Valores ilustrativos: no corresponden a ningún módulo real.</Note>
            <Note>Se asume una estación de la DSN siempre disponible cuando se ve la Tierra.</Note>
            <Note>La batería no baja del 20 % (profundidad de descarga del 80 %).</Note>
          </ul>

          <div className="mt-5">
            <Button variant="primary" size="lg" className="w-full" onClick={onSimulate}>
              {landingDate === null ? 'Simular misión' : 'Volver a simular'}
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              {landingDate === null
                ? 'Descubre si la energía alcanza para completar la misión.'
                : 'Los ajustes del módulo actualizan el resultado. Si cambias la fecha, pulsa «Volver a simular».'}
            </p>
          </div>
        </div>
      </details>
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
