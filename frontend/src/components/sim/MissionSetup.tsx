import { useEffect, useState, type ReactNode } from 'react'
import { formatDuration, toInputValue } from '../../lib/time'
import {
  PARAMETER_RANGES,
  PRESETS,
  autonomyHours,
  minSunFraction,
  panelPeakW,
  type LanderConfig,
  type PresetId,
} from '../../sim/lander'
import { Button, cx, Disclosure, Select, Slider } from '../ui'

const PRESET_OPTIONS = (Object.keys(PRESETS) as PresetId[]).map((id) => ({ value: id, label: PRESETS[id].label,
  description: PRESETS[id].description,
  meta: `${PRESETS[id].config.batteryKWh} kWh de batería · ${PRESETS[id].config.panelAreaM2} m² de panel`,
}))

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
  siteControl,
  actionLabel,
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
  siteControl?: ReactNode
  actionLabel?: string
}) {
  const set = (key: keyof LanderConfig) => (v: number) => onCfg({ ...cfg, [key]: v })
  const range = (key: keyof LanderConfig) => PARAMETER_RANGES[key]
  const peak = panelPeakW(cfg)
  const minSun = minSunFraction(cfg)
  const [daysInput, setDaysInput] = useState(String(missionDays))
  useEffect(() => setDaysInput(String(missionDays)), [missionDays])

  return (
    <section aria-label="Configurar misión">
      <div className="grid items-start gap-6 sm:grid-cols-2">
          {siteControl}

            <div>
              <label htmlFor="mission-date" className="mb-2 block text-sm text-ink-muted">Fecha de alunizaje · UTC</label>
              <input id="mission-date" type="datetime-local" value={toInputValue(timelineDate)}
                min={toInputValue(minDate)} max={toInputValue(maxDate)} step={3600}
                onChange={(e) => { if (e.target.validity.valid && e.target.value) onDate(e.target.value) }}
                className="min-h-14 w-full min-w-0 border border-seam-strong bg-hull px-4 text-base text-ink" />
            </div>
            <div>
              <label htmlFor="mission-days" className="mb-2 block text-sm text-ink-muted">Tiempo en la superficie</label>
              <div className="flight-field flex min-h-14 items-center gap-2 border border-seam-strong bg-hull px-4">
                <input id="mission-days" aria-label="Duración de la misión en días" type="number" min={1} max={maxDays} value={daysInput}
                  onChange={(e) => {
                    setDaysInput(e.target.value)
                    const value = e.target.valueAsNumber
                    if (Number.isInteger(value) && value >= 1 && value <= maxDays) onMissionDays(value)
                  }}
                  onBlur={() => setDaysInput(String(missionDays))}
                  className="min-h-11 min-w-0 w-full bg-transparent text-base text-ink" />
                <span className="text-xs text-ink-muted">días</span>
              </div>
            </div>
            <Select id="mission-module" label="Módulo de la misión" value={preset ?? 'custom'} onChange={v => onPreset(v as PresetId)}
              options={preset ? PRESET_OPTIONS : [{ value: 'custom', label: 'Personalizado', disabled: true, description: 'Con los parámetros que ajustaste.' }, ...PRESET_OPTIONS]}
              hint={preset ? `${PRESETS[preset].description} Configuración de referencia.` : 'Estás usando tus propios ajustes.'} />
            <dl aria-label="Capacidad del módulo elegido" className="grid grid-cols-3 gap-4 border-y border-seam py-4 sm:col-span-2">
              <Derived label="Panel solar" value={`${Math.round(peak)} W pico`} tone="text-sun" />
              <Derived label="Batería" value={`${cfg.batteryKWh.toLocaleString('es')} kWh`} />
              <Derived label="Sin Sol" value={formatDuration(autonomyHours(cfg))} />
            </dl>
            <Button variant="primary" size="lg" className="min-h-12 w-full sm:col-span-2" onClick={onSimulate}>
              {actionLabel ?? (landingDate === null ? 'Simular misión' : 'Volver a simular')}
            </Button>
      </div>

      {landingDate && landingDate.getTime() !== timelineDate.getTime() && <p role="status" className="mt-3 text-sm text-ink-muted">Cambiaste la fecha. Evalúa de nuevo el alunizaje para actualizar el resultado.</p>}

          <Disclosure className="mt-6" title="Ajustes avanzados del módulo" description="Batería, paneles solares, instrumentos y envío de datos.">
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Puedes empezar con el módulo elegido. Abre estos ajustes si quieres cambiar la batería, los paneles o los instrumentos. Los módulos son configuraciones de referencia.</p>
            <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <p className="col-span-full text-sm font-bold text-sun">Energía y autonomía</p>
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

              <dl className="col-span-full grid gap-4 py-2 sm:grid-cols-3">
                <Derived label="Potencia pico" value={`${Math.round(peak)} W`} tone="text-sun" />
                <Derived label="Autonomía sin Sol" value={formatDuration(autonomyHours(cfg))} />
                <Derived label="Sol necesario" value={Number.isFinite(minSun) ? `${Math.round(minSun * 100)} %` : 'No alcanza'}
                  tone={Number.isFinite(minSun) ? undefined : 'text-critical'} />
              </dl>

              <p className="col-span-full mt-2 border-t border-seam pt-5 text-sm font-bold text-earth">Comunicación con la Tierra</p>
              <Slider label="Datos generados" unit="Mb/día" tone="earth" {...range('dataPerDayMb')} value={cfg.dataPerDayMb}
                onChange={set('dataPerDayMb')} format={(v) => v.toLocaleString('es')} hint="Cuántos datos producen los instrumentos por día." />
              <Slider label="Velocidad de envío" unit="Mb/h" tone="earth" {...range('downlinkMbPerHour')} value={cfg.downlinkMbPerHour}
                onChange={set('downlinkMbPerHour')} format={(v) => v.toLocaleString('es')} hint="Datos que se envían por hora mientras se ve la Tierra." />

            </div>
          </Disclosure>

    </section>
  )
}

function Derived({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cx('mt-2 text-base font-bold tabular-nums text-ink', tone)}>{value}</dd>
    </div>
  )
}
