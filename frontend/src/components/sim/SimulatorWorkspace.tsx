// Un espacio de trabajo lunar: el plan arriba, el terreno en el centro y la evidencia debajo.
// Conserva la tipografía y los colores de vuelo; evita marcos repetidos y columnas con scroll independiente.
import type { ComponentProps, CSSProperties } from 'react'
import { formatDateTime, formatMissionClock, sampleTime } from '../../lib/time'
import { useAppState, type Speed } from '../../state'
import type { SiteData } from '../../types'
import { Button } from '../ui'
import { ViewerPanel } from '../ViewerPanel'
import { MissionSetup } from './MissionSetup'
import { MissionOptions, MissionResult, type MissionResultProps } from './MissionResult'
import { MissionTrace } from './MissionTrace'

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
  const result = report?.result
  const sample = result && state.index >= result.from && state.index < result.from + result.series.soc.length ? state.index - result.from : null
  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 pb-8 pt-5 sm:px-7 lg:px-9">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Simulador de misión</h1>
        <p className="text-xs text-ink-muted">Polo sur lunar · Luz, comunicación y terreno</p>
      </div>
      <MissionSetup {...setup} siteControl={
        <div>
          <label htmlFor="mission-site" className="mb-2 block text-sm text-ink-muted">Sitio de alunizaje</label>
          <select id="mission-site" value={data.site.id} onChange={(e) => actions.select(e.target.value)}
            className="min-h-11 w-full min-w-0 rounded-hw border border-seam-strong bg-hull px-3 text-sm text-ink">
            {state.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      } />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="h-[25rem] min-w-0 sm:h-[28rem] lg:h-[26rem] xl:h-[28rem]">
          <ViewerPanel data={data} index={state.index} contact={contact[state.index]} immersive
            missionState={result && sample !== null ? result.series.mode[sample] : undefined} />
        </div>
        {report ? <MissionResult {...report} /> : (
          <section aria-label="Preparar simulación" className="flex flex-col justify-center px-1 py-4 lg:px-6">
            <h2 className="text-2xl font-bold leading-tight text-ink">¿Dónde y cuándo<br />conviene aterrizar?</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">Compara la luz solar, el contacto con la Tierra y la pendiente del terreno. Después comprueba si el módulo tiene energía para completar la misión.</p>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">Elige el plan arriba y pulsa <span className="font-bold text-ink">Simular misión</span> para ver la viabilidad y las alternativas.</p>
          </section>
        )}
      </div>

      {report && <>
        <MissionTransport data={data} report={report} onSeek={onSeek} />
        <MissionTrace data={data} result={report.result} lit={lit} contact={contact} survivalThreshold={survivalThreshold} index={state.index} onSeek={onSeek} />
        <MissionOptions {...report} />
      </>}

      <p className="mt-6 max-w-4xl text-xs leading-relaxed text-ink-faint">Los módulos son ilustrativos. El panel sigue al Sol; se supone una estación DSN disponible cuando la Tierra es visible. La batería falla al llegar al 20 %. Luz y contacto se calculan con JPL Horizons y el horizonte del sitio.</p>
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
    <section aria-label="Reproducir misión" className="my-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-hw bg-hull px-4 py-3">
      <Button size="sm" onClick={actions.togglePlay} aria-label={state.playing ? 'Pausar' : 'Reproducir'}>{state.playing ? 'Pausar' : 'Reproducir'}</Button>
      <p className="min-w-0 text-sm tabular-nums text-ink">{formatMissionClock(data, state.index, from)}</p>
      <input type="range" className="range min-w-28 flex-1" aria-label="Fecha y hora" aria-valuetext={formatDateTime(date)}
        min={from} max={end} value={state.index} onChange={(e) => onSeek(Number(e.target.value))} style={{ '--fill': `${fill}%` } as CSSProperties} />
      <label className="flex items-center gap-2 text-xs text-ink-muted">Velocidad
        <select value={state.speed} onChange={(e) => actions.setSpeed(Number(e.target.value) as Speed)} className="min-h-9 rounded-hw bg-hull-raised px-2 text-sm text-ink">
          <option value={1}>1 h/s</option><option value={6}>6 h/s</option><option value={24}>1 d/s</option>
        </select>
      </label>
    </section>
  )
}
